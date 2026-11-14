<?php

use App\Models\Delivery;
use App\Models\Order;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('order.{orderId}', function ($user, $orderId) {
    return Order::where('id', $orderId)
        ->where(function ($query) use ($user) {
            $query->where('buyer_id', $user->id)
                ->orWhere('farmer_id', $user->id);
        })
        ->exists() || $user->hasRole('admin');
});

Broadcast::channel('delivery.{deliveryId}', function ($user, $deliveryId) {
    return Delivery::where('id', $deliveryId)
        ->where('logistics_provider_id', $user->id)
        ->exists() || $user->hasRole('admin');
});
