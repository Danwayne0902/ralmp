<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EscrowRelease extends Model
{
    use HasFactory;

    protected $fillable = [
        'escrow_account_id',
        'order_id',
        'milestone',
        'label',
        'payee_id',
        'payee_role',
        'percentage',
        'amount',
        'status',
        'trigger',
        'released_by',
        'released_at',
        'note',
    ];

    protected $casts = [
        'percentage' => 'decimal:2',
        'amount' => 'decimal:2',
        'released_at' => 'datetime',
    ];

    public function account()
    {
        return $this->belongsTo(EscrowAccount::class, 'escrow_account_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function payee()
    {
        return $this->belongsTo(User::class, 'payee_id');
    }

    public function releasedBy()
    {
        return $this->belongsTo(User::class, 'released_by');
    }

    public function payout()
    {
        return $this->hasOne(Payout::class);
    }
}
