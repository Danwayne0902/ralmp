<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ProduceListing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

class CartController extends Controller
{
    /**
     * Get cart items from cache.
     *
     * Only produce_id + quantity are stored. Names, prices and totals are
     * always re-read from the database so they cannot be tampered with.
     */
    public function getCart(Request $request)
    {
        $cart = $this->buildCart($request);

        return response()->json($cart, 200);
    }

    /**
     * Add item to cart
     */
    public function addItem(Request $request)
    {
        $validated = $request->validate([
            'produce_id' => ['required', 'integer', 'exists:produce_listings,id'],
            'quantity' => ['required', 'numeric', 'min:0.01'],
        ]);

        $listing = ProduceListing::find($validated['produce_id']);

        if (!$listing) {
            throw ValidationException::withMessages([
                'produce_id' => 'This produce is no longer available.',
            ]);
        }

        if ($listing->availability_status !== 'available') {
            throw ValidationException::withMessages([
                'produce_id' => "{$listing->commodity_name} is not available for purchase.",
            ]);
        }

        $key = $this->cartKey($request);
        $cart = $this->normalize(Cache::get($key, []));

        $newQuantity = round(($cart[$listing->id] ?? 0) + (float) $validated['quantity'], 2);

        if ($newQuantity > (float) $listing->quantity) {
            throw ValidationException::withMessages([
                'quantity' => "Only {$listing->quantity} {$listing->unit} of {$listing->commodity_name} remain.",
            ]);
        }

        $cart[$listing->id] = $newQuantity;
        Cache::put($key, $cart, now()->addDays(7));

        return response()->json([
            'message' => 'Item added to cart',
            ...$this->buildCart($request),
        ], 200);
    }

    /**
     * Update cart item quantity
     */
    public function updateItem(Request $request)
    {
        $validated = $request->validate([
            'produce_id' => ['required', 'integer', 'exists:produce_listings,id'],
            'quantity' => ['required', 'numeric', 'min:0'],
        ]);

        $key = $this->cartKey($request);
        $cart = $this->normalize(Cache::get($key, []));
        $produceId = (int) $validated['produce_id'];

        if (!array_key_exists($produceId, $cart)) {
            return response()->json(['message' => 'Item not found in cart'], 404);
        }

        if ((float) $validated['quantity'] <= 0) {
            unset($cart[$produceId]);
        } else {
            $listing = ProduceListing::find($produceId);

            if ($listing && (float) $validated['quantity'] > (float) $listing->quantity) {
                throw ValidationException::withMessages([
                    'quantity' => "Only {$listing->quantity} {$listing->unit} of {$listing->commodity_name} remain.",
                ]);
            }

            $cart[$produceId] = (float) $validated['quantity'];
        }

        Cache::put($key, $cart, now()->addDays(7));

        return response()->json([
            'message' => 'Cart updated',
            ...$this->buildCart($request),
        ], 200);
    }

    /**
     * Remove item from cart
     */
    public function removeItem(Request $request)
    {
        $validated = $request->validate([
            'produce_id' => ['required', 'integer', 'exists:produce_listings,id'],
        ]);

        $key = $this->cartKey($request);
        $cart = $this->normalize(Cache::get($key, []));
        $produceId = (int) $validated['produce_id'];

        if (!array_key_exists($produceId, $cart)) {
            return response()->json(['message' => 'Item not found in cart'], 404);
        }

        unset($cart[$produceId]);
        Cache::put($key, $cart, now()->addDays(7));

        return response()->json([
            'message' => 'Item removed from cart',
            ...$this->buildCart($request),
        ], 200);
    }

    /**
     * Clear cart
     */
    public function clearCart(Request $request)
    {
        Cache::forget($this->cartKey($request));

        return response()->json(['message' => 'Cart cleared', 'items' => [], 'total' => 0], 200);
    }

    private function cartKey(Request $request): string
    {
        return 'cart_' . $request->user()->id;
    }

    /**
     * Handle the legacy cart shape ({produce_id: {...}}) as well as the
     * current one ({produce_id: quantity}).
     */
    private function normalize(mixed $cart): array
    {
        if (!is_array($cart)) {
            return [];
        }

        $normalized = [];

        foreach ($cart as $produceId => $entry) {
            $quantity = is_array($entry) ? ($entry['quantity'] ?? 0) : $entry;

            if ((float) $quantity > 0) {
                $normalized[(int) $produceId] = (float) $quantity;
            }
        }

        return $normalized;
    }

    /**
     * Build the cart response from the database.
     */
    private function buildCart(Request $request): array
    {
        $key = $this->cartKey($request);
        $quantities = $this->normalize(Cache::get($key, []));

        if (empty($quantities)) {
            return [
                'items' => [],
                'total' => 0,
                'count' => 0,
                'delivery_fee' => (float) config('ramlp.delivery_fee', 2500),
            ];
        }

        $listings = ProduceListing::with('user:id,name')
            ->whereIn('id', array_keys($quantities))
            ->get()
            ->keyBy('id');

        $items = [];
        $total = 0.0;

        foreach ($quantities as $produceId => $quantity) {
            $listing = $listings->get($produceId);

            if (!$listing) {
                // Listing was removed; drop it from the stored cart.
                unset($quantities[$produceId]);
                continue;
            }

            $quantity = min($quantity, (float) $listing->quantity);
            $subtotal = round($quantity * (float) $listing->price, 2);

            $items[] = [
                'produce_id' => $listing->id,
                'farmer_id' => $listing->user_id,
                'farmer_name' => $listing->user?->name,
                'commodity_name' => $listing->commodity_name,
                'category' => $listing->category,
                'unit' => $listing->unit,
                'quantity' => $quantity,
                'available_quantity' => (float) $listing->quantity,
                'unit_price' => (float) $listing->price,
                'subtotal' => $subtotal,
                'availability_status' => $listing->availability_status,
            ];

            $total += $subtotal;
        }

        Cache::put($key, $quantities, now()->addDays(7));

        return [
            'items' => $items,
            'total' => round($total, 2),
            'count' => count($items),
            'delivery_fee' => (float) config('ramlp.delivery_fee', 2500),
        ];
    }
}
