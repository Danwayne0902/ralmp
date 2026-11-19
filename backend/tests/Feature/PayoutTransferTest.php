<?php

namespace Tests\Feature;

use App\Mail\PayoutReleased;
use App\Mail\PayoutSent;
use App\Models\Order;
use App\Models\Payout;
use App\Models\ProduceListing;
use App\Models\User;
use App\Services\EscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PayoutTransferTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['paystack.secretKey' => 'sk_test_fake']);

        foreach (['admin', 'farmer', 'buyer', 'logistics_provider'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
    }

    private function user(string $role, array $attributes = []): User
    {
        $user = User::factory()->create(['role' => $role, ...$attributes]);
        $user->assignRole($role);

        return $user;
    }

    private function payoutFor(User $payee, array $overrides = []): Payout
    {
        $buyer = $this->user('buyer');
        $listing = ProduceListing::factory()->create(['user_id' => $payee->id]);
        $order = Order::factory()->create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $payee->id,
            'produce_id' => $listing->id,
            'subtotal' => 20000,
            'delivery_fee' => 2500,
            'total_price' => 22500,
            'status' => 'confirmed',
            'payment_status' => 'paid',
        ]);

        return Payout::create([
            'order_id' => $order->id,
            'user_id' => $payee->id,
            'amount' => 2000,
            'status' => 'pending',
            'reference' => 'PAY-TEST' . strtoupper(substr(md5(uniqid()), 0, 8)),
            ...$overrides,
        ]);
    }

    private function withBank(User $user): User
    {
        $user->update([
            'bank_name' => 'GTBank',
            'bank_code' => '058',
            'account_name' => 'Test Farmer',
            'account_number' => '0123456789',
        ]);

        return $user->fresh();
    }

    private function webhook(string $event, array $data)
    {
        $body = json_encode(['event' => $event, 'data' => $data]);

        return $this->call('POST', '/api/v1/payment/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_PAYSTACK_SIGNATURE' => hash_hmac('sha512', $body, 'sk_test_fake'),
        ], $body);
    }

    public function test_a_user_can_save_bank_details_and_a_change_clears_the_recipient(): void
    {
        $farmer = $this->user('farmer', ['paystack_recipient_code' => 'RCP_old']);

        Sanctum::actingAs($farmer);

        $this->putJson('/api/v1/profile', [
            'bank_name' => 'GTBank',
            'bank_code' => '058',
            'account_name' => 'Test Farmer',
            'account_number' => '0123456789',
        ])->assertOk();

        $farmer->refresh();
        $this->assertSame('0123456789', $farmer->account_number);
        $this->assertNull($farmer->paystack_recipient_code);

        $farmer->update(['paystack_recipient_code' => 'RCP_old']);

        $this->putJson('/api/v1/profile', ['account_number' => '9876543210'])->assertOk();

        $this->assertSame('9876543210', $farmer->fresh()->account_number);
        $this->assertNull($farmer->fresh()->paystack_recipient_code);
    }

    public function test_half_a_bank_account_is_rejected(): void
    {
        $farmer = $this->user('farmer');
        Sanctum::actingAs($farmer);

        $this->putJson('/api/v1/profile', [
            'bank_name' => 'GTBank',
            'account_number' => '0123456789',
        ])->assertStatus(422);
    }

    public function test_an_admin_can_start_a_transfer_but_it_is_not_paid_until_the_webhook(): void
    {
        Mail::fake();
        Http::fake([
            'api.paystack.co/transferrecipient' => Http::response([
                'status' => true,
                'data' => ['recipient_code' => 'RCP_123'],
            ]),
            'api.paystack.co/transfer' => Http::response([
                'status' => true,
                'data' => ['transfer_code' => 'TRF_123', 'status' => 'pending'],
            ]),
        ]);

        $admin = $this->user('admin');
        $farmer = $this->withBank($this->user('farmer'));
        $payout = $this->payoutFor($farmer);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/admin/payouts/{$payout->id}/send")
            ->assertOk()
            ->assertJsonPath('payout.transfer_status', 'pending');

        $payout->refresh();
        $this->assertSame('TRF_123', $payout->transfer_code);
        $this->assertSame('pending', $payout->status);
        $this->assertSame('0123456789', $payout->account_number);
        $this->assertSame('RCP_123', $farmer->fresh()->paystack_recipient_code);
        Mail::assertNotSent(PayoutSent::class);

        $this->webhook('transfer.success', [
            'transfer_code' => 'TRF_123',
            'reference' => $payout->transfer_reference,
            'status' => 'success',
        ])->assertOk();

        $payout->refresh();
        $this->assertSame('paid', $payout->status);
        $this->assertSame('success', $payout->transfer_status);
        $this->assertNotNull($payout->paid_at);
        Mail::assertSent(PayoutSent::class, fn ($mail) => $mail->hasTo($farmer->email));
    }

    public function test_a_failed_transfer_stays_pending_and_can_be_tried_again(): void
    {
        Mail::fake();
        Http::fake([
            'api.paystack.co/transferrecipient' => Http::response([
                'status' => true,
                'data' => ['recipient_code' => 'RCP_123'],
            ]),
            'api.paystack.co/transfer' => Http::response([
                'status' => true,
                'data' => ['transfer_code' => 'TRF_404', 'status' => 'pending'],
            ]),
        ]);

        $admin = $this->user('admin');
        $farmer = $this->withBank($this->user('farmer'));
        $payout = $this->payoutFor($farmer);

        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/admin/payouts/{$payout->id}/send")->assertOk();

        $this->webhook('transfer.failed', [
            'transfer_code' => 'TRF_404',
            'status' => 'failed',
            'reason' => 'Insufficient balance',
        ])->assertOk();

        $payout->refresh();
        $this->assertSame('pending', $payout->status);
        $this->assertSame('failed', $payout->transfer_status);
        $this->assertSame('Insufficient balance', $payout->failure_reason);
        Mail::assertNotSent(PayoutSent::class);
    }

    public function test_sending_requires_saved_bank_details(): void
    {
        Http::fake();

        $admin = $this->user('admin');
        $farmer = $this->user('farmer');
        $payout = $this->payoutFor($farmer);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/admin/payouts/{$payout->id}/send")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Add your bank name, account name and account number before a payout can be sent.');

        $this->assertSame('pending', $payout->fresh()->status);
        Http::assertNothingSent();
    }

    public function test_only_an_admin_can_start_a_transfer(): void
    {
        $farmer = $this->withBank($this->user('farmer'));
        $payout = $this->payoutFor($farmer);

        Sanctum::actingAs($farmer);

        $this->postJson("/api/v1/admin/payouts/{$payout->id}/send")->assertForbidden();
    }

    public function test_releasing_money_emails_the_payee(): void
    {
        Mail::fake();

        $admin = $this->user('admin');
        $farmer = $this->withBank($this->user('farmer'));
        $buyer = $this->user('buyer');
        $listing = ProduceListing::factory()->create(['user_id' => $farmer->id]);

        $order = Order::factory()->create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $farmer->id,
            'produce_id' => $listing->id,
            'subtotal' => 20000,
            'delivery_fee' => 0,
            'total_price' => 20000,
            'status' => 'confirmed',
            'payment_status' => 'paid',
        ]);

        app(EscrowService::class)->fund($order->fresh('delivery'));
        $pickup = $order->fresh('escrow.releases')->escrow->releases->firstWhere('milestone', 'pickup');

        app(EscrowService::class)->release($pickup, $admin, 'Picked up.');

        Mail::assertSent(PayoutReleased::class, function ($mail) use ($farmer) {
            return $mail->hasTo($farmer->email)
                && (float) $mail->payout->amount === 1900.0;
        });
    }

    public function test_the_webhook_rejects_a_bad_signature(): void
    {
        $this->call('POST', '/api/v1/payment/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_PAYSTACK_SIGNATURE' => 'wrong',
        ], json_encode(['event' => 'transfer.success', 'data' => []]))->assertStatus(401);
    }
}
