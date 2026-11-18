<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\ProduceListingController;
use App\Http\Controllers\Api\V1\BuyerController;
use App\Http\Controllers\Api\V1\LogisticsController;
use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\ReviewController;
use App\Http\Controllers\Api\V1\MessageController;
use App\Http\Controllers\Api\V1\EscrowController;
use App\Http\Controllers\Api\V1\PayoutController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::prefix('v1')->group(function () {
    // Public Authentication Routes
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/verify-email', [AuthController::class, 'verifyEmail']);
    Route::post('/auth/resend-verification-email', [AuthController::class, 'resendVerificationEmail']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

    // Public Produce Listings (searchable)
    Route::get('/produce-listings', [ProduceListingController::class, 'index']);
    Route::get('/produce-listings/{id}', [ProduceListingController::class, 'show']);

    // Public Buyer Search
    Route::get('/commodities/search', [BuyerController::class, 'searchCommodities']);
    Route::get('/commodities/{id}', [BuyerController::class, 'getCommodityDetails']);

    // Public Logistics
    Route::get('/logistics/estimate-cost', [LogisticsController::class, 'estimateCost']);

    // Paystack webhook (unauthenticated, verified by signature)
    Route::post('/payment/webhook', [PaymentController::class, 'webhook']);

    // Protected Routes
    Route::middleware('auth:sanctum')->group(function () {
        // Auth Routes
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'getCurrentUser']);

        // Profile Routes
        Route::get('/profile', [ProfileController::class, 'show']);
        Route::put('/profile', [ProfileController::class, 'update']);
        Route::post('/profile/change-password', [ProfileController::class, 'changePassword']);

        // Farmer Routes
        Route::post('/produce-listings', [ProduceListingController::class, 'store']);
        Route::put('/produce-listings/{id}', [ProduceListingController::class, 'update']);
        Route::delete('/produce-listings/{id}', [ProduceListingController::class, 'destroy']);
        Route::get('/farmer/listings', [ProduceListingController::class, 'getFarmerListings']);
        Route::get('/farmer/earnings', [ProduceListingController::class, 'getFarmerEarnings']);

        // Buyer Routes
        Route::get('/buyer/saved-suppliers', [BuyerController::class, 'getSavedSuppliers']);
        Route::get('/buyer/orders', [BuyerController::class, 'getOrderHistory']);
        Route::get('/buyer/reviews', [BuyerController::class, 'getReviews']);
        Route::get('/buyer/dashboard', [BuyerController::class, 'getDashboard']);

        // Logistics Routes
        Route::get('/logistics/deliveries', [LogisticsController::class, 'getDeliveries']);
        Route::get('/logistics/deliveries/{id}', [LogisticsController::class, 'getDelivery']);
        Route::post('/logistics/deliveries/{id}/assign', [LogisticsController::class, 'assignDelivery']);
        Route::put('/logistics/deliveries/{id}/status', [LogisticsController::class, 'updateStatus']);
        Route::get('/logistics/track/{id}', [LogisticsController::class, 'trackDelivery']);
        Route::post('/logistics/schedule-pickup', [LogisticsController::class, 'schedulePickup']);
        Route::get('/logistics/dashboard', [LogisticsController::class, 'getDashboard']);
        Route::post('/logistics/deliveries/{id}/tracking', [LogisticsController::class, 'addTrackingUpdate']);
        Route::get('/logistics/deliveries/{id}/tracking', [LogisticsController::class, 'getTrackingHistory']);

        // Order Routes
        Route::get('/orders', [OrderController::class, 'index']);
        // Keep literal routes above the {id} wildcard so they are not shadowed.
        Route::get('/orders/stats', [OrderController::class, 'getStats']);
        Route::get('/orders/{id}', [OrderController::class, 'show']);
        Route::post('/orders', [OrderController::class, 'store']);
        Route::put('/orders/{id}/status', [OrderController::class, 'updateStatus']);
        Route::post('/orders/{id}/cancel', [OrderController::class, 'cancel']);
        Route::post('/orders/{id}/confirm-delivery', [OrderController::class, 'confirmDelivery']);

        // Escrow and payouts
        Route::get('/escrow', [EscrowController::class, 'index']);
        Route::get('/escrow/orders/{orderId}', [EscrowController::class, 'show']);
        Route::get('/payouts', [PayoutController::class, 'index']);

        // Cart Routes
        Route::get('/cart', [CartController::class, 'getCart']);
        Route::post('/cart/add', [CartController::class, 'addItem']);
        Route::put('/cart/update', [CartController::class, 'updateItem']);
        Route::delete('/cart/remove', [CartController::class, 'removeItem']);
        Route::delete('/cart/clear', [CartController::class, 'clearCart']);

        // Payment Routes
        Route::post('/payment/initialize', [PaymentController::class, 'initialize']);
        Route::post('/payment/verify', [PaymentController::class, 'verify']);
        Route::get('/payment/history', [PaymentController::class, 'history']);

        // Review Routes
        Route::post('/reviews', [ReviewController::class, 'store']);
        Route::get('/reviews', [ReviewController::class, 'getUserReviews']);
        Route::get('/reviews/farmer/{farmerId}', [ReviewController::class, 'getFarmerReviews']);
        Route::put('/reviews/{id}', [ReviewController::class, 'update']);
        Route::delete('/reviews/{id}', [ReviewController::class, 'destroy']);

        // Messaging Routes
        Route::get('/messages/conversations', [MessageController::class, 'getConversations']);
        Route::get('/messages/unread-count', [MessageController::class, 'getUnreadCount']);
        Route::get('/messages/{userId}', [MessageController::class, 'getConversation']);
        Route::post('/messages', [MessageController::class, 'sendMessage']);
        Route::put('/messages/{userId}/read', [MessageController::class, 'markAsRead']);
        Route::delete('/messages/{id}', [MessageController::class, 'deleteMessage']);

        // Admin Routes
        Route::prefix('admin')->group(function () {
            Route::get('/users', [AdminController::class, 'getUsers']);
            Route::get('/users/{id}', [AdminController::class, 'getUser']);
            Route::put('/users/{id}/role', [AdminController::class, 'updateUserRole']);
            Route::put('/users/{id}/status', [AdminController::class, 'toggleUserStatus']);
            
            Route::get('/commodities', [AdminController::class, 'getCommodities']);
            Route::delete('/commodities/{id}', [AdminController::class, 'removeCommodity']);
            
            Route::get('/orders', [AdminController::class, 'getOrders']);

            // Escrow release controls
            Route::get('/escrow/pending', [EscrowController::class, 'pending']);
            Route::post('/escrow/releases/{id}/release', [EscrowController::class, 'release']);
            Route::post('/escrow/releases/{id}/hold', [EscrowController::class, 'hold']);
            Route::post('/payouts/{id}/paid', [PayoutController::class, 'markPaid']);
            
            Route::get('/dashboard', [AdminController::class, 'getDashboard']);
            Route::get('/analytics', [AdminController::class, 'getAnalytics']);
            Route::get('/chart-data', [AdminController::class, 'chartData']);
            Route::get('/market-insights', [AdminController::class, 'getMarketInsights']);
            Route::get('/system-logs', [AdminController::class, 'getSystemLogs']);
            
            // Review Management
            Route::get('/reviews', [ReviewController::class, 'getAllReviews']);
            Route::put('/reviews/{id}/approval', [ReviewController::class, 'toggleApproval']);
        });
    });
});
