<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EscrowAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'buyer_id',
        'farmer_id',
        'amount',
        'farmer_amount',
        'delivery_amount',
        'released_amount',
        'status',
        'funded_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'farmer_amount' => 'decimal:2',
        'delivery_amount' => 'decimal:2',
        'released_amount' => 'decimal:2',
        'funded_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function buyer()
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function farmer()
    {
        return $this->belongsTo(User::class, 'farmer_id');
    }

    public function releases()
    {
        return $this->hasMany(EscrowRelease::class)->orderBy('id');
    }
}
