<?php

namespace App\Models;

use App\Services\EscrowService;
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

    protected $appends = ['fee_percent', 'net_amount'];

    /**
     * The platform fee rate applied when this part is paid out.
     */
    public function getFeePercentAttribute(): float
    {
        return app(EscrowService::class)->feeRate();
    }

    /**
     * What the payee actually receives. amount is the gross escrow figure; the
     * platform fee is taken off it. When a payout exists it is the authority.
     */
    public function getNetAmountAttribute(): float
    {
        if ($this->relationLoaded('payout') && $this->payout) {
            return round((float) $this->payout->amount, 2);
        }

        $amount = round((float) $this->amount, 2);

        return round($amount - ($amount * $this->fee_percent / 100), 2);
    }

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
