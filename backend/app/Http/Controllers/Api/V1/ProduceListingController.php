<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ProduceListing;
use App\Models\Order;
use App\Models\Payout;
use App\Models\EscrowRelease;
use App\Support\ImageStore;
use App\Support\Search;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ProduceListingController extends Controller
{
    /**
     * Get all produce listings with filters
     */
    public function index(Request $request)
    {
        // Only expose the public farmer profile fields. Email, phone and
        // full address must never be returned by a public endpoint.
        $query = ProduceListing::with([
            'user:id,name,profile_image,state,lga,verification_status',
        ]);

        // Optional string filters: only apply them when a non-empty value is
        // present. `has()` is true for empty strings, which would otherwise
        // match nothing (e.g. availability_status=).
        if ($request->filled('search')) {
            Search::apply($query, (string) $request->search, ['commodity_name', 'description', 'category']);
        }

        // Filter by commodity name
        if ($request->filled('commodity_name')) {
            $query->where('commodity_name', 'like', '%' . $request->commodity_name . '%');
        }

        // Filter by category
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        // Filter by price range
        if ($request->filled('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }
        if ($request->filled('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        // Filter by location (state or LGA)
        if ($request->filled('state')) {
            $query->where('location', 'like', '%' . $request->state . '%');
        }
        if ($request->filled('lga')) {
            $query->where('location', 'like', '%' . $request->lga . '%');
        }

        // Filter by availability
        if ($request->filled('availability_status')) {
            $query->where('availability_status', $request->availability_status);
        }

        // Filter by user (farmer)
        if ($request->filled('farmer_id')) {
            $query->where('user_id', $request->farmer_id);
        }

        // Filter by harvest date range
        if ($request->filled('harvest_date_from')) {
            $query->where('harvest_date', '>=', $request->harvest_date_from);
        }
        if ($request->filled('harvest_date_to')) {
            $query->where('harvest_date', '<=', $request->harvest_date_to);
        }

        // Filter by fresh produce (harvested within last 7 days)
        if ($request->boolean('fresh_only')) {
            $query->where('harvest_date', '>=', now()->subDays(7));
        }

        // Sort by different criteria
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = strtolower($request->get('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowedSorts = ['price', 'created_at', 'harvest_date', 'commodity_name', 'quantity'];
        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy($sortBy, $sortOrder);
        }

        // Pagination
        $limit = $request->get('per_page', 15);
        $listings = $query->paginate($limit);

        return response()->json($listings, 200);
    }

    /**
     * Get single produce listing
     */
    public function show($id)
    {
        $listing = ProduceListing::with([
            'user:id,name,profile_image,state,lga,verification_status',
        ])->find($id);

        if (!$listing) {
            return response()->json(['message' => 'Produce listing not found'], 404);
        }

        return response()->json(['produce' => $listing], 200);
    }

    /**
     * Create new produce listing (Farmer only)
     */
    public function store(Request $request)
    {
        // Check if user is a farmer
        if (!$request->user()->hasRole('farmer')) {
            return response()->json(['message' => 'Only farmers can create produce listings'], 403);
        }

        $validated = $request->validate([
            'commodity_name' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'quantity' => 'required|numeric|min:0.01',
            'unit' => 'required|string|max:50',
            'price' => 'required|numeric|min:0.01',
            'location' => 'required|string',
            'harvest_date' => 'required|date',
            'expiry_date' => 'required|date|after:harvest_date',
            'description' => 'nullable|string',
            'images' => 'nullable|array',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $listing = new ProduceListing($validated);
        $listing->user_id = $request->user()->id;
        $listing->availability_status = 'available';

        // Handle multiple image uploads
        if ($request->hasFile('images')) {
            $images = [];
            foreach ($request->file('images') as $image) {
                $images[] = ImageStore::put($image, 'produce');
            }
            $listing->images = $images;
        }

        $listing->save();

        return response()->json([
            'message' => 'Produce listing created successfully',
            'produce' => $listing,
        ], 201);
    }

    /**
     * Update produce listing
     */
    public function update(Request $request, $id)
    {
        $listing = ProduceListing::find($id);

        if (!$listing) {
            return response()->json(['message' => 'Produce listing not found'], 404);
        }

        // Check authorization
        if ($listing->user_id !== $request->user()->id && !$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'commodity_name' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|required|string|max:255',
            'quantity' => 'sometimes|required|numeric|min:0.01',
            'unit' => 'sometimes|required|string|max:50',
            'price' => 'sometimes|required|numeric|min:0.01',
            'location' => 'sometimes|required|string',
            'harvest_date' => 'sometimes|required|date',
            'expiry_date' => 'sometimes|required|date',
            'description' => 'sometimes|nullable|string',
            'availability_status' => 'sometimes|in:available,unavailable,out_of_stock',
            'images' => 'sometimes|array',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $listing->update($validated);

        if ($request->hasFile('images')) {
            $previous = $listing->images ?: [];
            $images = [];
            foreach ($request->file('images') as $image) {
                $images[] = ImageStore::put($image, 'produce');
            }
            $listing->images = $images;
            $listing->save();

            // Remove the photos this upload replaced so storage does not grow
            // with every edit.
            foreach ($previous as $oldPath) {
                ImageStore::delete($oldPath);
            }
        }

        return response()->json([
            'message' => 'Produce listing updated successfully',
            'produce' => $listing,
        ], 200);
    }

    /**
     * Delete produce listing
     */
    public function destroy(Request $request, $id)
    {
        $listing = ProduceListing::find($id);

        if (!$listing) {
            return response()->json(['message' => 'Produce listing not found'], 404);
        }

        // Check authorization
        if ($listing->user_id !== $request->user()->id && !$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Delete the listing's photos from storage before removing the row.
        foreach ($listing->images ?: [] as $path) {
            ImageStore::delete($path);
        }

        $listing->delete();

        return response()->json(['message' => 'Produce listing deleted successfully'], 200);
    }

    /**
     * Get farmer's produce listings
     */
    public function getFarmerListings(Request $request)
    {
        if (!$request->user()->hasRole('farmer')) {
            return response()->json(['message' => 'Only farmers can access this resource'], 403);
        }

        $listings = ProduceListing::where('user_id', $request->user()->id)
            ->paginate($request->get('per_page', 15));

        return response()->json($listings, 200);
    }

    /**
     * Get farmer earnings
     */
    public function getFarmerEarnings(Request $request)
    {
        if (!$request->user()->hasRole('farmer')) {
            return response()->json(['message' => 'Only farmers can access this resource'], 403);
        }

        $userId = $request->user()->id;

        // Money that has actually been sent to the farmer.
        $totalEarnings = Payout::where('user_id', $userId)
            ->where('status', 'paid')
            ->sum('amount');

        // Money released from escrow but not sent yet.
        $pendingEarnings = Payout::where('user_id', $userId)
            ->where('status', 'pending')
            ->sum('amount');

        // Money still waiting on a proof or review. Held escrow is a gross
        // figure, so take the platform fee off it to match the net payouts.
        $heldGross = (float) EscrowRelease::where('payee_id', $userId)
            ->whereIn('status', ['pending', 'held'])
            ->sum('amount');
        $feeRate = app(\App\Services\EscrowService::class)->feeRate();
        $heldEarnings = round($heldGross - ($heldGross * $feeRate / 100), 2);

        // Orders count
        $totalOrders = Order::where('farmer_id', $userId)->count();
        $completedOrders = Order::where('farmer_id', $userId)
            ->whereIn('status', ['completed', 'delivered'])
            ->count();

        // Recent payouts
        $recentEarnings = Payout::where('user_id', $userId)
            ->with('order.produce', 'order.buyer', 'release')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'total_earnings' => $totalEarnings,
            'pending_earnings' => $pendingEarnings,
            'held_earnings' => $heldEarnings,
            'total_orders' => $totalOrders,
            'completed_orders' => $completedOrders,
            'recent_earnings' => $recentEarnings,
            'farmer_id' => $userId,
        ], 200);
    }
}
