<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\DeliveryStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\DeliveryTracking;
use App\Services\EscrowService;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LogisticsController extends Controller
{
    /**
     * Get all deliveries (Logistics provider)
     */
    public function getDeliveries(Request $request)
    {
        if (!$request->user()->hasRole('logistics_provider')) {
            return response()->json(['message' => 'Only logistics providers can access this resource'], 403);
        }

        $deliveries = Delivery::where('logistics_provider_id', $request->user()->id)
            ->paginate($request->get('per_page', 15));

        return response()->json($deliveries, 200);
    }

    /**
     * Get delivery details
     */
    public function getDelivery(Request $request, $id)
    {
        $delivery = Delivery::with('order', 'trackingHistory')->find($id);

        if (!$delivery) {
            return response()->json(['message' => 'Delivery not found'], 404);
        }

        $this->authorizeDelivery($request, $delivery, false);

        return response()->json(['delivery' => $delivery], 200);
    }

    /**
     * Assign delivery to logistics provider
     */
    public function assignDelivery(Request $request, $id)
    {
        // Check if user is logistics provider
        if (!$request->user()->hasRole('logistics_provider')) {
            return response()->json(['message' => 'Only logistics providers can accept deliveries'], 403);
        }

        $delivery = Delivery::find($id);

        if (!$delivery) {
            return response()->json(['message' => 'Delivery not found'], 404);
        }

        if ($delivery->status !== 'pending') {
            return response()->json(['message' => 'Delivery already assigned'], 400);
        }

        $delivery->update([
            'logistics_provider_id' => $request->user()->id,
            'status' => 'assigned',
        ]);

        event(new DeliveryStatusUpdated($delivery->fresh()));

        return response()->json([
            'message' => 'Delivery assigned successfully',
            'delivery' => $delivery,
        ], 200);
    }

    /**
     * Update delivery status
     */
    public function updateStatus(Request $request, $id)
    {
        $delivery = Delivery::find($id);

        if (!$delivery) {
            return response()->json(['message' => 'Delivery not found'], 404);
        }

        // Check authorization
        if ($delivery->logistics_provider_id !== $request->user()->id && !$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,assigned,picked_up,in_transit,delivered,cancelled',
        ]);

        $previous = $delivery->status;
        $delivery->update($validated);

        $order = $delivery->order;
        $escrow = app(EscrowService::class);

        if ($order && $validated['status'] === 'picked_up' && $previous !== 'picked_up') {
            $escrow->syncDeliveryPayee($order);
            $escrow->releaseMilestone($order, 'pickup', $request->user(), 'Transporter marked the goods as picked up');
        }

        if ($order && $validated['status'] === 'delivered' && $order->status !== 'completed') {
            $order->update(['status' => 'delivered']);
        }

        event(new DeliveryStatusUpdated($delivery->fresh()));

        return response()->json([
            'message' => 'Delivery status updated successfully',
            'delivery' => $delivery,
        ], 200);
    }

    /**
     * Track delivery
     */
    public function trackDelivery(Request $request, $id)
    {
        $delivery = Delivery::find($id);

        if (!$delivery) {
            return response()->json(['message' => 'Delivery not found'], 404);
        }

        $this->authorizeDelivery($request, $delivery, false);

        return response()->json([
            'delivery' => $delivery,
            'status' => $delivery->status,
            'estimated_delivery_time' => $delivery->estimated_delivery_time,
        ], 200);
    }

    /**
     * Get delivery cost estimate
     */
    public function estimateCost(Request $request)
    {
        $validated = $request->validate([
            'distance' => 'required|numeric|min:0.1',
            'weight' => 'required|numeric|min:0.1',
            'delivery_type' => 'required|in:standard,express',
        ]);

        // Simple cost calculation logic
        $baseCost = 500; // Base cost in Naira
        $costPerKm = 50;
        $costPerKg = 100;
        $expressMultiplier = $validated['delivery_type'] === 'express' ? 1.5 : 1;

        $estimatedCost = ($baseCost + ($validated['distance'] * $costPerKm) + ($validated['weight'] * $costPerKg)) * $expressMultiplier;

        return response()->json([
            'estimated_cost' => round($estimatedCost, 2),
            'breakdown' => [
                'base_cost' => $baseCost,
                'distance_cost' => $validated['distance'] * $costPerKm,
                'weight_cost' => $validated['weight'] * $costPerKg,
                'express_multiplier' => $expressMultiplier,
            ],
        ], 200);
    }

    /**
     * Schedule pickup
     */
    public function schedulePickup(Request $request)
    {
        $validated = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
            'pickup_date' => ['required', 'date', 'after:now'],
            'pickup_time_slot' => ['required', 'string', 'max:50'],
        ]);

        $order = Order::with('buyer', 'farmer')->findOrFail($validated['order_id']);

        if ($order->buyer_id !== $request->user()->id && !$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($order->delivery()->exists()) {
            return response()->json([
                'message' => 'A delivery has already been scheduled for this order',
                'delivery' => $order->delivery()->first(),
            ], 409);
        }

        $buyer = $order->buyer;
        $farmer = $order->farmer;

        $delivery = Delivery::create([
            'order_id' => $order->id,
            'logistics_provider_id' => null,
            'status' => 'pending',
            'pickup_location' => $this->addressFor($farmer) ?: 'Farmer location',
            'delivery_location' => $this->addressFor($buyer) ?: 'Buyer location',
            'pickup_date' => $validated['pickup_date'],
            'pickup_time_slot' => $validated['pickup_time_slot'],
            'tracking_number' => 'TRK' . Str::upper(Str::random(10)),
        ]);

        return response()->json([
            'message' => 'Pickup scheduled successfully',
            'delivery' => $delivery,
        ], 201);
    }

    /**
     * Get logistics provider dashboard
     */
    public function getDashboard(Request $request)
    {
        if (!$request->user()->hasRole('logistics_provider')) {
            return response()->json(['message' => 'Only logistics providers can access this resource'], 403);
        }

        $activeDeliveries = Delivery::where('logistics_provider_id', $request->user()->id)
            ->whereNotIn('status', ['delivered', 'cancelled'])
            ->count();

        $completedDeliveries = Delivery::where('logistics_provider_id', $request->user()->id)
            ->where('status', 'delivered')
            ->count();

        return response()->json([
            'active_deliveries' => $activeDeliveries,
            'completed_deliveries' => $completedDeliveries,
            'revenue' => 0, // Placeholder
        ], 200);
    }

    /**
     * Add tracking update
     */
    public function addTrackingUpdate(Request $request, $deliveryId)
    {
        $validated = $request->validate([
            'status' => ['required', 'in:pending,assigned,picked_up,in_transit,delivered,cancelled'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $delivery = Delivery::findOrFail($deliveryId);

        $this->authorizeDelivery($request, $delivery, true);

        // Create tracking entry
        $tracking = DeliveryTracking::create([
            'delivery_id' => $delivery->id,
            'status' => $validated['status'],
            'location' => $validated['location'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'timestamp' => now(),
        ]);

        // Update delivery status
        $delivery->update([
            'status' => $validated['status']
        ]);

        $order = $delivery->order;
        $escrow = app(EscrowService::class);

        if ($order && $validated['status'] === 'picked_up') {
            $escrow->syncDeliveryPayee($order);
            $escrow->releaseMilestone($order, 'pickup', $request->user(), 'Transporter marked the goods as picked up');
        }

        if ($order && $validated['status'] === 'delivered' && $order->status !== 'completed') {
            $order->update(['status' => 'delivered']);
        }

        event(new DeliveryStatusUpdated($delivery->fresh()));

        return response()->json([
            'message' => 'Tracking update added',
            'tracking' => $tracking
        ], 201);
    }

    /**
     * Get tracking history for a delivery
     */
    public function getTrackingHistory(Request $request, $deliveryId)
    {
        $delivery = Delivery::with('trackingHistory')->findOrFail($deliveryId);

        $this->authorizeDelivery($request, $delivery, false);

        return response()->json([
            'delivery' => $delivery,
            'tracking_history' => $delivery->trackingHistory
        ], 200);
    }

    /**
     * Allow admins, the assigned provider, or the order's buyer/farmer to
     * read a delivery. Only admins and the assigned provider may write.
     */
    private function authorizeDelivery(Request $request, Delivery $delivery, bool $write): void
    {
        $user = $request->user();

        if ($user->hasRole('admin')) {
            return;
        }

        if ($write) {
            if ($delivery->logistics_provider_id !== $user->id) {
                abort(403, 'Unauthorized');
            }

            return;
        }

        if ($delivery->logistics_provider_id === $user->id) {
            return;
        }

        $order = $delivery->order()->first();

        if ($order && in_array($user->id, [$order->buyer_id, $order->farmer_id], true)) {
            return;
        }

        abort(403, 'Unauthorized');
    }

    private function addressFor(?\App\Models\User $user): ?string
    {
        if (!$user) {
            return null;
        }

        $parts = array_filter([$user->address, $user->lga, $user->state]);

        return $parts ? implode(', ', $parts) : null;
    }
}
