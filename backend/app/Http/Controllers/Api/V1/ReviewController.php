<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Order;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /**
     * Create a review
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'farmer_id' => 'required|exists:users,id',
            'produce_id' => 'nullable|exists:produce_listings,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        // Check if user already reviewed this order
        $existingReview = Review::where('user_id', $request->user()->id)
            ->where('order_id', $validated['order_id'])
            ->first();

        if ($existingReview) {
            return response()->json([
                'message' => 'You have already reviewed this order'
            ], 400);
        }

        // Verify order belongs to user and derive the farmer from it so a
        // buyer cannot attach a review to an unrelated farmer.
        $order = Order::findOrFail($validated['order_id']);

        if ($order->buyer_id !== $request->user()->id) {
            return response()->json([
                'message' => 'You can only review your own orders'
            ], 403);
        }

        if ((int) $order->farmer_id !== (int) $validated['farmer_id']) {
            return response()->json([
                'message' => 'The farmer does not match this order'
            ], 422);
        }

        $review = Review::create([
            'user_id' => $request->user()->id,
            'farmer_id' => $order->farmer_id,
            'order_id' => $validated['order_id'],
            'produce_id' => $validated['produce_id'] ?? null,
            'rating' => $validated['rating'],
            'comment' => $validated['comment'],
            'is_approved' => false,
        ]);

        return response()->json([
            'message' => 'Review submitted successfully and is awaiting moderation',
            'review' => $review->load('user', 'farmer')
        ], 201);
    }

    /**
     * Get reviews for a farmer
     */
    public function getFarmerReviews($farmerId)
    {
        $reviews = Review::where('farmer_id', $farmerId)
            ->where('is_approved', true)
            ->with([
                'user:id,name,profile_image',
                'produce',
            ])
            ->orderByDesc('created_at')
            ->get();

        $averageRating = $reviews->avg('rating') ?? 0;
        $totalReviews = $reviews->count();

        return response()->json([
            'reviews' => $reviews,
            'average_rating' => round($averageRating, 1),
            'total_reviews' => $totalReviews,
            'rating_breakdown' => [
                '5' => $reviews->where('rating', 5)->count(),
                '4' => $reviews->where('rating', 4)->count(),
                '3' => $reviews->where('rating', 3)->count(),
                '2' => $reviews->where('rating', 2)->count(),
                '1' => $reviews->where('rating', 1)->count(),
            ]
        ], 200);
    }

    /**
     * Get user's reviews
     */
    public function getUserReviews(Request $request)
    {
        $reviews = Review::where('user_id', $request->user()->id)
            ->with('farmer', 'order', 'produce')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'reviews' => $reviews
        ], 200);
    }

    /**
     * Update a review
     */
    public function update(Request $request, $id)
    {
        $review = Review::findOrFail($id);

        if ($review->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        $validated = $request->validate([
            'rating' => 'sometimes|required|integer|min:1|max:5',
            'comment' => 'sometimes|required|string|max:1000',
        ]);

        $review->update([
            ...$validated,
            // Edited reviews go back into the moderation queue.
            'is_approved' => false,
        ]);

        return response()->json([
            'message' => 'Review updated successfully',
            'review' => $review->load('user', 'farmer')
        ], 200);
    }

    /**
     * Delete a review
     */
    public function destroy(Request $request, $id)
    {
        $review = Review::findOrFail($id);

        if ($review->user_id !== $request->user()->id && !$request->user()->hasRole('admin')) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        $review->delete();

        return response()->json([
            'message' => 'Review deleted successfully'
        ], 200);
    }

    /**
     * Get all reviews (Admin)
     */
    public function getAllReviews(Request $request)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $reviews = Review::with('user', 'farmer', 'order', 'produce')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'reviews' => $reviews
        ], 200);
    }

    /**
     * Toggle review approval (Admin)
     */
    public function toggleApproval(Request $request, $id)
    {
        if (!$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $review = Review::findOrFail($id);
        $review->update(['is_approved' => !$review->is_approved]);

        return response()->json([
            'message' => 'Review approval status updated',
            'review' => $review
        ], 200);
    }
}
