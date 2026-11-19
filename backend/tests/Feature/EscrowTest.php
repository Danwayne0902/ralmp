<?php

namespace Tests\Feature;

use App\Models\Delivery;
use App\Models\EscrowRelease;
use App\Models\Order;
use App\Models\Payout;
use App\Models\ProduceListing;
use App\Models\User;
use App\Services\EscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EscrowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'farmer', 'buyer', 'logistics_provider'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
    }

    private function user(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        $user->assignRole($role);

        return $user;
    }

    private function paidOrder(?User $farmer = null, ?User $buyer = null, array $overrides = []): Order
    {
        $farmer ??= $this->user('farmer');
        $buyer ??= $this->user('buyer');

        $listing = ProduceListing::factory()->create(['user_id' => $farmer->id]);

        return Order::factory()->create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $farmer->id,
            'produce_id' => $listing->id,
            'subtotal' => 20000,
            // Checkout charges goods only; delivery is negotiated later.
            'delivery_fee' => 0,
            'total_price' => 20000,
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'paid_at' => now(),
            ...$overrides,
        ]);
    }

    private function deliveryFor(Order $order, User $logistics, array $overrides = []): Delivery
    {
        return Delivery::create([
            'order_id' => $order->id,
            'logistics_provider_id' => $logistics->id,
            'status' => 'assigned',
            'pickup_location' => 'Farm gate',
            'delivery_location' => 'Buyer store',
            'delivery_cost' => 2500,
            'agreed_amount' => 2500,
            ...$overrides,
        ]);
    }

    public function test_funding_splits_the_goods_payment_into_farmer_parts(): void
    {
        $farmer = $this->user('farmer');
        $logistics = $this->user('logistics_provider');
        $order = $this->paidOrder($farmer);
        $this->deliveryFor($order, $logistics);

        $service = app(EscrowService::class);
        $account = $service->fund($order->fresh('delivery'));

        $this->assertSame('funded', $account->status);
        $this->assertEquals(20000, (float) $account->amount);
        $this->assertEquals(20000, (float) $account->farmer_amount);
        $this->assertEquals(0, (float) $account->delivery_amount);
        $this->assertCount(3, $account->releases);

        $parts = $account->releases->keyBy('milestone');
        $this->assertEquals(2000, (float) $parts['pickup']->amount);
        $this->assertEquals(12000, (float) $parts['quality']->amount);
        $this->assertEquals(6000, (float) $parts['final']->amount);
        $this->assertNull($parts->get('delivery'));

        // Funding twice must not duplicate the schedule.
        $service->fund($order->fresh('delivery'));
        $this->assertSame(3, EscrowRelease::where('order_id', $order->id)->count());
    }

    public function test_a_paid_delivery_price_is_added_to_the_escrow(): void
    {
        $farmer = $this->user('farmer');
        $logistics = $this->user('logistics_provider');
        $order = $this->paidOrder($farmer);
        $delivery = $this->deliveryFor($order, $logistics, ['payment_status' => 'paid']);

        $service = app(EscrowService::class);
        $service->fund($order->fresh('delivery'));
        $release = $service->fundDelivery($delivery->fresh());

        $this->assertSame('delivery', $release->milestone);
        $this->assertEquals(2500, (float) $release->amount);
        $this->assertSame($logistics->id, $release->payee_id);

        $account = $order->fresh()->escrow;
        $this->assertEquals(22500, (float) $account->amount);
        $this->assertEquals(2500, (float) $account->delivery_amount);
    }

    public function test_transporter_pickup_releases_the_first_payment(): void
    {
        $order = $this->paidOrder();
        $logistics = $this->user('logistics_provider');
        $delivery = $this->deliveryFor($order, $logistics);
        app(EscrowService::class)->fund($order->fresh('delivery'));

        Sanctum::actingAs($logistics);

        $this->putJson("/api/v1/logistics/deliveries/{$delivery->id}/status", ['status' => 'picked_up'])
            ->assertOk();

        $release = EscrowRelease::where('order_id', $order->id)->where('milestone', 'pickup')->firstOrFail();
        $this->assertSame('released', $release->status);
        $this->assertNotNull($release->payout);
        // 5% platform fee is taken before the bank payout.
        $this->assertEquals(1900, (float) $release->payout->amount);
        $this->assertSame('pending', $release->payout->status);
        $this->assertSame($logistics->id, $release->released_by);
        $this->assertDatabaseHas('platform_fees', [
            'order_id' => $order->id,
            'escrow_release_id' => $release->id,
            'kind' => 'goods',
            'amount' => 100,
        ]);

        $account = $order->fresh()->escrow;
        $this->assertEquals(2000, (float) $account->released_amount);
        $this->assertSame('partly_released', $account->status);
    }

    public function test_only_an_admin_can_release_the_weight_and_quality_part(): void
    {
        $farmer = $this->user('farmer');
        $order = $this->paidOrder($farmer);
        $account = app(EscrowService::class)->fund($order->fresh('delivery'));
        $release = $account->releases->firstWhere('milestone', 'quality');

        Sanctum::actingAs($farmer);
        $this->postJson("/api/v1/admin/escrow/releases/{$release->id}/release")
            ->assertStatus(403);

        $admin = $this->user('admin');
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/admin/escrow/releases/{$release->id}/release", [
            'note' => 'Weight and moisture checked.',
        ])->assertOk()
            ->assertJsonPath('release.status', 'released');

        $this->assertSame('released', $release->fresh()->status);
        $this->assertDatabaseHas('payouts', [
            'order_id' => $order->id,
            'user_id' => $farmer->id,
            'status' => 'pending',
        ]);

        // A second release is a safe no-op.
        $this->postJson("/api/v1/admin/escrow/releases/{$release->id}/release")->assertOk();
        $this->assertSame(1, Payout::where('escrow_release_id', $release->id)->count());
    }

    public function test_driver_payment_waits_for_both_the_buyer_and_the_farmer(): void
    {
        $farmer = $this->user('farmer');
        $buyer = $this->user('buyer');
        $logistics = $this->user('logistics_provider');
        $order = $this->paidOrder($farmer, $buyer, ['status' => 'delivered']);
        $delivery = $this->deliveryFor($order, $logistics, ['payment_status' => 'paid']);

        $service = app(EscrowService::class);
        $service->fund($order->fresh('delivery'));
        $service->fundDelivery($delivery->fresh());

        $other = $this->user('buyer');
        Sanctum::actingAs($other);
        $this->postJson("/api/v1/orders/{$order->id}/confirm-delivery")->assertStatus(403);

        Sanctum::actingAs($buyer);
        $this->postJson("/api/v1/orders/{$order->id}/confirm-delivery")
            ->assertOk()
            ->assertJsonPath('order.status', 'completed');

        // The farmer has not confirmed yet, so the driver is not paid.
        $this->assertSame('released', EscrowRelease::where('order_id', $order->id)->where('milestone', 'final')->value('status'));
        $this->assertSame('pending', EscrowRelease::where('order_id', $order->id)->where('milestone', 'delivery')->value('status'));
        $this->assertDatabaseMissing('payouts', ['order_id' => $order->id, 'user_id' => $logistics->id]);

        $this->assertDatabaseHas('payouts', ['order_id' => $order->id, 'user_id' => $farmer->id]);

        // The farmer's handover confirmation completes the pair.
        Sanctum::actingAs($farmer);
        $this->postJson("/api/v1/orders/{$order->id}/handover-confirm")->assertOk();

        $this->assertSame('released', EscrowRelease::where('order_id', $order->id)->where('milestone', 'delivery')->value('status'));
        $this->assertDatabaseHas('payouts', ['order_id' => $order->id, 'user_id' => $logistics->id]);
        $this->assertDatabaseHas('platform_fees', [
            'order_id' => $order->id,
            'kind' => 'delivery',
            'amount' => 125,
        ]);
    }

    public function test_cancelling_an_order_puts_the_remaining_money_on_hold(): void
    {
        $buyer = $this->user('buyer');
        $order = $this->paidOrder(null, $buyer);
        app(EscrowService::class)->fund($order->fresh('delivery'));

        Sanctum::actingAs($buyer);
        $this->postJson("/api/v1/orders/{$order->id}/cancel")->assertOk();

        $this->assertSame(
            0,
            EscrowRelease::where('order_id', $order->id)->where('status', 'pending')->count()
        );
        $this->assertSame(
            3,
            EscrowRelease::where('order_id', $order->id)->where('status', 'held')->count()
        );
    }

    public function test_payouts_are_scoped_to_the_owner(): void
    {
        $farmer = $this->user('farmer');
        $order = $this->paidOrder($farmer);
        $account = app(EscrowService::class)->fund($order->fresh('delivery'));

        $admin = $this->user('admin');
        app(EscrowService::class)->release($account->releases->firstWhere('milestone', 'pickup'), $admin);

        $otherFarmer = $this->user('farmer');
        $otherOrder = $this->paidOrder($otherFarmer);
        $otherAccount = app(EscrowService::class)->fund($otherOrder->fresh('delivery'));
        app(EscrowService::class)->release($otherAccount->releases->firstWhere('milestone', 'pickup'), $admin);

        Sanctum::actingAs($farmer);
        $this->getJson('/api/v1/payouts')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.user_id', $farmer->id);

        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/payouts')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_money_payloads_carry_the_platform_fee_and_net_amount(): void
    {
        $farmer = $this->user('farmer');
        $order = $this->paidOrder($farmer);
        $account = app(EscrowService::class)->fund($order->fresh('delivery'));
        $admin = $this->user('admin');

        app(EscrowService::class)->release($account->releases->firstWhere('milestone', 'pickup'), $admin);

        // The payee sees what was taken, not only what arrives.
        Sanctum::actingAs($farmer);
        $payouts = $this->getJson('/api/v1/payouts')->assertOk()->json('data');
        $this->assertCount(1, $payouts);
        $this->assertEquals(2000, $payouts[0]['base_amount']);
        $this->assertEquals(100, $payouts[0]['platform_fee']);
        $this->assertEquals(5, $payouts[0]['fee_percent']);
        $this->assertEquals(1900, $payouts[0]['amount']);
        // The raw relation must not leak in and shadow the flat figures above.
        $this->assertArrayNotHasKey('platformFee', $payouts[0]);

        // Escrow rows expose the same gross -> fee -> net split.
        $releases = $this->getJson("/api/v1/escrow/orders/{$order->id}")
            ->assertOk()
            ->json('escrow.releases');

        $byMilestone = collect($releases)->keyBy('milestone');
        $this->assertEquals(5, $byMilestone['pickup']['fee_percent']);
        // Pickup has a payout, so its net is the money the farmer receives.
        $this->assertEquals(1900, $byMilestone['pickup']['net_amount']);
        // A part still in escrow is net of the fee too.
        $this->assertEquals(11400, $byMilestone['quality']['net_amount']);
    }

    public function test_farmer_earnings_report_held_money_net_of_the_fee(): void
    {
        $farmer = $this->user('farmer');
        $buyer = $this->user('buyer');
        $order = $this->paidOrder($farmer, $buyer);
        app(EscrowService::class)->fund($order->fresh('delivery'));

        Sanctum::actingAs($buyer);
        $this->postJson("/api/v1/orders/{$order->id}/cancel")->assertOk();

        // 20000 held, less the 5% platform fee.
        Sanctum::actingAs($farmer);
        $earnings = $this->getJson('/api/v1/farmer/earnings')->assertOk()->json();
        $this->assertEquals(19000, $earnings['held_earnings']);
    }

    public function test_admin_can_mark_a_payout_as_paid(): void
    {
        $farmer = $this->user('farmer');
        $order = $this->paidOrder($farmer);
        $account = app(EscrowService::class)->fund($order->fresh('delivery'));
        $admin = $this->user('admin');
        $release = app(EscrowService::class)->release($account->releases->firstWhere('milestone', 'pickup'), $admin);
        $payout = $release->payout;

        Sanctum::actingAs($farmer);
        $this->postJson("/api/v1/admin/payouts/{$payout->id}/paid")->assertStatus(403);

        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/admin/payouts/{$payout->id}/paid")
            ->assertOk()
            ->assertJsonPath('payout.status', 'paid');

        $this->assertNotNull($payout->fresh()->paid_at);
    }

    public function test_escrow_summary_is_only_visible_to_the_people_on_the_order(): void
    {
        $buyer = $this->user('buyer');
        $order = $this->paidOrder(null, $buyer);
        app(EscrowService::class)->fund($order->fresh('delivery'));

        Sanctum::actingAs($buyer);
        $this->getJson("/api/v1/escrow/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('escrow.order_id', $order->id)
            ->assertJsonCount(3, 'escrow.releases');

        Sanctum::actingAs($this->user('buyer'));
        $this->getJson("/api/v1/escrow/orders/{$order->id}")->assertStatus(403);
    }
}
