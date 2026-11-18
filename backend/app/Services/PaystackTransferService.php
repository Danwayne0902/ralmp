<?php

namespace App\Services;

use App\Models\Payout;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Sends payout money to a user's bank account through Paystack Transfers.
 *
 * The bank transfer is confirmed by Paystack's webhook, never by the browser.
 * A payout stays "pending" and can be retried until the webhook reports that
 * the money actually left the account.
 */
class PaystackTransferService
{
    public function apiUrl(): string
    {
        return rtrim(config('paystack.paymentUrl', 'https://api.paystack.co'), '/');
    }

    public function secret(): ?string
    {
        return config('paystack.secretKey');
    }

    public function isConfigured(): bool
    {
        return (bool) $this->secret();
    }

    /**
     * Nigerian banks and their Paystack codes, cached for a day.
     *
     * @return array<int, array{name: string, code: string}>
     */
    public function banks(): array
    {
        $this->assertConfigured();

        return Cache::remember('paystack.banks.ngn', now()->addDay(), function () {
            $response = Http::withToken($this->secret())
                ->acceptJson()
                ->get($this->apiUrl() . '/bank', [
                    'country' => 'nigeria',
                    'currency' => 'NGN',
                    'perPage' => 100,
                ]);

            if (!$response->successful() || $response->json('status') !== true) {
                throw new RuntimeException('The bank list is not available right now. Try again in a moment.');
            }

            return collect($response->json('data', []))
                ->map(fn ($bank) => [
                    'name' => (string) ($bank['name'] ?? ''),
                    'code' => (string) ($bank['code'] ?? ''),
                ])
                ->filter(fn ($bank) => $bank['name'] !== '' && $bank['code'] !== '')
                ->unique('code')
                ->sortBy('name')
                ->values()
                ->all();
        });
    }

    /**
     * The Paystack recipient for this user. Created once and then reused, so a
     * change of bank details clears it and the next payout creates a new one.
     */
    public function recipientCode(User $user): string
    {
        if ($user->paystack_recipient_code) {
            return $user->paystack_recipient_code;
        }

        $this->assertBankDetails($user);

        $response = Http::withToken($this->secret())
            ->acceptJson()
            ->post($this->apiUrl() . '/transferrecipient', [
                'type' => 'nuban',
                'name' => $user->account_name,
                'account_number' => $user->account_number,
                'bank_code' => $user->bank_code,
                'currency' => 'NGN',
            ]);

        if (!$response->successful() || $response->json('status') !== true) {
            Log::warning('Paystack recipient creation failed', [
                'user_id' => $user->id,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            throw new RuntimeException(
                $this->plainMessage($response->json('message'))
            );
        }

        $code = (string) $response->json('data.recipient_code');

        if ($code === '') {
            throw new RuntimeException('Paystack did not return a transfer recipient.');
        }

        $user->forceFill(['paystack_recipient_code' => $code])->save();

        return $code;
    }

    /**
     * Start a real bank transfer for a payout. Returns once Paystack has
     * accepted the transfer; the webhook confirms the actual payment.
     */
    public function send(Payout $payout): Payout
    {
        $this->assertConfigured();

        $payout = Payout::with('user')->findOrFail($payout->id);

        if ($payout->status === 'paid') {
            return $payout;
        }

        if ($payout->transfer_code && in_array($payout->transfer_status, ['pending', 'otp'], true)) {
            throw new RuntimeException('This payout is already on its way. Wait for the bank confirmation.');
        }

        $payee = $payout->user;

        if (!$payee) {
            throw new RuntimeException('The payee account could not be found.');
        }

        $this->assertBankDetails($payee);

        try {
            $recipient = $this->recipientCode($payee);
        } catch (RuntimeException $e) {
            $this->recordFailure($payout, $e->getMessage());

            throw $e;
        }

        $reference = 'TRF-' . Str::upper(Str::random(14));
        $amount = (int) round(((float) $payout->amount) * 100);

        if ($amount < 100) {
            throw new RuntimeException('This payout is too small to send.');
        }

        $payout->forceFill([
            'transfer_status' => 'sending',
            'transfer_reference' => $reference,
            'bank_name' => $payee->bank_name,
            'account_number' => $payee->account_number,
            'account_name' => $payee->account_name,
            'failure_reason' => null,
        ])->save();

        $response = Http::withToken($this->secret())
            ->acceptJson()
            ->post($this->apiUrl() . '/transfer', [
                'source' => config('paystack.transferSource', 'balance'),
                'amount' => $amount,
                'recipient' => $recipient,
                'reason' => 'RALMP payout for order #' . $payout->order_id,
                'reference' => $reference,
            ]);

        if (!$response->successful() || $response->json('status') !== true) {
            $message = $this->plainMessage($response->json('message'));
            $this->recordFailure($payout, $message);
            throw new RuntimeException($message);
        }

        $data = $response->json('data', []);
        $status = (string) ($data['status'] ?? 'pending');

        $payout->forceFill([
            'transfer_code' => $data['transfer_code'] ?? $payout->transfer_code,
            'transfer_status' => $status,
            'sent_at' => now(),
        ])->save();

        if ($status === 'success') {
            app(EscrowService::class)->markPayoutPaid($payout, null, 'Bank transfer confirmed by Paystack');
        }

        return $payout->fresh();
    }

    /**
     * Finish a transfer that Paystack paused for a one-time code.
     */
    public function finalize(Payout $payout, string $otp): Payout
    {
        $this->assertConfigured();

        if (!$payout->transfer_code) {
            throw new RuntimeException('This payout has no transfer waiting for a code.');
        }

        $response = Http::withToken($this->secret())
            ->acceptJson()
            ->post($this->apiUrl() . '/transfer/finalize_transfer', [
                'transfer_code' => $payout->transfer_code,
                'otp' => $otp,
            ]);

        if (!$response->successful() || $response->json('status') !== true) {
            $message = $response->json('message') ?: 'The code was not accepted.';
            throw new RuntimeException($message);
        }

        $data = $response->json('data', []);
        $status = (string) ($data['status'] ?? 'pending');

        $payout->forceFill([
            'transfer_status' => $status,
            'sent_at' => now(),
        ])->save();

        if ($status === 'success') {
            app(EscrowService::class)->markPayoutPaid($payout, null, 'Bank transfer confirmed by Paystack');
        }

        return $payout->fresh();
    }

    /**
     * Apply a Paystack transfer webhook. Only these events move money.
     */
    public function handleWebhook(string $event, array $data): void
    {
        $payout = $this->findPayout($data);

        if (!$payout) {
            Log::info('Paystack transfer webhook for an unknown payout', [
                'event' => $event,
                'transfer_code' => $data['transfer_code'] ?? null,
                'reference' => $data['reference'] ?? null,
            ]);

            return;
        }

        if ($event === 'transfer.success') {
            DB::transaction(function () use ($payout, $data) {
                $locked = Payout::whereKey($payout->id)->lockForUpdate()->firstOrFail();

                $locked->update([
                    'transfer_code' => $data['transfer_code'] ?? $locked->transfer_code,
                    'transfer_status' => 'success',
                    'failure_reason' => null,
                ]);
            });

            app(EscrowService::class)->markPayoutPaid($payout->fresh(), null, 'Bank transfer confirmed by Paystack');

            return;
        }

        if (in_array($event, ['transfer.failed', 'transfer.reversed'], true)) {
            $reason = $data['reason']
                ?? $data['gateway_response']
                ?? ($event === 'transfer.reversed'
                    ? 'The bank returned this transfer.'
                    : 'The bank transfer failed.');

            DB::transaction(function () use ($payout, $event, $reason, $data) {
                $locked = Payout::whereKey($payout->id)->lockForUpdate()->firstOrFail();

                // The money never reached the payee, so it is ready to send again.
                $locked->update([
                    'transfer_code' => $data['transfer_code'] ?? $locked->transfer_code,
                    'transfer_status' => $event === 'transfer.reversed' ? 'reversed' : 'failed',
                    'failure_reason' => Str::limit((string) $reason, 240),
                    'status' => $locked->status === 'paid' ? 'pending' : $locked->status,
                    'paid_at' => $locked->status === 'paid' ? null : $locked->paid_at,
                ]);
            });

            Log::warning('Paystack transfer did not complete', [
                'payout_id' => $payout->id,
                'event' => $event,
                'reason' => $reason,
            ]);
        }
    }

    private function findPayout(array $data): ?Payout
    {
        $code = $data['transfer_code'] ?? null;
        $reference = $data['reference'] ?? null;

        return Payout::query()
            ->when($code, fn ($query) => $query->where('transfer_code', $code))
            ->when(!$code && $reference, fn ($query) => $query->where('transfer_reference', $reference))
            ->first();
    }

    /**
     * Paystack's wording is technical. Say what the person can actually do.
     */
    private function plainMessage(?string $message): string
    {
        $message = trim((string) $message);

        return match (true) {
            $message === '', str_contains(strtolower($message), 'cannot resolve') =>
                'The bank could not find that account. Check the bank and account number.',
            str_contains(strtolower($message), 'invalid bank') =>
                'That bank is not supported. Choose your bank again.',
            str_contains(strtolower($message), 'insufficient') =>
                'There is not enough money in the Paystack balance to send this payout.',
            str_contains(strtolower($message), 'duplicate') =>
                'Paystack has already seen this transfer. Check the payout before trying again.',
            default => $message,
        };
    }

    private function recordFailure(Payout $payout, string $message): void
    {
        $payout->forceFill([
            'transfer_status' => 'failed',
            'failure_reason' => Str::limit($message, 240),
        ])->save();
    }

    private function assertBankDetails(User $user): void
    {
        if (!$user->bank_code || !$user->account_number || !$user->account_name) {
            throw new RuntimeException(
                'Add your bank name, account name and account number before a payout can be sent.'
            );
        }

        if (!preg_match('/^\d{10}$/', (string) $user->account_number)) {
            throw new RuntimeException('The account number must be 10 digits.');
        }
    }

    private function assertConfigured(): void
    {
        if (!$this->secret()) {
            throw new RuntimeException('Bank transfers are not configured yet.');
        }
    }
}
