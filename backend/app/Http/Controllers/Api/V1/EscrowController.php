<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\EscrowAccount;
use App\Models\EscrowRelease;
use App\Models\Order;
use App\Services\EscrowService;
use Illuminate\Http\Request;
use RuntimeException;

class EscrowController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = EscrowAccount::with([
            'order:id,buyer_id,farmer_id,produce_id,status,payment_status,total_price,subtotal,delivery_fee,order_date,paid_at',
            'order.produce:id,commodity_name,unit',
            'releases.payout',
            'buyer:id,name',
            'farmer:id,name',
        ]);

        if ($user->hasRole('admin')) {
            // Administrators see every escrow account.
        } elseif ($user->hasRole('farmer')) {
            $query->where('farmer_id', $user->id);
        } elseif ($user->hasRole('buyer')) {
            $query->where('buyer_id', $user->id);
        } else {
            $query->whereHas('releases', fn ($q) => $q->where('payee_id', $user->id));
        }

        return response()->json($query->orderByDesc('created_at')->paginate($request->get('per_page', 15)), 200);
    }

    public function show(Request $request, $orderId)
    {
        $order = Order::with(['delivery', 'escrow.releases.payout', 'payouts'])->find($orderId);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        if (!$this->canSeeOrder($request, $order)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'order_id' => $order->id,
            'escrow' => $order->escrow,
            'payouts' => $order->payouts,
        ], 200);
    }

    public function pending(Request $request)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $releases = EscrowRelease::with([
            'order:id,buyer_id,farmer_id,status,payment_status,subtotal,total_price,delivery_fee',
            'order.buyer:id,name',
            'order.farmer:id,name',
            'payee:id,name',
        ])
            ->where('status', 'pending')
            ->orderBy('id')
            ->get();

        return response()->json(['releases' => $releases], 200);
    }

    public function release(Request $request, $id)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $release = EscrowRelease::find($id);

        if (!$release) {
            return response()->json(['message' => 'Payment part not found'], 404);
        }

        try {
            $release = app(EscrowService::class)->release($release, $request->user(), $validated['note'] ?? null);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Payment released.',
            'release' => $release->load('payout', 'payee'),
        ], 200);
    }

    public function hold(Request $request, $id)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $release = EscrowRelease::find($id);

        if (!$release) {
            return response()->json(['message' => 'Payment part not found'], 404);
        }

        if ($release->status !== 'pending') {
            return response()->json(['message' => 'Only a waiting payment can be put on hold.'], 422);
        }

        $release->update([
            'status' => 'held',
            'note' => $validated['note'] ?? 'On hold for review.',
        ]);

        return response()->json([
            'message' => 'Payment put on hold.',
            'release' => $release->fresh('payout'),
        ], 200);
    }

    private function canSeeOrder(Request $request, Order $order): bool
    {
        $user = $request->user();

        if ($user->hasRole('admin')) {
            return true;
        }

        if (in_array($user->id, [$order->buyer_id, $order->farmer_id], true)) {
            return true;
        }

        return $order->delivery
            && $order->delivery->logistics_provider_id === $user->id;
    }
}
