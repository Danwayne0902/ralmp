<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Mail\OrderStatusNotification;
use App\Models\Order;
use App\Models\Payment;
use App\Services\EscrowService;
use App\Services\PaystackTransferService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    /**
     * Initialize payment
     */
    public function initialize(Request $request)
    {
        $validated = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
            'callback_url' => ['required', 'url'],
            // Accepted for backwards compatibility; the authenticated email wins.
            'email' => ['nullable', 'email'],
        ]);

        $order = Order::with('buyer:id,name,email')->findOrFail($validated['order_id']);
        $this->authorizeBuyer($request, $order);

        if ($order->payment_status === 'paid') {
            return response()->json([
                'message' => 'Order already paid',
                'order' => $order,
            ], 400);
        }

        $secret = config('paystack.secretKey');

        if (!$secret) {
            return response()->json([
                'message' => 'Payment gateway is not configured.',
            ], 500);
        }

        $amount = (int) round((float) $order->total_price * 100); // kobo
        $reference = 'RAMLP_' . Str::upper(Str::random(12));

        $response = Http::withToken($secret)
            ->acceptJson()
            ->post(rtrim(config('paystack.paymentUrl', 'https://api.paystack.co'), '/') . '/transaction/initialize', [
                'email' => $request->user()->email,
                'amount' => $amount,
                'reference' => $reference,
                'callback_url' => $validated['callback_url'],
                'metadata' => [
                    'order_id' => $order->id,
                    'user_id' => $request->user()->id,
                ],
            ]);

        if (!$response->successful() || $response->json('status') !== true) {
            Log::warning('Paystack initialize failed', [
                'order_id' => $order->id,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return response()->json([
                'message' => 'Payment initialization failed',
                'error' => $response->json('message'),
            ], 502);
        }

        $data = $response->json('data');

        DB::transaction(function () use ($order, $request, $reference, $amount, $data) {
            Payment::create([
                'order_id' => $order->id,
                'user_id' => $request->user()->id,
                'provider' => 'paystack',
                'reference' => $reference,
                'amount' => $amount,
                'currency' => $data['currency'] ?? 'NGN',
                'status' => 'pending',
            ]);

            $order->update(['payment_reference' => $reference]);
        });

        return response()->json([
            'authorization_url' => $data['authorization_url'],
            'access_code' => $data['access_code'],
            'reference' => $data['reference'],
        ], 200);
    }

    /**
     * Verify payment
     */
    public function verify(Request $request)
    {
        $validated = $request->validate([
            'reference' => ['required', 'string'],
        ]);

        $payment = Payment::with('order')->where('reference', $validated['reference'])->first();

        if (!$payment) {
            return response()->json(['message' => 'Payment not found'], 404);
        }

        $order = $payment->order;
        $this->authorizeBuyer($request, $order);

        // Idempotent: a verified payment is never charged twice.
        if ($payment->status === 'success' && $order->payment_status === 'paid') {
            app(EscrowService::class)->fund($order->fresh());

            return response()->json([
                'message' => 'Payment already verified',
                'order' => $order->fresh()->load('buyer', 'farmer', 'escrow.releases'),
                'payment' => $payment,
            ], 200);
        }

        $secret = config('paystack.secretKey');

        if (!$secret) {
            return response()->json(['message' => 'Payment gateway is not configured.'], 500);
        }

        $response = Http::withToken($secret)
            ->acceptJson()
            ->get(rtrim(config('paystack.paymentUrl', 'https://api.paystack.co'), '/') . '/transaction/verify/' . urlencode($validated['reference']));

        if (!$response->successful() || $response->json('status') !== true) {
            return response()->json(['message' => 'Payment verification failed'], 400);
        }

        $data = $response->json('data');

        if (($data['status'] ?? null) !== 'success') {
            return response()->json(['message' => 'Payment has not been completed'], 400);
        }

        if (!$this->amountMatches($order, $data)) {
            Log::warning('Paystack amount mismatch', [
                'order_id' => $order->id,
                'expected' => (int) round((float) $order->total_price * 100),
                'received' => $data['amount'] ?? null,
                'currency' => $data['currency'] ?? null,
            ]);

            return response()->json(['message' => 'Payment amount does not match the order total'], 422);
        }

        $order = $this->markPaid($payment, $order, $data);

        return response()->json([
            'message' => 'Payment verified successfully',
            'order' => $order->load('buyer', 'farmer', 'escrow.releases'),
            'payment' => $payment->fresh(),
        ], 200);
    }

    /**
     * Get payment history for the authenticated buyer.
     */
    public function history(Request $request)
    {
        $payments = Payment::with('order')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Payment $payment) {
                return [
                    'id' => $payment->id,
                    'order_id' => $payment->order_id,
                    'reference' => $payment->reference,
                    'amount' => $payment->amount / 100,
                    'currency' => $payment->currency,
                    'status' => $payment->status,
                    'order_status' => $payment->order?->status,
                    'paid_at' => $payment->paid_at,
                    'created_at' => $payment->created_at,
                ];
            });

        return response()->json(['payments' => $payments], 200);
    }

    /**
     * Paystack webhook. Authentication is the HMAC signature, not Sanctum.
     */
    public function webhook(Request $request)
    {
        $secret = config('paystack.secretKey');

        if (!$secret) {
            return response()->json(['message' => 'Payment gateway is not configured.'], 503);
        }

        $signature = $request->header('x-paystack-signature');
        $payload = $request->getContent();

        if (!$signature || !hash_equals(hash_hmac('sha512', $payload, $secret), $signature)) {
            return response()->json(['message' => 'Invalid signature'], 401);
        }

        $event = (string) $request->input('event');
        $data = $request->input('data', []);

        // Payouts are confirmed here, not in the browser.
        if (str_starts_with($event, 'transfer.')) {
            app(PaystackTransferService::class)->handleWebhook($event, $data);

            return response()->json(['status' => 'ok']);
        }

        if ($event === 'charge.success' && !empty($data['reference'])) {
            $payment = Payment::with('order')->where('reference', $data['reference'])->first();

            if ($payment && $payment->status !== 'success' && $payment->order) {
                if ($this->amountMatches($payment->order, $data)) {
                    $this->markPaid($payment, $payment->order, $data);
                } else {
                    Log::warning('Paystack webhook amount mismatch', [
                        'reference' => $data['reference'],
                        'amount' => $data['amount'] ?? null,
                    ]);
                }
            }
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * Mark the payment and order as paid, once, in a transaction.
     */
    private function markPaid(Payment $payment, Order $order, array $gatewayData): Order
    {
        DB::transaction(function () use ($payment, $order, $gatewayData) {
            $payment->update([
                'status' => 'success',
                'gateway_status' => $gatewayData['status'] ?? 'success',
                'gateway_response' => $gatewayData,
                'paid_at' => now(),
            ]);

            $order->update([
                'payment_status' => 'paid',
                'status' => 'confirmed',
                'paid_at' => now(),
            ]);

            // Split the money into its payment parts as soon as it is safe.
            app(EscrowService::class)->fund($order->fresh());
        });

        $fresh = $order->fresh()->load('buyer', 'farmer', 'escrow.releases');

        try {
            if ($fresh->buyer) {
                Mail::to($fresh->buyer->email)->send(new OrderStatusNotification($fresh, 'buyer'));
            }
            if ($fresh->farmer) {
                Mail::to($fresh->farmer->email)->send(new OrderStatusNotification($fresh, 'farmer'));
            }
        } catch (\Throwable $e) {
            // A mail outage must never roll back a successful payment.
            Log::error('Order payment notification failed', [
                'order_id' => $fresh->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $fresh;
    }

    private function amountMatches(Order $order, array $gatewayData): bool
    {
        $expected = (int) round((float) $order->total_price * 100);
        $received = (int) ($gatewayData['amount'] ?? -1);
        $currency = strtoupper($gatewayData['currency'] ?? 'NGN');

        return $received === $expected && $currency === 'NGN';
    }

    private function authorizeBuyer(Request $request, Order $order): void
    {
        if ($order->buyer_id !== $request->user()->id && !$request->user()->hasRole('admin')) {
            abort(403, 'Unauthorized');
        }
    }
}
