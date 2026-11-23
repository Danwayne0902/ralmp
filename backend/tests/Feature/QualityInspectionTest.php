<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\ProduceListing;
use App\Models\QualityInspection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class QualityInspectionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'farmer', 'buyer'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
    }

    private function user(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        $user->assignRole($role);

        return $user;
    }

    private function order(): Order
    {
        $farmer = $this->user('farmer');
        $buyer = $this->user('buyer');
        $listing = ProduceListing::factory()->create(['user_id' => $farmer->id]);

        return Order::factory()->create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $farmer->id,
            'produce_id' => $listing->id,
            'subtotal' => 20000,
            'delivery_fee' => 0,
            'total_price' => 20000,
            'status' => 'shipped',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);
    }

    public function test_an_admin_can_sign_off_and_the_result_stays_on_the_order(): void
    {
        $admin = $this->user('admin');
        $order = $this->order();

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/admin/quality/orders/{$order->id}/inspection", [
            'verdict' => 'release',
            'readings' => [
                'moisture' => 11.8,
                'aflatoxin' => 4,
                'chaff' => 1.1,
                'broken' => 2,
            ],
            'origin_weight' => 1000,
            'destination_weight' => 995,
        ])
            ->assertOk()
            ->assertJsonPath('inspection.order_id', $order->id)
            ->assertJsonPath('inspection.verdict', 'release')
            ->assertJsonPath('inspection.inspector.name', $admin->name);

        $inspection = QualityInspection::where('order_id', $order->id)->firstOrFail();
        $this->assertSame(1, QualityInspection::where('order_id', $order->id)->count());
        $this->assertEquals(-0.5, (float) $inspection->weight_variance);
        $this->assertSame(11.8, (float) $inspection->readings['moisture']);

        // A reload reads the same signed result back.
        $this->getJson('/api/v1/admin/quality/inspections')
            ->assertOk()
            ->assertJsonPath('inspections.0.order_id', $order->id)
            ->assertJsonPath('inspections.0.verdict', 'release');

        $this->getJson("/api/v1/admin/quality/orders/{$order->id}/inspection")
            ->assertOk()
            ->assertJsonPath('inspection.id', $inspection->id);
    }

    public function test_signing_again_replaces_the_previous_result(): void
    {
        $admin = $this->user('admin');
        $order = $this->order();

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/admin/quality/orders/{$order->id}/inspection", [
            'verdict' => 'release',
        ])->assertOk();

        $this->postJson("/api/v1/admin/quality/orders/{$order->id}/inspection", [
            'verdict' => 'freeze',
            'note' => 'Sample was damp.',
        ])
            ->assertOk()
            ->assertJsonPath('inspection.verdict', 'freeze');

        $this->assertSame(1, QualityInspection::where('order_id', $order->id)->count());
        $this->assertSame('freeze', QualityInspection::where('order_id', $order->id)->value('verdict'));
    }

    public function test_only_an_admin_can_read_or_record_a_check(): void
    {
        $order = $this->order();
        Sanctum::actingAs($this->user('farmer'));

        $this->getJson('/api/v1/admin/quality/inspections')->assertStatus(403);
        $this->getJson("/api/v1/admin/quality/orders/{$order->id}/inspection")->assertStatus(403);
        $this->postJson("/api/v1/admin/quality/orders/{$order->id}/inspection", [
            'verdict' => 'release',
        ])->assertStatus(403);

        $this->assertSame(0, QualityInspection::count());
    }

    public function test_a_sign_off_rejects_a_verdict_outside_the_allowed_list(): void
    {
        $order = $this->order();
        Sanctum::actingAs($this->user('admin'));

        $this->postJson("/api/v1/admin/quality/orders/{$order->id}/inspection", [
            'verdict' => 'approved',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('verdict');

        $this->assertSame(0, QualityInspection::count());
    }
}
