<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\DeliveryOffer;
use App\Models\Message;
use App\Models\Order;
use App\Models\User;
use App\Services\EscrowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Delivery prices are negotiated in chat between the buyer and a driver.
 *
 * Accepting an offer locks the price, assigns that driver, and the buyer then
 * pays the agreed amount into escrow. The driver is paid only after both the
 * buyer and the farmer confirm the goods arrived.
 */
class DeliveryOfferController extends Controller
{
    /**
     * Every offer for one order, with the current delivery state.
     */
    public function index(Request $request, $orderId)
    {
        $order = Order::with([
            'buyer:id,name,phone,address,state,lga',
            'farmer:id,name,phone,address,state,lga',
            'delivery',
            'items.produce:id,commodity_name,unit',
        ])->find($orderId);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        if (!$this->canView($request->user(), $order)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $offers = DeliveryOffer::with([
            'driver:id,name,phone,profile_image',
            'proposer:id,name',
        ])
            ->where('order_id', $order->id)
            ->orderByDesc('created_at')
            ->get();

        $delivery = $order->delivery;

        return response()->json([
            'order' => [
                'id' => $order->id,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'subtotal' => (float) $order->subtotal,
                'total_price' => (float) $order->total_price,
                'delivery_date' => $order->delivery_date,
                'buyer' => $order->buyer,
                'farmer' => $order->farmer,
                'items' => $order->items,
            ],
            'delivery' => $delivery ? $this->deliveryPayload($delivery, $request->user()) : null,
            'offers' => $offers->map(fn (DeliveryOffer $offer) => $this->offerPayload($offer, $request->user())),
            'fee_percent' => app(EscrowService::class)->feeRate(),
            'locked' => $delivery ? $delivery->payment_status === 'paid' : false,
            'can_propose' => $this->canPropose($request->user(), $order, $delivery),
        ], 200);
    }

    /**
     * Propose a delivery price. The buyer names a driver; a driver names only
     * a price and is automatically the driver on the offer.
     */
    public function store(Request $request, $orderId)
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:10000000'],
            'note' => ['nullable', 'string', 'max:255'],
            'driver_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $order = Order::with('buyer:id,name', 'farmer:id,name', 'delivery')->find($orderId);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $user = $request->user();

        if (!$this->canPropose($user, $order, $order->delivery)) {
            return response()->json([
                'message' => 'You cannot make a delivery offer for this order right now.',
            ], 403);
        }

        if ($order->payment_status !== 'paid') {
            return response()->json([
                'message' => 'The goods must be paid for before delivery can be arranged.',
            ], 422);
        }

        if ($order->delivery && $order->delivery->payment_status === 'paid') {
            return response()->json([
                'message' => 'The delivery price has already been paid and cannot be changed.',
            ], 422);
        }

        $driverId = $user->hasRole('logistics_provider')
            ? $user->id
            : ($validated['driver_id'] ?? null);

        if (!$driverId) {
            return response()->json([
                'message' => 'Choose the driver you want to negotiate with.',
            ], 422);
        }

        $driver = User::find($driverId);

        if (!$driver || !$driver->hasRole('logistics_provider')) {
            return response()->json(['message' => 'That account is not a driver.'], 422);
        }

        if ($order->delivery && $order->delivery->logistics_provider_id && $order->delivery->logistics_provider_id !== $driver->id) {
            return response()->json([
                'message' => 'Another driver is already assigned to this delivery. Ask them to decline first.',
            ], 422);
        }

        $offer = DB::transaction(function () use ($order, $user, $driver, $validated) {
            $offer = DeliveryOffer::create([
                'order_id' => $order->id,
                'buyer_id' => $order->buyer_id,
                'driver_id' => $driver->id,
                'proposed_by' => $user->id,
                'amount' => round((float) $validated['amount'], 2),
                'status' => 'proposed',
                'note' => $validated['note'] ?? null,
            ]);

            // The offer also lands in the chat so both sides can keep talking.
            $recipientId = $user->id === $order->buyer_id ? $driver->id : $order->buyer_id;

            Message::create([
                'sender_id' => $user->id,
                'recipient_id' => $recipientId,
                'conversation_id' => $this->conversationId($user->id, $recipientId),
                'message' => $validated['note']
                    ?? 'Delivery offer: ₦' . number_format((float) $offer->amount, 2),
                'type' => 'offer',
                'offer_id' => $offer->id,
            ]);

            return $offer;
        });

        return response()->json([
            'message' => 'Offer sent. The other side can accept or counter it in chat.',
            'offer' => $this->offerPayload($offer->fresh(['driver', 'proposer']), $user),
            'fee_percent' => app(EscrowService::class)->feeRate(),
        ], 201);
    }

    /**
     * The side that received an offer accepts it. This locks the price and
     * assigns the driver, whether the buyer accepted the driver's price or the
     * driver accepted the buyer's counter.
     */
    public function accept(Request $request, $id)
    {
        $offer = DeliveryOffer::with('order.buyer', 'order.farmer', 'order.delivery', 'driver')->find($id);

        if (!$offer) {
            return response()->json(['message' => 'Offer not found'], 404);
        }

        $user = $request->user();
        $isAdmin = $user->hasRole('admin');
        $isBuyer = $user->id === $offer->order->buyer_id;
        $isDriver = $user->id === $offer->driver_id;

        if (!$isAdmin && !$isBuyer && !$isDriver) {
            return response()->json([
                'message' => 'Only the buyer or the driver on this delivery can accept a price.',
            ], 403);
        }

        if ($offer->status !== 'proposed') {
            return response()->json(['message' => 'This offer is no longer open.'], 422);
        }

        // Neither side can lock in a price it named itself. The other side has
        // to come back and accept it.
        if (!$isAdmin && $offer->proposed_by === $user->id) {
            return response()->json([
                'message' => 'Wait for the other side to accept your offer.',
            ], 422);
        }

        $order = $offer->order;

        if ($order->payment_status !== 'paid') {
            return response()->json(['message' => 'The goods must be paid for first.'], 422);
        }

        if ($order->delivery && $order->delivery->payment_status === 'paid') {
            return response()->json(['message' => 'The delivery price has already been paid.'], 422);
        }

        $delivery = DB::transaction(function () use ($offer, $order, $user) {
            $locked = DeliveryOffer::whereKey($offer->id)->lockForUpdate()->firstOrFail();

            $locked->update([
                'status' => 'accepted',
                'accepted_at' => now(),
            ]);

            // Only one price can win. The rest close quietly.
            DeliveryOffer::where('order_id', $order->id)
                ->where('id', '!=', $locked->id)
                ->where('status', 'proposed')
                ->update(['status' => 'superseded']);

            $delivery = Delivery::where('order_id', $order->id)->lockForUpdate()->first();

            if (!$delivery) {
                $delivery = Delivery::create([
                    'order_id' => $order->id,
                    'logistics_provider_id' => $locked->driver_id,
                    'status' => 'assigned',
                    'pickup_location' => $this->addressFor($order->farmer) ?: 'Farmer location',
                    'delivery_location' => $this->addressFor($order->buyer) ?: 'Buyer location',
                    'pickup_date' => $order->delivery_date ? $order->delivery_date->toDateString() : null,
                    'tracking_number' => 'TRK' . Str::upper(Str::random(10)),
                ]);
            }

            $delivery->update([
                'logistics_provider_id' => $locked->driver_id,
                'status' => in_array($delivery->status, ['cancelled', 'delivered'], true) ? $delivery->status : 'assigned',
                'agreed_amount' => $locked->amount,
                'delivery_cost' => $locked->amount,
            ]);

            // The confirmation goes to the other side of this deal, so a driver
            // accepting the buyer's counter does not message themselves.
            $acceptingBuyer = $user->id === $order->buyer_id;
            $recipientId = $acceptingBuyer ? $locked->driver_id : $order->buyer_id;

            Message::create([
                'sender_id' => $user->id,
                'recipient_id' => $recipientId,
                'conversation_id' => $this->conversationId($user->id, $recipientId),
                'message' => 'Delivery price accepted: ₦' . number_format((float) $locked->amount, 2)
                    . ($acceptingBuyer
                        ? '. Please pay it from the order page before pickup.'
                        : '. The buyer pays it from the order page before pickup.'),
                'type' => 'offer',
                'offer_id' => $locked->id,
            ]);

            return $delivery->fresh();
        });

        return response()->json([
            'message' => $user->id === $order->buyer_id
                ? 'Price locked in. Pay the delivery price from the order page to complete the arrangement.'
                : 'Price locked in. The buyer pays the delivery price into escrow before pickup.',
            'offer' => $this->offerPayload($offer->fresh(['driver', 'proposer']), $request->user()),
            'delivery' => $this->deliveryPayload($delivery, $request->user()),
            'fee_percent' => app(EscrowService::class)->feeRate(),
        ], 200);
    }

    /**
     * Decline or withdraw an open offer.
     */
    public function decline(Request $request, $id)
    {
        $offer = DeliveryOffer::with('order')->find($id);

        if (!$offer) {
            return response()->json(['message' => 'Offer not found'], 404);
        }

        $user = $request->user();
        $allowed = $user->id === $offer->buyer_id
            || $user->id === $offer->driver_id
            || $user->hasRole('admin');

        if (!$allowed) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($offer->status !== 'proposed') {
            return response()->json(['message' => 'This offer is no longer open.'], 422);
        }

        $offer->update(['status' => 'declined']);

        return response()->json([
            'message' => 'Offer declined.',
            'offer' => $this->offerPayload($offer->fresh(['driver', 'proposer']), $user),
        ], 200);
    }

    /**
     * Paid orders that still need a driver. This is the drivers' job board.
     */
    public function openJobs(Request $request)
    {
        if (!$request->user()->hasRole('logistics_provider')) {
            return response()->json(['message' => 'Only logistics providers can view open jobs.'], 403);
        }

        $orders = Order::with([
            'buyer:id,name,phone,address,state,lga',
            'farmer:id,name,phone,address,state,lga',
            'delivery',
            'items.produce:id,commodity_name,unit',
        ])
            ->where('payment_status', 'paid')
            ->whereNotIn('status', ['completed', 'cancelled', 'rejected'])
            ->whereDoesntHave('delivery', function ($query) {
                $query->whereNotNull('logistics_provider_id');
            })
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $myOffers = DeliveryOffer::where('driver_id', $request->user()->id)
            ->whereIn('order_id', $orders->pluck('id'))
            ->where('status', 'proposed')
            ->get()
            ->keyBy('order_id');

        $feeRate = app(EscrowService::class)->feeRate();

        return response()->json([
            'jobs' => $orders->map(function (Order $order) use ($myOffers, $feeRate) {
                $mine = $myOffers->get($order->id);

                return [
                    'order_id' => $order->id,
                    'status' => $order->status,
                    'subtotal' => (float) $order->subtotal,
                    'delivery_date' => $order->delivery_date,
                    'buyer' => $order->buyer,
                    'farmer' => $order->farmer,
                    'items' => $order->items,
                    'pickup_location' => $this->addressFor($order->farmer),
                    'delivery_location' => $this->addressFor($order->buyer),
                    'my_offer' => $mine ? [
                        'id' => $mine->id,
                        'amount' => (float) $mine->amount,
                        'status' => $mine->status,
                    ] : null,
                    'fee_percent' => $feeRate,
                ];
            })->values(),
        ], 200);
    }

    /**
     * The farmer confirms the goods were handed to the driver. Once the buyer
     * has also confirmed receipt, the driver's money is released automatically.
     */
    public function confirmHandover(Request $request, $orderId)
    {
        $order = Order::with('delivery', 'farmer')->find($orderId);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $user = $request->user();

        if ($order->farmer_id !== $user->id && !$user->hasRole('admin')) {
            return response()->json(['message' => 'Only the farmer can confirm the handover.'], 403);
        }

        if ($order->payment_status !== 'paid') {
            return response()->json(['message' => 'This order has not been paid yet.'], 422);
        }

        $delivery = $order->delivery;

        if (!$delivery) {
            return response()->json(['message' => 'No delivery has been arranged for this order yet.'], 422);
        }

        if ($delivery->farmer_confirmed_at) {
            return response()->json([
                'message' => 'You already confirmed the handover.',
                'delivery' => $this->deliveryPayload($delivery, $user),
            ], 200);
        }

        $delivery->update(['farmer_confirmed_at' => now()]);

        $released = app(EscrowService::class)
            ->releaseDeliveryIfBothConfirmed($order->fresh('delivery'), $user);

        $delivery = $delivery->fresh();

        return response()->json([
            'message' => $delivery->bothConfirmed()
                ? ($released
                    ? 'Handover confirmed. Both sides have now confirmed, so the driver has been paid.'
                    : 'Handover confirmed. Both sides have now confirmed.')
                : 'Handover confirmed. The driver is paid once the buyer also confirms the goods arrived.',
            'delivery' => $this->deliveryPayload($delivery, $user),
        ], 200);
    }

    private function canView(User $user, Order $order): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->id === $order->buyer_id || $user->id === $order->farmer_id) {
            return true;
        }

        if ($order->delivery && $order->delivery->logistics_provider_id === $user->id) {
            return true;
        }

        return $user->hasRole('logistics_provider');
    }

    private function canPropose(User $user, Order $order, ?Delivery $delivery): bool
    {
        if ($user->hasRole('admin')) {
            return false;
        }

        if (in_array($order->status, ['completed', 'cancelled', 'rejected'], true)) {
            return false;
        }

        if ($user->id === $order->buyer_id) {
            return true;
        }

        if ($user->hasRole('logistics_provider')) {
            return !$delivery
                || !$delivery->logistics_provider_id
                || $delivery->logistics_provider_id === $user->id;
        }

        return false;
    }

    private function offerPayload(DeliveryOffer $offer, User $user): array
    {
        return [
            'id' => $offer->id,
            'order_id' => $offer->order_id,
            'amount' => (float) $offer->amount,
            'status' => $offer->status,
            'note' => $offer->note,
            'proposed_by' => $offer->proposed_by,
            'proposer' => $offer->proposer ? ['id' => $offer->proposer->id, 'name' => $offer->proposer->name] : null,
            'driver' => $offer->driver ? [
                'id' => $offer->driver->id,
                'name' => $offer->driver->name,
                'phone' => $offer->driver->phone,
                'profile_image' => $offer->driver->profile_image,
            ] : null,
            'mine' => $offer->proposed_by === $user->id,
            'can_accept' => $offer->status === 'proposed'
                && $offer->proposed_by !== $user->id
                && ($user->id === $offer->buyer_id || $user->id === $offer->driver_id),
            'created_at' => $offer->created_at,
            'accepted_at' => $offer->accepted_at,
        ];
    }

    private function deliveryPayload(Delivery $delivery, User $user): array
    {
        $feeRate = app(EscrowService::class)->feeRate();
        $amount = (float) $delivery->agreed_amount;

        return [
            'id' => $delivery->id,
            'status' => $delivery->status,
            'logistics_provider_id' => $delivery->logistics_provider_id,
            'pickup_location' => $delivery->pickup_location,
            'delivery_location' => $delivery->delivery_location,
            'agreed_amount' => $amount,
            'payment_status' => $delivery->payment_status,
            'paid_at' => $delivery->paid_at,
            'buyer_confirmed_at' => $delivery->buyer_confirmed_at,
            'farmer_confirmed_at' => $delivery->farmer_confirmed_at,
            'both_confirmed' => $delivery->bothConfirmed(),
            'fee_percent' => $feeRate,
            'driver_receives' => round($amount - ($amount * $feeRate / 100), 2),
            'can_pay' => $user->id === $delivery->order?->buyer_id
                && $amount > 0
                && $delivery->payment_status !== 'paid',
            'can_farmer_confirm' => $user->id === $delivery->order?->farmer_id
                && !$delivery->farmer_confirmed_at,
        ];
    }

    private function addressFor(?User $user): ?string
    {
        if (!$user) {
            return null;
        }

        $parts = array_filter([
            $user->address,
            $user->lga,
            $user->state,
        ]);

        return $parts ? implode(', ', $parts) : null;
    }

    private function conversationId(int $user1Id, int $user2Id): string
    {
        $ids = [$user1Id, $user2Id];
        sort($ids);

        return 'conv_' . implode('_', $ids);
    }
}
