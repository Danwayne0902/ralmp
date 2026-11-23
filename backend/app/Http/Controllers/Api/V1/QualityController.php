<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\QualityInspection;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class QualityController extends Controller
{
    /**
     * The checks already signed off, newest first. The checker screen uses
     * this to keep an order showing its saved result after a reload.
     */
    public function index(Request $request)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $inspections = QualityInspection::with('inspector:id,name')
            ->orderByDesc('signed_at')
            ->get();

        return response()->json(['inspections' => $inspections], 200);
    }

    public function show(Request $request, Order $order)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'inspection' => $order->inspection()->with('inspector:id,name')->first(),
        ], 200);
    }

    /**
     * Record the checker's readings and verdict against the order. Signing
     * again replaces the previous result, so there is exactly one per order.
     * This does not move money: escrow is released from the payments desk.
     */
    public function store(Request $request, Order $order)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'verdict' => ['required', Rule::in(['release', 'conditional', 'freeze'])],
            'readings' => ['nullable', 'array'],
            'readings.moisture' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'readings.aflatoxin' => ['nullable', 'numeric', 'min:0'],
            'readings.chaff' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'readings.broken' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'origin_weight' => ['nullable', 'numeric', 'min:0'],
            'destination_weight' => ['nullable', 'numeric', 'min:0'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $origin = isset($validated['origin_weight']) ? (float) $validated['origin_weight'] : null;
        $destination = isset($validated['destination_weight']) ? (float) $validated['destination_weight'] : null;
        $variance = ($origin !== null && $origin > 0 && $destination !== null)
            ? round((($destination - $origin) / $origin) * 100, 2)
            : null;

        $readings = collect($validated['readings'] ?? [])
            ->filter(fn ($value) => $value !== null && $value !== '')
            ->map(fn ($value) => (float) $value)
            ->all();

        $inspection = QualityInspection::updateOrCreate(
            ['order_id' => $order->id],
            [
                'inspector_id' => $request->user()->id,
                'verdict' => $validated['verdict'],
                'readings' => $readings ?: null,
                'origin_weight' => $origin,
                'destination_weight' => $destination,
                'weight_variance' => $variance,
                'note' => $validated['note'] ?? null,
                'signed_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'Your check was saved on the order.',
            'inspection' => $inspection->fresh('inspector:id,name'),
        ], 200);
    }
}
