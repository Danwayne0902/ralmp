<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Payout;
use App\Services\EscrowService;
use Illuminate\Http\Request;

class PayoutController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Payout::with([
            'order:id,buyer_id,farmer_id,status,payment_status,subtotal,total_price,delivery_fee,order_date,paid_at',
            'order.produce:id,commodity_name,unit',
            'release:id,milestone,label,released_at',
            'user:id,name',
        ]);

        if ($user->hasRole('admin')) {
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
        } else {
            $query->where('user_id', $user->id);
        }

        return response()->json($query->orderByDesc('created_at')->paginate($request->get('per_page', 15)), 200);
    }

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
