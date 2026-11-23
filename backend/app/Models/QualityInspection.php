<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QualityInspection extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'inspector_id',
        'verdict',
        'readings',
        'origin_weight',
        'destination_weight',
        'weight_variance',
        'note',
        'signed_at',
    ];

    protected $casts = [
        'readings' => 'array',
        'origin_weight' => 'decimal:2',
        'destination_weight' => 'decimal:2',
        'weight_variance' => 'decimal:2',
        'signed_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function inspector()
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }
}
