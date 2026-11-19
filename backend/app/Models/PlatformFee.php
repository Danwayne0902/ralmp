<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlatformFee extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'escrow_release_id',
        'payee_id',
        'payout_id',
        'kind',
        'base_amount',
        'rate',
        'amount',
    ];

    protected $casts = [
        'base_amount' => 'decimal:2',
        'rate' => 'decimal:2',
        'amount' => 'decimal:2',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function release()
    {
        return $this->belongsTo(EscrowRelease::class, 'escrow_release_id');
    }

    public function payee()
    {
        return $this->belongsTo(User::class, 'payee_id');
    }

    public function payout()
    {
        return $this->belongsTo(Payout::class);
    }
}
