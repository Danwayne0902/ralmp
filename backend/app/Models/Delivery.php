<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Delivery extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'order_id',
        'logistics_provider_id',
        'status',
        'pickup_location',
        'delivery_location',
        'pickup_date',
        'pickup_time_slot',
        'estimated_delivery_time',
        'actual_delivery_time',
        'delivery_cost',
        'driver_name',
        'driver_phone',
        'vehicle_info',
        'tracking_number',
    ];

    protected $casts = [
        'pickup_date' => 'date',
        'estimated_delivery_time' => 'datetime',
        'actual_delivery_time' => 'datetime',
        'delivery_cost' => 'decimal:2',
    ];

    /**
     * Get the order for this delivery
     */
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the logistics provider for this delivery
     */
    public function logisticsProvider()
    {
        return $this->belongsTo(User::class, 'logistics_provider_id');
    }

    /**
     * Get tracking history for this delivery
     */
    public function trackingHistory()
    {
        return $this->hasMany(DeliveryTracking::class)->orderBy('timestamp', 'asc');
    }
}
