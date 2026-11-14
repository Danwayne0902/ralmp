<?php

namespace Database\Factories;

use App\Models\ProduceListing;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Order>
 */
class OrderFactory extends Factory
{
    public function definition(): array
    {
        $listing = ProduceListing::factory();

        return [
            'buyer_id' => User::factory(),
            'farmer_id' => User::factory(),
            'produce_id' => $listing,
            'quantity' => 2,
            'unit_price' => 1000,
            'subtotal' => 2000,
            'delivery_fee' => 2500,
            'total_price' => 4500,
            'status' => 'pending',
            'payment_status' => 'pending',
            'order_date' => now(),
            'delivery_date' => now()->addDays(3),
        ];
    }
}
