<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A delivery price offered by the buyer or a driver for one order.
 *
 * Only one offer per order can be accepted. Accepting one locks the price and
 * assigns that driver, and the buyer then pays it into escrow.
 */
class DeliveryOffer extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'buyer_id',
        'driver_id',
        'proposed_by',
        'amount',
        'status',
        'note',
        'accepted_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'accepted_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function buyer()
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function driver()
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function proposer()
    {
        return $this->belongsTo(User::class, 'proposed_by');
    }

    public function isOpen(): bool
    {
        return $this->status === 'proposed';
    }

    public function scopeOpen($query)
    {
        return $query->where('status', 'proposed');
    }
}
