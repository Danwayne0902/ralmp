<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ProduceListing;
use App\Models\Order;
use App\Models\Delivery;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * Get all users with role filtering
     */
    public function getUsers(Request $request)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = User::query();

        // Filter by role
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        // Filter by verification status
        if ($request->has('verified')) {
            $request->boolean('verified')
                ? $query->whereNotNull('email_verified_at')
                : $query->whereNull('email_verified_at');
        }

        $users = $query->paginate($request->get('per_page', 20));

        return response()->json($users, 200);
    }

    /**
     * Get user details
     */
    public function getUser($id, Request $request)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::with('roles')->find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        return response()->json(['user' => $user], 200);
    }

    /**
     * Update user role
     */
    public function updateUserRole(Request $request, $id)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $validated = $request->validate([
            'role' => 'required|in:admin,farmer,buyer,logistics_provider',
        ]);

        // Remove all roles and assign new one
        $user->syncRoles($validated['role']);
        $user->update(['role' => $validated['role']]);

        return response()->json([
            'message' => 'User role updated successfully',
            'user' => $user,
        ], 200);
    }

    /**
     * Suspend/Unsuspend user
     */
    public function toggleUserStatus(Request $request, $id)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Toggle the account's active flag.
        $user->update(['is_active' => !$user->is_active]);

        return response()->json([
            'message' => $user->is_active ? 'User activated' : 'User suspended',
            'user' => $user->fresh(),
        ], 200);
    }

    /**
     * Get all commodities for monitoring
     */
    public function getCommodities(Request $request)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $commodities = ProduceListing::with('farmer')
            ->paginate($request->get('per_page', 20));

        return response()->json($commodities, 200);
    }

    /**
     * Remove/Restrict commodity
     */
    public function removeCommodity(Request $request, $id)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $commodity = ProduceListing::find($id);

        if (!$commodity) {
            return response()->json(['message' => 'Commodity not found'], 404);
        }

        $commodity->delete();

        return response()->json(['message' => 'Commodity removed successfully'], 200);
    }

    /**
     * Get all orders for monitoring
     */
    public function getOrders(Request $request)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Order::with('buyer', 'farmer', 'produce');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $orders = $query->paginate($request->get('per_page', 20));

        return response()->json($orders, 200);
    }

    /**
     * Get analytics dashboard
     */
    public function getAnalytics(Request $request)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // User statistics
        $totalUsers = User::count();
        $usersByRole = User::selectRaw('role, COUNT(*) as count')
            ->groupBy('role')
            ->get()
            ->pluck('count', 'role')
            ->toArray();

        // Order statistics
        $totalOrders = Order::count();
        $ordersByStatus = Order::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status')
            ->toArray();

        // Revenue
        $totalRevenue = Order::where('payment_status', 'paid')
            ->whereIn('status', ['completed', 'delivered'])
            ->sum('total_price');

        // Listings
        $totalListings = ProduceListing::where('availability_status', 'available')->count();

        // Top commodities by revenue
        $topCommodities = ProduceListing::select('commodity_name', 'category', 'unit')
            ->withCount(['orders'])
            ->orderByDesc('orders_count')
            ->limit(10)
            ->get()
            ->map(function($commodity) {
                return [
                    'commodity_name' => $commodity->commodity_name,
                    'category' => $commodity->category,
                    'unit' => $commodity->unit,
                    'total_orders' => $commodity->orders_count,
                    'total_revenue' => $commodity->orders()->where('payment_status', 'paid')
                                     ->whereIn('status', ['completed', 'delivered'])->sum('total_price'),
                    'total_quantity' => $commodity->orders()->sum('quantity')
                ];
            });

        // Top locations by listings
        $topLocations = ProduceListing::selectRaw('location, COUNT(*) as total_listings')
            ->groupBy('location')
            ->orderByDesc('total_listings')
            ->limit(10)
            ->get()
            ->map(function($location) {
                $ordersCount = ProduceListing::where('location', $location->location)
                    ->join('orders', 'produce_listings.id', '=', 'orders.produce_id')
                    ->count();
                
                return [
                    'location' => $location->location,
                    'total_listings' => $location->total_listings,
                    'total_orders' => $ordersCount
                ];
            });

        // Recent activity
        $recentActivity = [];
        
        // Recent orders
        $recentOrders = Order::with('buyer', 'farmer')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();
        
        foreach ($recentOrders as $order) {
            $recentActivity[] = [
                'id' => 'order_' . $order->id,
                'type' => 'order',
                'description' => "New order #{$order->id} by {$order->buyer->name}",
                'created_at' => $order->created_at,
                'icon' => '📦'
            ];
        }
        
        // Recent listings
        $recentListings = ProduceListing::with('farmer')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();
        
        foreach ($recentListings as $listing) {
            $recentActivity[] = [
                'id' => 'listing_' . $listing->id,
                'type' => 'listing',
                'description' => "New listing: {$listing->commodity_name} by {$listing->farmer->name}",
                'created_at' => $listing->created_at,
                'icon' => '🌾'
            ];
        }
        
        // Sort by created_at and take top 10
        collect($recentActivity)->sortByDesc('created_at')->take(10)->values();

        return response()->json([
            'total_users' => $totalUsers,
            'total_farmers' => $usersByRole['farmer'] ?? 0,
            'total_buyers' => $usersByRole['buyer'] ?? 0,
            'total_logistics' => $usersByRole['logistics_provider'] ?? 0,
            'total_listings' => $totalListings,
            'total_orders' => $totalOrders,
            'total_revenue' => $totalRevenue,
            'users_by_role' => $usersByRole,
            'orders_by_status' => $ordersByStatus,
            'top_commodities' => $topCommodities,
            'top_locations' => $topLocations,
            'recent_activity' => $recentActivity,
        ], 200);
    }

    /**
     * Get chart data for dashboards
     */
    public function chartData(Request $request)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $period = $request->get('period', '30');
        $startDate = now()->subDays($period);

        // Orders over time
        $ordersOverTime = Order::selectRaw('DATE(created_at) as date, count(*) as count')
            ->where('created_at', '>=', $startDate)
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Revenue over time
        $revenueOverTime = Order::selectRaw('DATE(created_at) as date, sum(total_price) as total')
            ->where('created_at', '>=', $startDate)
            ->where('payment_status', 'paid')
            ->whereIn('status', ['completed', 'delivered'])
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Top commodities
        $topCommodities = ProduceListing::selectRaw('commodity_name, count(*) as count')
            ->groupBy('commodity_name')
            ->orderByDesc('count')
            ->limit(8)
            ->get();

        return response()->json([
            'orders_over_time' => $ordersOverTime,
            'revenue_over_time' => $revenueOverTime,
            'top_commodities' => $topCommodities,
        ], 200);
    }

    /**
     * Get market insights
     */
    public function getMarketInsights(Request $request)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Get top commodities by order count
        $topCommodities = ProduceListing::withCount('orders')
            ->orderByDesc('orders_count')
            ->limit(10)
            ->get();

        // Get top performing farmers
        $topFarmers = User::where('role', 'farmer')
            ->withCount('listings')
            ->orderByDesc('listings_count')
            ->limit(10)
            ->get();

        return response()->json([
            'top_commodities' => $topCommodities,
            'top_farmers' => $topFarmers,
        ], 200);
    }

    /**
     * Get system logs
     */
    public function getSystemLogs(Request $request)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Placeholder for system logs
        return response()->json([
            'logs' => [],
        ], 200);
    }

    /**
     * Get dashboard overview
     */
    public function getDashboard(Request $request)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return $this->getAnalytics($request);
    }
}
