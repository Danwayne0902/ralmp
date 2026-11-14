<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProduceListing extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'commodity_name',
        'category',
        'quantity',
        'unit',
        'price',
        'location',
        'harvest_date',
        'expiry_date',
        'description',
        'images',
        'availability_status',
    ];

    protected $casts = [
        'harvest_date' => 'date',
        'expiry_date' => 'date',
        'images' => 'array',
        'price' => 'decimal:2',
        'quantity' => 'decimal:2',
    ];

    /**
     * Get the farmer (user) who created this listing
     */
    public function farmer()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get orders for this produce listing
     */
    public function orders()
    {
        return $this->hasMany(Order::class, 'produce_id');
    }

    /**
     * Get the user relationship with alias listings
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
