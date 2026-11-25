<?php

namespace Tests\Feature;

use App\Mail\ResetPassword;
use App\Mail\VerifyEmail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'farmer', 'buyer', 'logistics_provider'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
    }

    public function test_unverified_users_cannot_log_in_when_verification_is_required(): void
    {
        config(['auth.email_verification' => true]);

        $user = User::factory()->unverified()->create(['password' => Hash::make('password')]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertStatus(403)
            ->assertJsonPath('code', 'email_unverified');
    }

    public function test_verified_users_can_log_in(): void
    {
        $user = User::factory()->create(['password' => Hash::make('password')]);
        $user->assignRole('buyer');

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'email']]);
    }

    public function test_suspended_users_cannot_log_in(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('password'),
            'is_active' => false,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertStatus(403)
            ->assertJsonPath('code', 'account_suspended');
    }

    public function test_registration_signs_the_member_in_when_verification_is_off(): void
    {
        Mail::fake();
        config(['auth.email_verification' => false]);

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'New Farmer',
            'email' => 'new-farmer@example.test',
            'phone' => '+2348000009999',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'farmer',
            'address' => '2 Test Street',
            'state' => 'Oyo',
            'lga' => 'Ibadan North',
        ])->assertCreated()
            ->assertJsonStructure(['token', 'user' => ['id', 'email', 'role']])
            ->assertJsonPath('needs_verification', false);

        $this->assertNotEmpty($response->json('token'));

        $user = User::where('email', 'new-farmer@example.test')->firstOrFail();
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue($user->hasRole('farmer'));
        Mail::assertNothingSent();
    }

    public function test_verification_tokens_are_hashed_and_can_be_used(): void
    {
        Mail::fake();
        config(['auth.email_verification' => true]);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'New Buyer',
            'email' => 'new-buyer@example.test',
            'phone' => '+2348000001234',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'buyer',
            'address' => '1 Test Street',
            'state' => 'Lagos',
            'lga' => 'Ikeja',
        ])->assertCreated();

        $user = User::where('email', 'new-buyer@example.test')->firstOrFail();
        $rawToken = null;

        Mail::assertQueued(VerifyEmail::class, function (VerifyEmail $mail) use ($user, &$rawToken) {
            $rawToken = $mail->token;

            return $mail->hasTo($user->email);
        });

        $this->assertNotNull($rawToken);
        $this->assertSame(hash('sha256', $rawToken), $user->verification_token);

        $this->postJson('/api/v1/auth/verify-email', ['token' => $rawToken])
            ->assertOk();

        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->assertNull($user->fresh()->verification_token);
    }

    public function test_password_reset_tokens_expire(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $rawToken = null;

        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])
            ->assertOk();

        Mail::assertQueued(ResetPassword::class, function (ResetPassword $mail) use (&$rawToken) {
            $rawToken = $mail->token;

            return true;
        });

        $this->assertSame(hash('sha256', $rawToken), $user->fresh()->reset_token);
        $this->assertNotNull($user->fresh()->reset_token_expires_at);

        // Expire the token and try to use it.
        $user->update(['reset_token_expires_at' => now()->subMinute()]);

        $this->postJson('/api/v1/auth/reset-password', [
            'token' => $rawToken,
            'email' => $user->email,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertStatus(400);
    }

    public function test_password_can_be_reset_with_a_valid_token(): void
    {
        $user = User::factory()->create();

        $user->update([
            'reset_token' => hash('sha256', 'valid-token'),
            'reset_token_expires_at' => now()->addMinutes(30),
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'token' => 'valid-token',
            'email' => $user->email,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
        $this->assertNull($user->fresh()->reset_token);
    }
}
