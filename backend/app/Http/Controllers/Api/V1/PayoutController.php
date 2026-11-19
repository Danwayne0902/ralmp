<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Payout;
use App\Services\EscrowService;
use App\Services\PaystackTransferService;
use Illuminate\Http\Request;
use RuntimeException;

class PayoutController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Payout::with([
            'order:id,buyer_id,farmer_id,status,payment_status,subtotal,total_price,delivery_fee,order_date,paid_at',
            'order.produce:id,commodity_name,unit',
            'release:id,milestone,label,released_at',
            'user:id,name,email,phone,bank_name,account_number',
            'platformFee:id,payout_id,kind,base_amount,rate,amount',
        ]);

        if ($user->hasRole('admin')) {
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('transfer_status')) {
                $query->where('transfer_status', $request->transfer_status);
            }
        } else {
            $query->where('user_id', $user->id);
        }

        $paginator = $query->orderByDesc('created_at')->paginate($request->get('per_page', 15));

        // amount on a payout is the money the payee receives. Attach the gross
        // base and the platform fee so every list can show what was taken.
        $paginator->getCollection()->transform(function (Payout $payout) {
            $fee = $payout->platformFee;

            // The loaded relation would serialise as platform_fee and shadow the
            // flat figure below, so keep the values from the relation only.
            $payout->makeHidden('platformFee');

            $payout->setAttribute('base_amount', (float) ($fee?->base_amount ?? $payout->amount));
            $payout->setAttribute('platform_fee', (float) ($fee?->amount ?? 0));
            $payout->setAttribute('fee_percent', (float) ($fee?->rate ?? 0));

            return $payout;
        });

        return response()->json($paginator, 200);
    }

    /**
     * Nigerian banks and their codes, read from Paystack so the numbers
     * always match the ones used for a real transfer.
     */
    public function banks(Request $request)
    {
        try {
            return response()->json(['banks' => app(PaystackTransferService::class)->banks()], 200);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 503);
        }
    }

    /**
     * Start the real bank transfer for a payout. Paystack confirms it through
     * the webhook, so nothing is marked paid here.
     */
    public function send(Request $request, $id)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $payout = Payout::find($id);

        if (!$payout) {
            return response()->json(['message' => 'Payout not found'], 404);
        }

        try {
            $payout = app(PaystackTransferService::class)->send($payout);
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'payout' => $payout->fresh(),
            ], 422);
        }

        $message = match ($payout->transfer_status) {
            'otp' => 'Paystack sent a code to the business phone. Enter it to finish the transfer.',
            'success' => 'The bank transfer went through.',
            default => 'Bank transfer started. We will mark it sent when Paystack confirms it.',
        };

        return response()->json([
            'message' => $message,
            'payout' => $payout,
            'needs_otp' => $payout->transfer_status === 'otp',
        ], 200);
    }

    /**
     * Finish a transfer that Paystack paused for a one-time code.
     */
    public function finalize(Request $request, $id)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'otp' => ['required', 'string', 'max:12'],
        ]);

        $payout = Payout::find($id);

        if (!$payout) {
            return response()->json(['message' => 'Payout not found'], 404);
        }

        try {
            $payout = app(PaystackTransferService::class)->finalize($payout, $validated['otp']);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => $payout->status === 'paid'
                ? 'The bank transfer went through.'
                : 'Code accepted. We will mark the payout sent when Paystack confirms it.',
            'payout' => $payout,
        ], 200);
    }

    /**
     * Fallback for money that was sent outside Paystack (for example a manual
     * bank transfer). The normal path is the transfer webhook.
     */
    public function markPaid(Request $request, $id)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $payout = Payout::find($id);

        if (!$payout) {
            return response()->json(['message' => 'Payout not found'], 404);
        }

        $payout = app(EscrowService::class)->markPayoutPaid($payout, $request->user(), $validated['note'] ?? null);

        return response()->json([
            'message' => 'Payout marked as paid.',
            'payout' => $payout,
        ], 200);
    }
}
