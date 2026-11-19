<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'kind',
        'delivery_id',
        'user_id',
        'provider',
        'reference',
        'amount',
        'currency',
        'status',
        'gateway_status',
        'gateway_response',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'integer',
        'gateway_response' => 'array',
        'paid_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function delivery()
    {
        return $this->belongsTo(Delivery::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
