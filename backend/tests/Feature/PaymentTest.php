<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'farmer', 'buyer', 'logistics_provider'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        config([
            'paystack.secretKey' => 'sk_test_fake',
            'paystack.paymentUrl' => 'https://api.paystack.co',
        ]);
    }

    private function buyer(): User
    {
        $buyer = User::factory()->create();
        $buyer->assignRole('buyer');

        return $buyer;
    }

    private function orderFor(User $buyer): Order
    {
        return Order::factory()->create([
            'buyer_id' => $buyer->id,
            'subtotal' => 2000,
            'delivery_fee' => 2500,
            'total_price' => 4500,
        ]);
    }

    private function fakeInitialize(): void
    {
        Http::fake(function ($request) {
            if (str_contains($request->url(), '/transaction/initialize')) {
                $body = json_decode($request->body(), true);

                return Http::response([
                    'status' => true,
                    'data' => [
                        'authorization_url' => 'https://checkout.paystack.test/abc',
                        'access_code' => 'access-code',
                        'reference' => $body['reference'],
                        'currency' => 'NGN',
                    ],
                ], 200);
            }

            return Http::response(['status' => false], 500);
        });
    }

    public function test_only_the_order_buyer_can_initialize_payment(): void
    {
        $buyer = $this->buyer();
        $other = $this->buyer();
        $order = $this->orderFor($buyer);

        $this->fakeInitialize();

        Sanctum::actingAs($other);

        $this->postJson('/api/v1/payment/initialize', [
            'order_id' => $order->id,
            'callback_url' => 'http://localhost/payment/callback',
        ])->assertStatus(403);

        Sanctum::actingAs($buyer);

        $this->postJson('/api/v1/payment/initialize', [
            'order_id' => $order->id,
            'callback_url' => 'http://localhost/payment/callback',
        ])->assertOk()->assertJsonStructure(['authorization_url', 'access_code', 'reference']);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'user_id' => $buyer->id,
            'status' => 'pending',
        ]);
    }

    public function test_verify_marks_order_paid_and_is_idempotent(): void
    {
        $buyer = $this->buyer();
        $order = $this->orderFor($buyer);

        $payment = Payment::create([
            'order_id' => $order->id,
            'user_id' => $buyer->id,
            'reference' => 'RAMLP_TEST_REF',
            'amount' => 450000,
            'currency' => 'NGN',
            'status' => 'pending',
        ]);
        $order->update(['payment_reference' => $payment->reference]);

        Http::fake([
            'api.paystack.co/transaction/verify/*' => Http::response([
                'status' => true,
                'data' => [
                    'status' => 'success',
                    'amount' => 450000,
                    'currency' => 'NGN',
                    'reference' => 'RAMLP_TEST_REF',
                ],
            ], 200),
        ]);

        Sanctum::actingAs($buyer);

        $this->postJson('/api/v1/payment/verify', ['reference' => 'RAMLP_TEST_REF'])
            ->assertOk()
            ->assertJsonPath('order.payment_status', 'paid');

        $this->assertSame('success', $payment->fresh()->status);
        $this->assertSame('paid', $order->fresh()->payment_status);

        // Paid money is split into a real escrow schedule exactly once.
        $this->assertDatabaseHas('escrow_accounts', [
            'order_id' => $order->id,
            'status' => 'funded',
        ]);
        $this->assertSame(4, \App\Models\EscrowRelease::where('order_id', $order->id)->count());

        // A second call must not fail or double-charge.
        $this->postJson('/api/v1/payment/verify', ['reference' => 'RAMLP_TEST_REF'])
            ->assertOk();
    }

    public function test_verify_rejects_amount_mismatch(): void
    {
        $buyer = $this->buyer();
        $order = $this->orderFor($buyer);

        Payment::create([
            'order_id' => $order->id,
            'user_id' => $buyer->id,
            'reference' => 'RAMLP_BAD_AMOUNT',
            'amount' => 1,
            'currency' => 'NGN',
            'status' => 'pending',
        ]);

        Http::fake([
            'api.paystack.co/transaction/verify/*' => Http::response([
                'status' => true,
                'data' => [
                    'status' => 'success',
                    'amount' => 1,
                    'currency' => 'NGN',
                    'reference' => 'RAMLP_BAD_AMOUNT',
                ],
            ], 200),
        ]);

        Sanctum::actingAs($buyer);

        $this->postJson('/api/v1/payment/verify', ['reference' => 'RAMLP_BAD_AMOUNT'])
            ->assertStatus(422);

        $this->assertSame('pending', $order->fresh()->payment_status);
    }

    public function test_payment_history_is_scoped_to_the_authenticated_user(): void
    {
        $buyer = $this->buyer();
        $other = $this->buyer();
        $order = $this->orderFor($buyer);

        Payment::create([
            'order_id' => $order->id,
            'user_id' => $buyer->id,
            'reference' => 'RAMLP_MINE',
            'amount' => 450000,
            'currency' => 'NGN',
            'status' => 'success',
        ]);

        Sanctum::actingAs($buyer);
        $this->getJson('/api/v1/payment/history')->assertOk()->assertJsonCount(1, 'payments');

        Sanctum::actingAs($other);
        $this->getJson('/api/v1/payment/history')->assertOk()->assertJsonCount(0, 'payments');
    }

    public function test_webhook_rejects_invalid_signatures(): void
    {
        $this->postJson('/api/v1/payment/webhook', ['event' => 'charge.success'])
            ->assertStatus(401);
    }

    public function test_webhook_marks_a_pending_payment_paid(): void
    {
        $buyer = $this->buyer();
        $order = $this->orderFor($buyer);

        $payment = Payment::create([
            'order_id' => $order->id,
            'user_id' => $buyer->id,
            'reference' => 'RAMLP_WEBHOOK',
            'amount' => 450000,
            'currency' => 'NGN',
            'status' => 'pending',
        ]);

        $payload = [
            'event' => 'charge.success',
            'data' => [
                'reference' => $payment->reference,
                'status' => 'success',
                'amount' => 450000,
                'currency' => 'NGN',
            ],
        ];

        $body = json_encode($payload);
        $signature = hash_hmac('sha512', $body, 'sk_test_fake');

        $this->call('POST', '/api/v1/payment/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_PAYSTACK_SIGNATURE' => $signature,
        ], $body)->assertOk();

        $this->assertSame('success', $payment->fresh()->status);
        $this->assertSame('paid', $order->fresh()->payment_status);
    }
}
