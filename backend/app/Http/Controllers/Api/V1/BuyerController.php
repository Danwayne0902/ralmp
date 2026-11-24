<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ProduceListing;
use App\Models\Order;
use App\Support\Search;
use Illuminate\Http\Request;

class BuyerController extends Controller
{
    /**
     * Search commodities
     */
    public function searchCommodities(Request $request)
    {
        $query = ProduceListing::where('availability_status', 'available');

        // Search by commodity name or description
        if ($request->filled('search')) {
            Search::apply($query, (string) $request->search, ['commodity_name', 'description', 'category']);
        }

        // Filter by category
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        // Filter by price range
        if ($request->filled('min_price') && $request->filled('max_price')) {
            $query->whereBetween('price', [$request->min_price, $request->max_price]);
        }

        // Filter by state
        if ($request->filled('state')) {
            $query->where('location', 'like', '%' . $request->state . '%');
        }

        // Filter by quantity
        if ($request->filled('min_quantity')) {
            $query->where('quantity', '>=', $request->min_quantity);
        }

        // Filter by farmer rating
        if ($request->filled('min_rating')) {
            $query->whereIn('user_id', function ($sub) use ($request) {
                $sub->select('farmer_id')
                    ->from('reviews')
                    ->where('is_approved', true)
                    ->groupBy('farmer_id')
                    ->havingRaw('AVG(rating) >= ?', [(float) $request->min_rating]);
            });
        }

        // Sort (whitelist the column to avoid SQL injection)
        $allowedSorts = ['price', 'created_at', 'harvest_date', 'commodity_name', 'quantity'];
        $sortBy = in_array($request->get('sort_by'), $allowedSorts, true)
            ? $request->get('sort_by')
            : 'created_at';
        $sortOrder = strtolower($request->get('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortOrder);

        $commodities = $query->paginate($request->get('per_page', 20));

        return response()->json($commodities, 200);
    }

    /**
     * Get commodity details with farmer info
     */
    public function getCommodityDetails($id)
    {
        $commodity = ProduceListing::with([
            'farmer:id,name,profile_image,state,lga,verification_status',
        ])->find($id);

        if (!$commodity) {
            return response()->json(['message' => 'Commodity not found'], 404);
        }

        return response()->json([
            'commodity' => $commodity,
        ], 200);
    }

    /**
     * Get buyer's saved suppliers
     */
    public function getSavedSuppliers(Request $request)
    {
        if (!$request->user()->hasRole('buyer')) {
            return response()->json(['message' => 'Only buyers can access this resource'], 403);
        }

        // This will be implemented with a supplier preference table
        $savedSuppliers = [];

        return response()->json([
            'suppliers' => $savedSuppliers,
        ], 200);
    }

    /**
     * Get buyer's order history
     */
    public function getOrderHistory(Request $request)
    {
        if (!$request->user()->hasRole('buyer')) {
            return response()->json(['message' => 'Only buyers can access this resource'], 403);
        }

        $orders = Order::where('buyer_id', $request->user()->id)
            ->with('farmer', 'produce', 'items', 'delivery')
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 15));

        return response()->json($orders, 200);
    }

    /**
     * Get buyer's reviews and ratings
     */
    public function getReviews(Request $request)
    {
        // Placeholder for reviews implementation
        return response()->json([
            'reviews' => [],
        ], 200);
    }

    /**
     * Get buyer analytics dashboard data
     */
    public function getDashboard(Request $request)
    {
        if (!$request->user()->hasRole('buyer')) {
            return response()->json(['message' => 'Only buyers can access this resource'], 403);
        }

        $userId = $request->user()->id;

        // Total orders
        $totalOrders = Order::where('buyer_id', $userId)->count();

        // Total spent
        $totalSpent = Order::where('buyer_id', $userId)
            ->where('payment_status', 'paid')
            ->whereNotIn('status', ['cancelled', 'rejected'])
            ->sum('total_price');

        // Pending deliveries
        $pendingDeliveries = Order::where('buyer_id', $userId)
            ->whereIn('status', ['pending', 'confirmed', 'processing', 'shipped'])
            ->count();

        // Recent orders
        $recentOrders = Order::where('buyer_id', $userId)
            ->with('farmer', 'produce')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        return response()->json([
            'total_orders' => $totalOrders,
            'total_spent' => $totalSpent,
            'pending_deliveries' => $pendingDeliveries,
            'recent_orders' => $recentOrders,
        ], 200);
    }
}
