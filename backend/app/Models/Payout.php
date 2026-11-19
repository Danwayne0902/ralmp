<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payout extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'user_id',
        'escrow_release_id',
        'amount',
        'status',
        'reference',
        'transfer_code',
        'transfer_status',
        'transfer_reference',
        'bank_name',
        'account_number',
        'account_name',
        'failure_reason',
        'note',
        'paid_at',
        'sent_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
        'sent_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function release()
    {
        return $this->belongsTo(EscrowRelease::class, 'escrow_release_id');
    }

    /**
     * The platform fee taken from this payout. amount on the payout is already
     * net; the fee row keeps the gross base and the rate we charged.
     */
    public function platformFee()
    {
        return $this->hasOne(PlatformFee::class);
    }
}
