<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'buyer_id',
        'farmer_id',
        'produce_id',
        'quantity',
        'unit_price',
        'subtotal',
        'delivery_fee',
        'total_price',
        'status',
        'order_date',
        'delivery_date',
        'notes',
        'payment_reference',
        'payment_status',
        'paid_at',
    ];

    protected $casts = [
        'order_date' => 'datetime',
        'delivery_date' => 'datetime',
        'paid_at' => 'datetime',
        'total_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'quantity' => 'decimal:2',
    ];

    /**
     * Get the buyer for this order
     */
    public function buyer()
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    /**
     * Get the farmer for this order
     */
    public function farmer()
    {
        return $this->belongsTo(User::class, 'farmer_id');
    }

    /**
     * Get the produce listing for this order
     */
    public function produce()
    {
        return $this->belongsTo(ProduceListing::class, 'produce_id');
    }

    /**
     * Get the delivery for this order
     */
    public function delivery()
    {
        return $this->hasOne(Delivery::class);
    }

    /**
     * Get order items
     */
    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}
