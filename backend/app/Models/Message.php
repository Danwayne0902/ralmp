<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Message extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'sender_id',
        'recipient_id',
        'conversation_id',
        'message',
        'type',
        'offer_id',
        'file_path',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    /**
     * Always keep the pair key in sync, so no code path can create a message
     * that the conversation list cannot group.
     */
    protected static function booted(): void
    {
        static::saving(function (Message $message) {
            if ($message->conversation_id) {
                return;
            }

            $ids = [(int) $message->sender_id, (int) $message->recipient_id];
            sort($ids);
            $message->conversation_id = 'conv_' . $ids[0] . '_' . $ids[1];
        });
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient()
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function offer()
    {
        return $this->belongsTo(DeliveryOffer::class, 'offer_id');
    }
}
