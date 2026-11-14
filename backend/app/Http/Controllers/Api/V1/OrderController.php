<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\OrderStatusUpdated;
use App\Http\Controllers\Controller;
use App\Mail\OrderStatusNotification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProduceListing;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    /**
     * Get all orders with filtering
     */
    public function index(Request $request)
    {
        $query = Order::query();

        // Filter by user role
        if ($request->user()->hasRole('farmer')) {
            $query->where('farmer_id', $request->user()->id);
        } elseif ($request->user()->hasRole('buyer')) {
            $query->where('buyer_id', $request->user()->id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('from_date') && $request->has('to_date')) {
            $query->whereBetween('order_date', [$request->from_date, $request->to_date]);
        }

        $orders = $query->with('buyer', 'farmer', 'produce', 'items', 'delivery')
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 15));

        return response()->json($orders, 200);
    }

    /**
     * Get order details
     */
    public function show($id, Request $request)
    {
        $order = Order::with([
            'buyer:id,name,phone,address,state,lga,profile_image',
            'farmer:id,name,phone,address,state,lga,profile_image',
            'produce',
            'items.produce',
            'delivery.trackingHistory',
            'payments',
        ])->find($id);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        // Check authorization
        if ($order->buyer_id !== $request->user()->id &&
            $order->farmer_id !== $request->user()->id &&
            !$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(['order' => $order], 200);
    }

    /**
     * Create one or more orders from the buyer's cart.
     *
     * Prices and totals are always resolved from the database; any
     * client-supplied unit_price / farmer_id values are ignored.
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasRole('buyer')) {
            return response()->json(['message' => 'Only buyers can create orders'], 403);
        }

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.produce_id' => ['required', 'integer', 'distinct', 'exists:produce_listings,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'delivery_date' => ['nullable', 'date', 'after:now'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $deliveryDate = isset($validated['delivery_date'])
            ? Carbon::parse($validated['delivery_date'])
            : now()->addDays((int) config('ramlp.default_delivery_days', 3));

        $deliveryFee = (float) config('ramlp.delivery_fee', 2500);

        $orders = DB::transaction(function () use ($validated, $deliveryDate, $deliveryFee, $request) {
            $ids = collect($validated['items'])->pluck('produce_id')->unique()->values();

            $listings = ProduceListing::whereIn('id', $ids)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $requested = collect($validated['items'])->groupBy('produce_id')->map->sum('quantity');

            foreach ($requested as $produceId => $quantity) {
                $listing = $listings->get($produceId);

                if (!$listing) {
                    throw ValidationException::withMessages([
                        'items' => "Produce listing #{$produceId} is no longer available.",
                    ]);
                }

                if ($listing->availability_status !== 'available') {
                    throw ValidationException::withMessages([
                        'items' => "{$listing->commodity_name} is not available for purchase.",
                    ]);
                }

                if ((float) $listing->quantity < (float) $quantity) {
                    throw ValidationException::withMessages([
                        'items' => "Only {$listing->quantity} {$listing->unit} of {$listing->commodity_name} remain.",
                    ]);
                }
            }

            // The schema stores one farmer per order, so split a multi-farmer
            // cart into one order per farmer.
            $groups = collect($validated['items'])->groupBy(
                fn ($item) => $listings->get($item['produce_id'])->user_id
            );

            $created = [];

            foreach ($groups as $farmerId => $items) {
                $subtotal = 0.0;
                $prepared = [];

                foreach ($items as $item) {
                    $listing = $listings->get($item['produce_id']);
                    $quantity = (float) $item['quantity'];
                    $lineTotal = round($quantity * (float) $listing->price, 2);

                    $subtotal += $lineTotal;
                    $prepared[] = [
                        'listing' => $listing,
                        'quantity' => $quantity,
                        'unit_price' => (float) $listing->price,
                        'subtotal' => $lineTotal,
                    ];
                }

                $subtotal = round($subtotal, 2);
                $total = round($subtotal + $deliveryFee, 2);
                $first = $prepared[0];

                $order = Order::create([
                    'buyer_id' => $request->user()->id,
                    'farmer_id' => $farmerId,
                    'produce_id' => $first['listing']->id,
                    'quantity' => $first['quantity'],
                    'unit_price' => $first['unit_price'],
                    'subtotal' => $subtotal,
                    'delivery_fee' => $deliveryFee,
                    'total_price' => $total,
                    'status' => 'pending',
                    'order_date' => now(),
                    'delivery_date' => $deliveryDate,
                    'notes' => $validated['notes'] ?? null,
                ]);

                foreach ($prepared as $line) {
                    OrderItem::create([
                        'order_id' => $order->id,
                        'produce_id' => $line['listing']->id,
                        'quantity' => $line['quantity'],
                        'unit_price' => $line['unit_price'],
                        'subtotal' => $line['subtotal'],
                    ]);

                    // Reserve stock immediately.
                    $remaining = round((float) $line['listing']->quantity - $line['quantity'], 2);
                    $line['listing']->quantity = max(0, $remaining);
                    if ($line['listing']->quantity <= 0) {
                        $line['listing']->availability_status = 'out_of_stock';
                    }
                    $line['listing']->save();
                }

                $created[] = $order->load('buyer:id,name,phone,address,state,lga', 'farmer:id,name,phone,address,state,lga', 'items.produce');
            }

            return $created;
        });

        return response()->json([
            'message' => count($orders) > 1
                ? 'Orders created successfully (one per farmer).'
                : 'Order created successfully',
            'order' => $orders[0],
            'orders' => $orders,
        ], 201);
    }

    /**
     * Update order status (Farmer accepts/rejects)
     */
    public function updateStatus(Request $request, $id)
    {
        $order = Order::find($id);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        // Check authorization - only farmer or admin can update
        if ($order->farmer_id !== $request->user()->id && !$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => ['required', 'in:pending,accepted,confirmed,rejected,processing,shipped,delivered,completed,cancelled'],
        ]);

        if (in_array($validated['status'], ['cancelled', 'rejected'], true)
            && !in_array($order->status, ['cancelled', 'rejected'], true)) {
            DB::transaction(function () use ($order, $validated) {
                $this->restoreStock($order);
                $order->update($validated);
            });
        } else {
            $order->update($validated);
        }

        $order = $order->fresh()->load('buyer', 'farmer');

        Mail::to($order->buyer->email)->send(new OrderStatusNotification($order, 'buyer'));
        Mail::to($order->farmer->email)->send(new OrderStatusNotification($order, 'farmer'));
        event(new OrderStatusUpdated($order));

        return response()->json([
            'message' => 'Order status updated successfully',
            'order' => $order,
        ], 200);
    }

    /**
     * Cancel order
     */
    public function cancel(Request $request, $id)
    {
        $order = Order::find($id);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        // Check authorization
        if ($order->buyer_id !== $request->user()->id && !$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!in_array($order->status, ['pending', 'accepted', 'processing'], true)) {
            return response()->json(['message' => 'Cannot cancel this order'], 400);
        }

        DB::transaction(function () use ($order) {
            $this->restoreStock($order);
            $order->update(['status' => 'cancelled']);
        });

        $order = $order->fresh()->load('buyer', 'farmer');

        Mail::to($order->buyer->email)->send(new OrderStatusNotification($order, 'buyer'));
        Mail::to($order->farmer->email)->send(new OrderStatusNotification($order, 'farmer'));
        event(new OrderStatusUpdated($order));

        return response()->json([
            'message' => 'Order cancelled successfully',
            'order' => $order,
        ], 200);
    }

    /**
     * Get order statistics
     */
    public function getStats(Request $request)
    {
        $user = $request->user();
        $query = Order::query();

        if ($user->hasRole('farmer')) {
            $query->where('farmer_id', $user->id);
        } elseif ($user->hasRole('buyer')) {
            $query->where('buyer_id', $user->id);
        }

        $stats = [
            'total_orders' => $query->count(),
            'pending_orders' => (clone $query)->where('status', 'pending')->count(),
            'completed_orders' => (clone $query)->where('status', 'completed')->count(),
            'cancelled_orders' => (clone $query)->where('status', 'cancelled')->count(),
            'total_revenue' => (clone $query)->sum('total_price'),
        ];

        return response()->json($stats, 200);
    }

    /**
     * Return reserved stock to the listings when an order is cancelled.
     */
    private function restoreStock(Order $order): void
    {
        foreach ($order->items()->with('produce')->get() as $item) {
            $listing = $item->produce;

            if (!$listing) {
                continue;
            }

            $listing->quantity = round((float) $listing->quantity + (float) $item->quantity, 2);

            if ($listing->quantity > 0 && $listing->availability_status === 'out_of_stock') {
                $listing->availability_status = 'available';
            }

            $listing->save();
        }
    }
}
