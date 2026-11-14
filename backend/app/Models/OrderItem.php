<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'produce_id',
        'quantity',
        'unit_price',
        'subtotal',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'quantity' => 'decimal:2',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function produce()
    {
        return $this->belongsTo(ProduceListing::class, 'produce_id');
    }
}
