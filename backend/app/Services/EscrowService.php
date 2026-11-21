<?php

namespace App\Services;

use App\Models\Delivery;
use App\Models\EscrowAccount;
use App\Models\EscrowRelease;
use App\Models\Order;
use App\Models\PlatformFee;
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
                    'label' => 'Main payment',
                    'payee_id' => $order->farmer_id,
                    'payee_role' => 'farmer',
                    'percentage' => 60,
                    'amount' => $quality,
                    'trigger' => 'Buyer confirms the goods arrived in good order',
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

            // The driver is paid only after both sides confirm the goods arrived.
            if ($locked->milestone === 'delivery') {
                $delivery = $locked->order?->delivery;

                if ($delivery && !$delivery->bothConfirmed()) {
                    throw new RuntimeException(
                        'The driver is paid after the buyer and the farmer both confirm the goods arrived.'
                    );
                }
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

                $base = round((float) $locked->amount, 2);
                $fee = $this->feeFor($base);

                $payout = Payout::create([
                    'order_id' => $locked->order_id,
                    'user_id' => $payeeId,
                    'escrow_release_id' => $locked->id,
                    'amount' => round($base - $fee, 2),
                    'status' => 'pending',
                    'reference' => 'PAY-' . Str::upper(Str::random(10)),
                    'bank_name' => $payee?->bank_name,
                    'account_number' => $payee?->account_number,
                    'account_name' => $payee?->account_name,
                    'note' => $fee > 0 ? 'Ready for bank transfer (platform fee taken)' : 'Ready for bank transfer',
                ]);

                // The fee is written in the same transaction as the payout, so
                // the ledger can never disagree with the money owed.
                if ($fee > 0) {
                    PlatformFee::create([
                        'order_id' => $locked->order_id,
                        'escrow_release_id' => $locked->id,
                        'payee_id' => $payeeId,
                        'payout_id' => $payout->id,
                        'kind' => $locked->milestone === 'delivery' ? 'delivery' : 'goods',
                        'base_amount' => $base,
                        'rate' => $this->feeRate(),
                        'amount' => $fee,
                    ]);
                }

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
     * The fee rate actually charged, kept inside the agreed 4-6% range.
     */
    public function feeRate(): float
    {
        return round(max(4, min(6, (float) config('ramlp.platform_fee_percent', 5))), 2);
    }

    /**
     * What the platform keeps from one payment part.
     */
    public function feeFor(float $amount): float
    {
        if ($amount <= 0) {
            return 0.0;
        }

        return round($amount * $this->feeRate() / 100, 2);
    }

    /**
     * Move an agreed delivery price into escrow. Called once the buyer has paid
     * it, so the delivery part always matches money that actually arrived.
     */
    public function fundDelivery(Delivery $delivery): ?EscrowRelease
    {
        return DB::transaction(function () use ($delivery) {
            $locked = Delivery::whereKey($delivery->id)->lockForUpdate()->firstOrFail();
            $order = $locked->order()->first();

            if (!$order) {
                return null;
            }

            $account = EscrowAccount::where('order_id', $order->id)->lockForUpdate()->first();

            if (!$account) {
                throw new RuntimeException('The goods payment for this order has not arrived yet.');
            }

            $amount = round((float) $locked->agreed_amount, 2);

            if ($amount <= 0) {
                throw new RuntimeException('No delivery price has been agreed for this order.');
            }

            $release = EscrowRelease::where('order_id', $order->id)
                ->where('milestone', 'delivery')
                ->lockForUpdate()
                ->first();

            if (!$release) {
                $release = EscrowRelease::create([
                    'escrow_account_id' => $account->id,
                    'order_id' => $order->id,
                    'milestone' => 'delivery',
                    'label' => 'Delivery payment',
                    'payee_id' => $locked->logistics_provider_id,
                    'payee_role' => 'logistics_provider',
                    'percentage' => 0,
                    'amount' => $amount,
                    'status' => 'pending',
                    'trigger' => 'Both the buyer and the farmer confirmed the goods arrived',
                ]);

                $account->update([
                    'amount' => round((float) $account->amount + $amount, 2),
                    'delivery_amount' => round((float) $account->delivery_amount + $amount, 2),
                ]);
            } elseif ((float) $release->amount !== $amount) {
                // A re-negotiated price only ever replaces money still in escrow.
                if ($release->status !== 'pending') {
                    throw new RuntimeException('This delivery payment has already been released.');
                }

                $account->update([
                    'amount' => round((float) $account->amount - (float) $release->amount + $amount, 2),
                    'delivery_amount' => round((float) $account->delivery_amount - (float) $release->amount + $amount, 2),
                ]);

                $release->update(['amount' => $amount]);
            }

            if ($locked->logistics_provider_id && !$release->payee_id) {
                $release->update(['payee_id' => $locked->logistics_provider_id]);
            }

            return $release->fresh();
        });
    }

    /**
     * Release the driver's payment once both sides have confirmed the goods
     * arrived. Safe to call at any time; it does nothing until both confirm.
     */
    public function releaseDeliveryIfBothConfirmed(Order $order, ?User $by = null): ?EscrowRelease
    {
        $delivery = $order->delivery()->first();

        if (!$delivery || !$delivery->bothConfirmed()) {
            return null;
        }

        return $this->releaseMilestone(
            $order,
            'delivery',
            $by,
            'Both the buyer and the farmer confirmed the goods arrived'
        );
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
