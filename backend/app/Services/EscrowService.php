<?php

namespace App\Services;

use App\Models\EscrowAccount;
use App\Models\EscrowRelease;
use App\Models\Order;
use App\Models\Payout;
use App\Models\User;
use App\Mail\PayoutReleased;
use App\Mail\PayoutSent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use RuntimeException;

class EscrowService
{
    /**
     * Create the escrow account and the payment parts for a paid order.
     * Safe to call more than once: a funded order is never re-split.
     */
    public function fund(Order $order): EscrowAccount
    {
        return DB::transaction(function () use ($order) {
            $existing = EscrowAccount::where('order_id', $order->id)->lockForUpdate()->first();

            if ($existing) {
                return $existing->load('releases');
            }

            $deliveryAmount = round((float) $order->delivery_fee, 2);
            $farmerAmount = (float) $order->subtotal > 0
                ? round((float) $order->subtotal, 2)
                : round(max(0, (float) $order->total_price - $deliveryAmount), 2);

            $pickup = round($farmerAmount * 0.10, 2);
            $quality = round($farmerAmount * 0.60, 2);
            $final = round($farmerAmount - $pickup - $quality, 2);

            $account = EscrowAccount::create([
                'order_id' => $order->id,
                'buyer_id' => $order->buyer_id,
                'farmer_id' => $order->farmer_id,
                'amount' => round((float) $order->total_price, 2),
                'farmer_amount' => $farmerAmount,
                'delivery_amount' => $deliveryAmount,
                'released_amount' => 0,
                'status' => 'funded',
                'funded_at' => now(),
            ]);

            $logisticsId = $order->delivery?->logistics_provider_id;

            $parts = [
                [
                    'milestone' => 'pickup',
                    'label' => 'Pickup payment',
                    'payee_id' => $order->farmer_id,
                    'payee_role' => 'farmer',
                    'percentage' => 10,
                    'amount' => $pickup,
                    'trigger' => 'Transporter marks the goods as picked up',
                ],
                [
                    'milestone' => 'quality',
                    'label' => 'Weight and quality payment',
                    'payee_id' => $order->farmer_id,
                    'payee_role' => 'farmer',
                    'percentage' => 60,
                    'amount' => $quality,
                    'trigger' => 'Our team checks the weight and quality',
                ],
                [
                    'milestone' => 'final',
                    'label' => 'Final payment',
                    'payee_id' => $order->farmer_id,
                    'payee_role' => 'farmer',
                    'percentage' => 30,
                    'amount' => $final,
                    'trigger' => 'Buyer confirms the goods arrived',
                ],
            ];

            if ($deliveryAmount > 0) {
                $parts[] = [
                    'milestone' => 'delivery',
                    'label' => 'Delivery payment',
                    'payee_id' => $logisticsId,
                    'payee_role' => 'logistics_provider',
                    'percentage' => 0,
                    'amount' => $deliveryAmount,
                    'trigger' => 'Delivery is complete',
                ];
            }

            foreach ($parts as $part) {
                EscrowRelease::create([
                    'escrow_account_id' => $account->id,
                    'order_id' => $order->id,
                    'status' => 'pending',
                    ...$part,
                ]);
            }

            return $account->load('releases');
        });
    }

    /**
     * Release one part of the money and record the payout owed to the payee.
     */
    public function release(EscrowRelease $release, User $by, ?string $note = null, ?string $trigger = null): EscrowRelease
    {
        $result = DB::transaction(function () use ($release, $by, $note, $trigger) {
            $locked = EscrowRelease::whereKey($release->id)->lockForUpdate()->firstOrFail();

            if ($locked->status === 'released') {
                return [$locked->fresh(['payout', 'payee']), false];
            }

            if (in_array($locked->status, ['held', 'cancelled'], true)) {
                throw new RuntimeException('This payment is on hold and cannot be released.');
            }

            $payeeId = $locked->payee_id ?: $this->deliveryPayee($locked);

            if (!$payeeId) {
                throw new RuntimeException('No payee is set for this payment yet.');
            }

            $locked->update([
                'payee_id' => $payeeId,
                'status' => 'released',
                'released_by' => $by->id,
                'released_at' => now(),
                'note' => $note ?: $locked->note,
                'trigger' => $trigger ?: $locked->trigger,
            ]);

            $created = false;
            if (!$locked->payout) {
                $payee = User::find($payeeId);

                Payout::create([
                    'order_id' => $locked->order_id,
                    'user_id' => $payeeId,
                    'escrow_release_id' => $locked->id,
                    'amount' => $locked->amount,
                    'status' => 'pending',
                    'reference' => 'PAY-' . Str::upper(Str::random(10)),
                    'bank_name' => $payee?->bank_name,
                    'account_number' => $payee?->account_number,
                    'account_name' => $payee?->account_name,
                    'note' => 'Ready for bank transfer',
                ]);
                $created = true;
            }

            $this->refreshAccount($locked->account()->lockForUpdate()->firstOrFail());

            $fresh = $locked->fresh(['payout', 'payee']);

            return [$fresh, $created];
        });

        [$fresh, $created] = $result;

        if ($created && $fresh->payout) {
            $this->notifyPayoutReleased($fresh->payout);
        }

        return $fresh;
    }

    /**
     * Release a milestone automatically when its proof arrives. Missing escrow
     * (unpaid orders) is a no-op rather than an error.
     */
    public function releaseMilestone(Order $order, string $milestone, ?User $by = null, ?string $trigger = null): ?EscrowRelease
    {
        $release = EscrowRelease::where('order_id', $order->id)
            ->where('milestone', $milestone)
            ->first();

        if (!$release || $release->status !== 'pending') {
            return $release;
        }

        $systemUser = $by ?: $this->systemUser();

        if (!$systemUser) {
            return $release;
        }

        return $this->release($release, $systemUser, null, $trigger);
    }

    /**
     * Put every unpaid part of an order on hold (cancel, rejection, complaint).
     */
    public function holdRemaining(Order $order, ?string $note = null): void
    {
        DB::transaction(function () use ($order, $note) {
            EscrowRelease::where('order_id', $order->id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->get()
                ->each(function (EscrowRelease $release) use ($note) {
                    $release->update([
                        'status' => 'held',
                        'note' => $note ?: 'On hold while the order is reviewed.',
                    ]);
                });
        });
    }

    /**
     * Mark a payout as sent after the bank transfer has been made.
     */
    public function markPayoutPaid(Payout $payout, ?User $by = null, ?string $note = null): Payout
    {
        $result = DB::transaction(function () use ($payout, $by, $note) {
            $locked = Payout::whereKey($payout->id)->lockForUpdate()->firstOrFail();
            $changed = false;

            if ($locked->status !== 'paid') {
                $locked->update([
                    'status' => 'paid',
                    'paid_at' => now(),
                    'note' => $note ?: ($by ? 'Confirmed by ' . $by->name : 'Bank transfer confirmed'),
                ]);
                $changed = true;
            }

            return [$locked->fresh(), $changed];
        });

        [$fresh, $changed] = $result;

        if ($changed) {
            $this->notifyPayoutSent($fresh);
        }

        return $fresh;
    }

    /**
     * Tell the payee that money was released. A mail outage never blocks
     * the release that already happened.
     */
    private function notifyPayoutReleased(Payout $payout): void
    {
        try {
            $payout->loadMissing(['user', 'release']);

            if ($payout->user?->email) {
                Mail::to($payout->user->email)->send(new PayoutReleased($payout));
            }
        } catch (\Throwable $e) {
            Log::error('Payout released email failed', [
                'payout_id' => $payout->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function notifyPayoutSent(Payout $payout): void
    {
        try {
            $payout->loadMissing(['user', 'release']);

            if ($payout->user?->email) {
                Mail::to($payout->user->email)->send(new PayoutSent($payout));
            }
        } catch (\Throwable $e) {
            Log::error('Payout sent email failed', [
                'payout_id' => $payout->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Attach the assigned transporter to the delivery part of the escrow.
     */
    public function syncDeliveryPayee(Order $order): void
    {
        $release = EscrowRelease::where('order_id', $order->id)
            ->where('milestone', 'delivery')
            ->first();

        $payeeId = $order->delivery?->logistics_provider_id;

        if ($release && $payeeId && !$release->payee_id) {
            $release->update(['payee_id' => $payeeId]);
        }
    }

    private function deliveryPayee(EscrowRelease $release): ?int
    {
        if ($release->milestone !== 'delivery') {
            return null;
        }

        return $release->order?->delivery?->logistics_provider_id;
    }

    private function refreshAccount(EscrowAccount $account): void
    {
        $released = (float) EscrowRelease::where('escrow_account_id', $account->id)
            ->where('status', 'released')
            ->sum('amount');

        $account->update([
            'released_amount' => round($released, 2),
            'status' => $released <= 0
                ? 'funded'
                : ($released + 0.01 >= (float) $account->amount ? 'released' : 'partly_released'),
        ]);
    }

    /**
     * Automatic releases need an actor for the audit record. The first active
     * administrator is used, and a missing admin simply leaves money pending.
     */
    private function systemUser(): ?User
    {
        return User::role('admin')->where('is_active', true)->orderBy('id')->first()
            ?: User::role('admin')->orderBy('id')->first();
    }
}
