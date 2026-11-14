<?php

namespace Tests\Feature;

use App\Models\Delivery;
use App\Models\Order;
use App\Models\ProduceListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'farmer', 'buyer', 'logistics_provider'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
    }

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_order_stats_route_is_not_shadowed_by_order_show(): void
    {
        $buyer = $this->userWithRole('buyer');
        Order::factory()->create(['buyer_id' => $buyer->id]);

        Sanctum::actingAs($buyer);

        $this->getJson('/api/v1/orders/stats')
            ->assertOk()
            ->assertJsonPath('total_orders', 1);
    }

    public function test_unread_count_route_is_not_shadowed_by_conversation(): void
    {
        $buyer = $this->userWithRole('buyer');
        Sanctum::actingAs($buyer);

        $this->getJson('/api/v1/messages/unread-count')
            ->assertOk()
            ->assertJsonPath('unread_count', 0);
    }

    public function test_public_listings_do_not_leak_private_farmer_fields(): void
    {
        $farmer = $this->userWithRole('farmer');
        ProduceListing::factory()->create([
            'user_id' => $farmer->id,
            'images' => ['produce/photo.jpg'],
        ]);

        $response = $this->getJson('/api/v1/produce-listings')->assertOk();
        $listing = $response->json('data.0');

        $this->assertIsArray($listing['images']);
        $this->assertSame('produce/photo.jpg', $listing['images'][0]);
        $this->assertArrayNotHasKey('email', $listing['user']);
        $this->assertArrayNotHasKey('phone', $listing['user']);
        $this->assertArrayNotHasKey('address', $listing['user']);
    }

    public function test_delivery_details_are_only_visible_to_the_order_parties(): void
    {
        $buyer = $this->userWithRole('buyer');
        $otherBuyer = $this->userWithRole('buyer');
        $farmer = $this->userWithRole('farmer');
        $provider = $this->userWithRole('logistics_provider');

        $order = Order::factory()->create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $farmer->id,
        ]);

        $delivery = Delivery::create([
            'order_id' => $order->id,
            'logistics_provider_id' => $provider->id,
            'status' => 'assigned',
            'pickup_location' => 'Farm',
            'delivery_location' => 'Home',
        ]);

        Sanctum::actingAs($buyer);
        $this->getJson("/api/v1/logistics/deliveries/{$delivery->id}")->assertOk();

        Sanctum::actingAs($farmer);
        $this->getJson("/api/v1/logistics/deliveries/{$delivery->id}")->assertOk();

        Sanctum::actingAs($provider);
        $this->getJson("/api/v1/logistics/deliveries/{$delivery->id}")->assertOk();

        Sanctum::actingAs($otherBuyer);
        $this->getJson("/api/v1/logistics/deliveries/{$delivery->id}")->assertStatus(403);
        $this->getJson("/api/v1/logistics/track/{$delivery->id}")->assertStatus(403);
    }

    public function test_only_the_assigned_provider_can_add_tracking_updates(): void
    {
        $buyer = $this->userWithRole('buyer');
        $farmer = $this->userWithRole('farmer');
        $provider = $this->userWithRole('logistics_provider');
        $otherProvider = $this->userWithRole('logistics_provider');

        $order = Order::factory()->create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $farmer->id,
        ]);

        $delivery = Delivery::create([
            'order_id' => $order->id,
            'logistics_provider_id' => $provider->id,
            'status' => 'assigned',
            'pickup_location' => 'Farm',
            'delivery_location' => 'Home',
        ]);

        Sanctum::actingAs($buyer);
        $this->postJson("/api/v1/logistics/deliveries/{$delivery->id}/tracking", ['status' => 'in_transit'])
            ->assertStatus(403);

        Sanctum::actingAs($otherProvider);
        $this->postJson("/api/v1/logistics/deliveries/{$delivery->id}/tracking", ['status' => 'in_transit'])
            ->assertStatus(403);

        Sanctum::actingAs($provider);
        $this->postJson("/api/v1/logistics/deliveries/{$delivery->id}/tracking", [
            'status' => 'in_transit',
            'location' => 'Sagamu',
        ])->assertCreated();

        $this->assertDatabaseHas('delivery_tracking', [
            'delivery_id' => $delivery->id,
            'status' => 'in_transit',
        ]);
    }

    public function test_schedule_pickup_creates_a_real_delivery(): void
    {
        $buyer = $this->userWithRole('buyer');
        $otherBuyer = $this->userWithRole('buyer');
        $farmer = $this->userWithRole('farmer');

        $order = Order::factory()->create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $farmer->id,
        ]);

        Sanctum::actingAs($otherBuyer);
        $this->postJson('/api/v1/logistics/schedule-pickup', [
            'order_id' => $order->id,
            'pickup_date' => now()->addDays(2)->toDateString(),
            'pickup_time_slot' => '09:00-12:00',
        ])->assertStatus(403);

        Sanctum::actingAs($buyer);
        $this->postJson('/api/v1/logistics/schedule-pickup', [
            'order_id' => $order->id,
            'pickup_date' => now()->addDays(2)->toDateString(),
            'pickup_time_slot' => '09:00-12:00',
        ])->assertCreated();

        $this->assertDatabaseHas('deliveries', [
            'order_id' => $order->id,
            'status' => 'pending',
            'pickup_time_slot' => '09:00-12:00',
        ]);
    }
}
