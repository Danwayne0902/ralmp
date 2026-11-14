<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\ProduceListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'farmer', 'buyer', 'logistics_provider'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
    }

    private function buyer(): User
    {
        $buyer = User::factory()->create();
        $buyer->assignRole('buyer');

        return $buyer;
    }

    private function farmer(): User
    {
        $farmer = User::factory()->create();
        $farmer->assignRole('farmer');

        return $farmer;
    }

    public function test_checkout_uses_server_prices_and_reserves_stock(): void
    {
        $buyer = $this->buyer();
        $farmer = $this->farmer();
        $listing = ProduceListing::factory()->create([
            'user_id' => $farmer->id,
            'price' => 1000,
            'quantity' => 10,
        ]);

        Sanctum::actingAs($buyer);

        $response = $this->postJson('/api/v1/orders', [
            'items' => [
                // Client-supplied price/farmer are deliberately wrong.
                ['produce_id' => $listing->id, 'quantity' => 2, 'unit_price' => 1, 'farmer_id' => $buyer->id],
            ],
            'delivery_date' => now()->addDays(2)->toDateString(),
        ])->assertCreated();

        $order = Order::with('items')->firstOrFail();

        $this->assertEquals(2000, $order->subtotal);
        $this->assertEquals(2500, $order->delivery_fee);
        $this->assertEquals(4500, $order->total_price);
        $this->assertEquals(1000, $order->items->first()->unit_price);
        $this->assertEquals(2, $order->items->first()->quantity);
        $this->assertEquals($farmer->id, $order->farmer_id);

        $this->assertEquals(8, $listing->fresh()->quantity);

        $response->assertJsonPath('order.id', $order->id);
    }

    public function test_checkout_rejects_insufficient_stock(): void
    {
        $buyer = $this->buyer();
        $farmer = $this->farmer();
        $listing = ProduceListing::factory()->create([
            'user_id' => $farmer->id,
            'price' => 1000,
            'quantity' => 1,
        ]);

        Sanctum::actingAs($buyer);

        $this->postJson('/api/v1/orders', [
            'items' => [['produce_id' => $listing->id, 'quantity' => 5]],
            'delivery_date' => now()->addDays(2)->toDateString(),
        ])->assertStatus(422);

        $this->assertSame(0, Order::count());
        $this->assertEquals(1, $listing->fresh()->quantity);
    }

    public function test_multi_farmer_cart_creates_one_order_per_farmer(): void
    {
        $buyer = $this->buyer();
        $farmerA = $this->farmer();
        $farmerB = $this->farmer();

        $listingA = ProduceListing::factory()->create(['user_id' => $farmerA->id, 'price' => 1000, 'quantity' => 10]);
        $listingB = ProduceListing::factory()->create(['user_id' => $farmerB->id, 'price' => 500, 'quantity' => 10]);

        Sanctum::actingAs($buyer);

        $this->postJson('/api/v1/orders', [
            'items' => [
                ['produce_id' => $listingA->id, 'quantity' => 1],
                ['produce_id' => $listingB->id, 'quantity' => 2],
            ],
            'delivery_date' => now()->addDays(2)->toDateString(),
        ])->assertCreated()->assertJsonCount(2, 'orders');

        $this->assertSame(2, Order::count());
        $this->assertDatabaseHas('orders', ['farmer_id' => $farmerA->id, 'subtotal' => 1000]);
        $this->assertDatabaseHas('orders', ['farmer_id' => $farmerB->id, 'subtotal' => 1000]);
    }

    public function test_cancelling_an_order_restores_stock(): void
    {
        $buyer = $this->buyer();
        $farmer = $this->farmer();
        $listing = ProduceListing::factory()->create([
            'user_id' => $farmer->id,
            'price' => 1000,
            'quantity' => 10,
        ]);

        Sanctum::actingAs($buyer);

        $this->postJson('/api/v1/orders', [
            'items' => [['produce_id' => $listing->id, 'quantity' => 3]],
            'delivery_date' => now()->addDays(2)->toDateString(),
        ])->assertCreated();

        $order = Order::firstOrFail();
        $this->assertEquals(7, $listing->fresh()->quantity);

        $this->postJson("/api/v1/orders/{$order->id}/cancel")->assertOk();

        $this->assertSame('cancelled', $order->fresh()->status);
        $this->assertEquals(10, $listing->fresh()->quantity);
        $this->assertSame('available', $listing->fresh()->availability_status);
    }

    public function test_farmers_cannot_create_orders(): void
    {
        $farmer = $this->farmer();
        $listing = ProduceListing::factory()->create(['user_id' => $farmer->id]);

        Sanctum::actingAs($farmer);

        $this->postJson('/api/v1/orders', [
            'items' => [['produce_id' => $listing->id, 'quantity' => 1]],
        ])->assertStatus(403);
    }
}
