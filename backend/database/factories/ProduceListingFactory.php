<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ProduceListing>
 */
class ProduceListingFactory extends Factory
{
    public function definition(): array
    {
        $harvest = fake()->dateTimeBetween('-10 days', '+10 days');

        return [
            'user_id' => User::factory(),
            'commodity_name' => fake()->randomElement(['Tomatoes', 'Maize', 'Yam', 'Beans', 'Pepper']),
            'category' => fake()->randomElement(['vegetables', 'grains', 'tubers', 'legumes', 'spices']),
            'quantity' => fake()->randomFloat(2, 10, 500),
            'unit' => fake()->randomElement(['kg', 'bag', 'basket', 'bucket']),
            'price' => fake()->randomFloat(2, 500, 20000),
            'location' => fake()->city() . ', ' . fake()->state(),
            'harvest_date' => $harvest,
            'expiry_date' => (clone $harvest)->modify('+60 days'),
            'description' => fake()->sentence(12),
            'images' => [],
            'availability_status' => 'available',
        ];
    }

    public function outOfStock(): static
    {
        return $this->state(fn () => [
            'quantity' => 0,
            'availability_status' => 'out_of_stock',
        ]);
    }
}
