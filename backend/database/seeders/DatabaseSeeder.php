<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(PermissionsSeeder::class);

        // Create roles
        Role::firstOrCreate(['name' => 'farmer']);
        Role::firstOrCreate(['name' => 'buyer']);
        Role::firstOrCreate(['name' => 'logistics_provider']);
        Role::firstOrCreate(['name' => 'admin']);

        // Create admin user
        $admin = User::firstOrCreate(
            ['email' => 'admin@ramlp.com'],
            [
                'name' => 'Admin User',
                'phone' => '+2348000000000',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'email_verified_at' => now(),
                'state' => 'Lagos',
                'lga' => 'Ikeja',
                'address' => '123 Admin Street',
            ]
        );
        $admin->assignRole('admin');

        // Create test farmer
        $farmer = User::firstOrCreate(
            ['email' => 'farmer@ramlp.com'],
            [
                'name' => 'Test Farmer',
                'phone' => '+2348000000001',
                'password' => Hash::make('password'),
                'role' => 'farmer',
                'email_verified_at' => now(),
                'state' => 'Lagos',
                'lga' => 'Ikorodu',
                'address' => '456 Farm Road',
            ]
        );
        $farmer->assignRole('farmer');

        // Create test buyer
        $buyer = User::firstOrCreate(
            ['email' => 'buyer@ramlp.com'],
            [
                'name' => 'Test Buyer',
                'phone' => '+2348000000002',
                'password' => Hash::make('password'),
                'role' => 'buyer',
                'email_verified_at' => now(),
                'state' => 'Lagos',
                'lga' => 'Victoria Island',
                'address' => '789 Buyer Avenue',
            ]
        );
        $buyer->assignRole('buyer');

        // Create test logistics provider
        $logistics = User::firstOrCreate(
            ['email' => 'logistics@ramlp.com'],
            [
                'name' => 'Test Logistics',
                'phone' => '+2348000000003',
                'password' => Hash::make('password'),
                'role' => 'logistics_provider',
                'email_verified_at' => now(),
                'state' => 'Lagos',
                'lga' => 'Apapa',
                'address' => '321 Haulage Way',
            ]
        );
        $logistics->assignRole('logistics_provider');
    }
}
