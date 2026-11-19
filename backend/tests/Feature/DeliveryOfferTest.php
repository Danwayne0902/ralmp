<?php

namespace Tests\Feature;

use App\Models\Delivery;
use App\Models\DeliveryOffer;
use App\Models\EscrowRelease;
use App\Models\Message;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ProduceListing;
use App\Models\User;
use App\Services\EscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DeliveryOfferTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'farmer', 'buyer', 'logistics_provider'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        config([
            'paystack.secretKey' => 'sk_test_fake',
            'paystack.paymentUrl' => 'https://api.paystack.co',
        ]);
    }

    private function user(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        $user->assignRole($role);

        return $user;
    }

    private function paidOrder(?User $farmer = null, ?User $buyer = null): Order
    {
        $farmer ??= $this->user('farmer');
        $buyer ??= $this->user('buyer');
        $listing = ProduceListing::factory()->create(['user_id' => $farmer->id]);

        return Order::factory()->create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $farmer->id,
            'produce_id' => $listing->id,
            'subtotal' => 20000,
            'delivery_fee' => 0,
            'total_price' => 20000,
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);
    }

    public function test_a_driver_can_see_open_jobs_and_propose_a_price(): void
    {
        $order = $this->paidOrder();
        $driver = $this->user('logistics_provider');

        Sanctum::actingAs($driver);

        $this->getJson('/api/v1/logistics/open-jobs')
            ->assertOk()
            ->assertJsonPath('jobs.0.order_id', $order->id);

        $response = $this->postJson("/api/v1/orders/{$order->id}/delivery-offers", [
            'amount' => 3000,
            'note' => 'I can pick this up tomorrow morning.',
        ])->assertCreated()
            ->assertJsonPath('offer.status', 'proposed');

        $this->assertEquals(3000, $response->json('offer.amount'));

        $this->assertDatabaseHas('delivery_offers', [
            'order_id' => $order->id,
            'driver_id' => $driver->id,
            'status' => 'proposed',
        ]);

        // The offer also appears in the chat.
        $this->assertDatabaseHas('messages', [
            'type' => 'offer',
            'sender_id' => $driver->id,
            'recipient_id' => $order->buyer_id,
        ]);
    }

    public function test_accepting_an_offer_locks_the_price_and_assigns_the_driver(): void
    {
        $farmer = $this->user('farmer');
        $buyer = $this->user('buyer');
        $order = $this->paidOrder($farmer, $buyer);

        $first = $this->user('logistics_provider');
        $second = $this->user('logistics_provider');

        $cheap = DeliveryOffer::create([
            'order_id' => $order->id,
            'buyer_id' => $buyer->id,
            'driver_id' => $first->id,
            'proposed_by' => $first->id,
            'amount' => 2500,
            'status' => 'proposed',
        ]);

        $other = DeliveryOffer::create([
            'order_id' => $order->id,
            'buyer_id' => $buyer->id,
            'driver_id' => $second->id,
            'proposed_by' => $second->id,
            'amount' => 4000,
            'status' => 'proposed',
        ]);

        // The side that named the price cannot be the side that accepts it.
        Sanctum::actingAs($first);
        $this->postJson("/api/v1/delivery-offers/{$cheap->id}/accept")->assertStatus(422);

        Sanctum::actingAs($buyer);
        $accepted = $this->postJson("/api/v1/delivery-offers/{$cheap->id}/accept")
            ->assertOk()
            ->assertJsonPath('offer.status', 'accepted');

        $this->assertEquals(2500, $accepted->json('delivery.agreed_amount'));

        $this->assertSame('accepted', $cheap->fresh()->status);
        $this->assertSame('superseded', $other->fresh()->status);

        $this->assertDatabaseHas('deliveries', [
            'order_id' => $order->id,
            'logistics_provider_id' => $first->id,
            'agreed_amount' => 2500,
            'payment_status' => 'unpaid',
        ]);
    }

    public function test_the_driver_can_accept_the_buyers_counter_offer(): void
    {
        $order = $this->paidOrder();
        $driver = $this->user('logistics_provider');

        $counter = DeliveryOffer::create([
            'order_id' => $order->id,
            'buyer_id' => $order->buyer_id,
            'driver_id' => $driver->id,
            'proposed_by' => $order->buyer_id,
            'amount' => 2800,
            'status' => 'proposed',
        ]);

        Sanctum::actingAs($driver);

        $this->getJson("/api/v1/orders/{$order->id}/delivery-offers")
            ->assertOk()
            ->assertJsonPath('offers.0.can_accept', true);

        $this->postJson("/api/v1/delivery-offers/{$counter->id}/accept")
            ->assertOk()
            ->assertJsonPath('offer.status', 'accepted')
            ->assertJsonPath('delivery.agreed_amount', 2800);

        $this->assertDatabaseHas('deliveries', [
            'order_id' => $order->id,
            'logistics_provider_id' => $driver->id,
            'agreed_amount' => 2800,
        ]);

        // The confirmation must land in the buyer's thread, not the driver's own.
        $this->assertDatabaseHas('messages', [
            'type' => 'offer',
            'offer_id' => $counter->id,
            'sender_id' => $driver->id,
            'recipient_id' => $order->buyer_id,
        ]);
    }

    public function test_the_buyer_cannot_accept_their_own_counter_offer(): void
    {
        $order = $this->paidOrder();
        $driver = $this->user('logistics_provider');

        $counter = DeliveryOffer::create([
            'order_id' => $order->id,
            'buyer_id' => $order->buyer_id,
            'driver_id' => $driver->id,
            'proposed_by' => $order->buyer_id,
            'amount' => 3500,
            'status' => 'proposed',
        ]);

        Sanctum::actingAs(User::find($order->buyer_id));

        $this->getJson("/api/v1/orders/{$order->id}/delivery-offers")
            ->assertOk()
            ->assertJsonPath('offers.0.can_accept', false);

        $this->postJson("/api/v1/delivery-offers/{$counter->id}/accept")->assertStatus(422);

        $this->assertSame('proposed', $counter->fresh()->status);
        $this->assertDatabaseMissing('deliveries', [
            'order_id' => $order->id,
            'agreed_amount' => 3500,
        ]);
    }

    public function test_the_buyer_pays_the_agreed_delivery_price_into_escrow(): void
    {
        $farmer = $this->user('farmer');
        $buyer = $this->user('buyer');
        $driver = $this->user('logistics_provider');
        $order = $this->paidOrder($farmer, $buyer);

        $delivery = Delivery::create([
            'order_id' => $order->id,
            'logistics_provider_id' => $driver->id,
            'status' => 'assigned',
            'pickup_location' => 'Farm gate',
            'delivery_location' => 'Buyer store',
            'agreed_amount' => 3000,
            'payment_status' => 'unpaid',
        ]);

        app(EscrowService::class)->fund($order->fresh('delivery'));

        Http::fake(function ($request) {
            if (str_contains($request->url(), '/transaction/initialize')) {
                $body = json_decode($request->body(), true);

                return Http::response([
                    'status' => true,
                    'data' => [
                        'authorization_url' => 'https://checkout.paystack.test/delivery',
                        'access_code' => 'access-code',
                        'reference' => $body['reference'],
                        'currency' => 'NGN',
                    ],
                ], 200);
            }

            return Http::response([
                'status' => true,
                'data' => [
                    'status' => 'success',
                    'amount' => 300000,
                    'currency' => 'NGN',
                    'reference' => 'RAMLP_DELIVERY_TEST',
                ],
            ], 200);
        });

        Sanctum::actingAs($buyer);

        $this->postJson('/api/v1/payment/initialize', [
            'order_id' => $order->id,
            'delivery_id' => $delivery->id,
            'callback_url' => 'http://localhost/payment/callback',
        ])->assertOk();

        $payment = Payment::where('delivery_id', $delivery->id)->firstOrFail();
        $this->assertSame('delivery', $payment->kind);
        $this->assertSame(300000, (int) $payment->amount);

        // The test helper returns the fixed reference for any verify call.
        $payment->update(['reference' => 'RAMLP_DELIVERY_TEST']);

        $this->postJson('/api/v1/payment/verify', ['reference' => 'RAMLP_DELIVERY_TEST'])
            ->assertOk();

        $this->assertSame('success', $payment->fresh()->status);
        $this->assertSame('paid', $delivery->fresh()->payment_status);

        $this->assertDatabaseHas('escrow_releases', [
            'order_id' => $order->id,
            'milestone' => 'delivery',
            'amount' => 3000,
        ]);

        // The goods order stays paid; the delivery does not change its total.
        $this->assertSame('paid', $order->fresh()->payment_status);
    }

    public function test_admin_can_see_platform_fees(): void
    {
        $farmer = $this->user('farmer');
        $order = $this->paidOrder($farmer);
        $admin = $this->user('admin');

        $account = app(EscrowService::class)->fund($order->fresh('delivery'));
        app(EscrowService::class)->release($account->releases->firstWhere('milestone', 'pickup'), $admin);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/admin/fees')
            ->assertOk()
            ->assertJsonPath('by_kind.0.kind', 'goods');

        $this->assertEquals(100, $response->json('totals.amount'));
        $this->assertEquals(5, $response->json('fee_percent'));
    }

    public function test_the_fee_rate_is_kept_between_four_and_six_percent(): void
    {
        $service = app(EscrowService::class);

        config(['ramlp.platform_fee_percent' => 9]);
        $this->assertSame(6.0, $service->feeRate());

        config(['ramlp.platform_fee_percent' => 1]);
        $this->assertSame(4.0, $service->feeRate());

        config(['ramlp.platform_fee_percent' => 5.5]);
        $this->assertSame(5.5, $service->feeRate());
    }
}
