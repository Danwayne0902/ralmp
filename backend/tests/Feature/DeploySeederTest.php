<?php

namespace Tests\Feature;

use Database\Seeders\PermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * A fresh deployment runs migrations, not the demo DatabaseSeeder. The
 * container then runs PermissionsSeeder so registration can assign a role.
 */
class DeploySeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_deploy_seeder_makes_a_fresh_database_usable(): void
    {
        // Migrations create the tables but no role rows.
        $this->assertDatabaseCount('roles', 0);

        $this->seed(PermissionsSeeder::class);

        foreach (['farmer', 'buyer', 'logistics_provider', 'admin'] as $role) {
            $this->assertDatabaseHas('roles', ['name' => $role, 'guard_name' => 'web']);
        }

        $this->assertDatabaseHas('permissions', ['name' => 'view-analytics']);

        Mail::fake();

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Fresh Deploy',
            'email' => 'fresh-deploy@example.test',
            'phone' => '+2348000007777',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'buyer',
            'address' => '1 Deploy Street',
            'state' => 'Lagos',
            'lga' => 'Ikeja',
        ])->assertCreated();

        $this->assertDatabaseHas('users', ['email' => 'fresh-deploy@example.test']);
    }
}
