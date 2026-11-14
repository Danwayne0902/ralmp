<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ReviewTest extends TestCase
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

    public function test_reviews_start_unapproved(): void
    {
        $buyer = $this->userWithRole('buyer');
        $farmer = $this->userWithRole('farmer');
        $order = Order::factory()->create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $farmer->id,
        ]);

        Sanctum::actingAs($buyer);

        $this->postJson('/api/v1/reviews', [
            'order_id' => $order->id,
            'farmer_id' => $farmer->id,
            'rating' => 5,
            'comment' => 'Great produce',
        ])->assertCreated();

        $review = Review::firstOrFail();

        $this->assertFalse($review->is_approved);
        $this->assertSame($farmer->id, $review->farmer_id);
    }

    public function test_a_buyer_cannot_review_someone_elses_order(): void
    {
        $buyer = $this->userWithRole('buyer');
        $otherBuyer = $this->userWithRole('buyer');
        $farmer = $this->userWithRole('farmer');

        $order = Order::factory()->create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $farmer->id,
        ]);

        Sanctum::actingAs($otherBuyer);

        $this->postJson('/api/v1/reviews', [
            'order_id' => $order->id,
            'farmer_id' => $farmer->id,
            'rating' => 1,
        ])->assertStatus(403);

        $this->assertSame(0, Review::count());
    }

    public function test_a_review_cannot_be_attached_to_an_unrelated_farmer(): void
    {
        $buyer = $this->userWithRole('buyer');
        $farmer = $this->userWithRole('farmer');
        $otherFarmer = $this->userWithRole('farmer');

        $order = Order::factory()->create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $farmer->id,
        ]);

        Sanctum::actingAs($buyer);

        $this->postJson('/api/v1/reviews', [
            'order_id' => $order->id,
            'farmer_id' => $otherFarmer->id,
            'rating' => 5,
        ])->assertStatus(422);

        $this->assertSame(0, Review::count());
    }

    public function test_editing_an_approved_review_returns_it_to_moderation(): void
    {
        $buyer = $this->userWithRole('buyer');
        $farmer = $this->userWithRole('farmer');
        $order = Order::factory()->create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $farmer->id,
        ]);

        $review = Review::create([
            'user_id' => $buyer->id,
            'farmer_id' => $farmer->id,
            'order_id' => $order->id,
            'rating' => 4,
            'comment' => 'Good',
            'is_approved' => true,
        ]);

        Sanctum::actingAs($buyer);

        $this->putJson("/api/v1/reviews/{$review->id}", ['rating' => 3])
            ->assertOk();

        $this->assertFalse($review->fresh()->is_approved);
        $this->assertSame(3, $review->fresh()->rating);
    }

    public function test_public_farmer_reviews_do_not_leak_reviewer_contact_details(): void
    {
        $buyer = $this->userWithRole('buyer');
        $farmer = $this->userWithRole('farmer');
        $order = Order::factory()->create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $farmer->id,
        ]);

        Review::create([
            'user_id' => $buyer->id,
            'farmer_id' => $farmer->id,
            'order_id' => $order->id,
            'rating' => 5,
            'comment' => 'Excellent',
            'is_approved' => true,
        ]);

        Sanctum::actingAs($buyer);

        $review = $this->getJson("/api/v1/reviews/farmer/{$farmer->id}")
            ->assertOk()
            ->json('reviews.0');

        $this->assertArrayNotHasKey('email', $review['user']);
        $this->assertArrayNotHasKey('phone', $review['user']);
    }
}
