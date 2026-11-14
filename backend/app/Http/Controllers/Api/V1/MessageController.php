<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class MessageController extends Controller
{
    /**
     * Get all conversations for current user
     */
    public function getConversations(Request $request)
    {
        $userId = $request->user()->id;

        $conversations = Message::where('sender_id', $userId)
            ->orWhere('recipient_id', $userId)
            ->with([
                'sender:id,name,profile_image',
                'recipient:id,name,profile_image',
            ])
            ->orderByDesc('created_at')
            ->get()
            ->groupBy(function($message) use ($userId) {
                return $message->sender_id == $userId ? $message->recipient_id : $message->sender_id;
            })
            ->map(function($messages, $otherUserId) use ($userId) {
                $otherUser = $messages->first()->sender_id == $userId 
                    ? $messages->first()->recipient 
                    : $messages->first()->sender;
                
                $lastMessage = $messages->first();
                $unreadCount = $messages->where('recipient_id', $userId)->where('is_read', false)->count();

                return [
                    'user' => $otherUser,
                    'last_message' => $lastMessage,
                    'unread_count' => $unreadCount,
                    'conversation_id' => $this->getConversationId($userId, $otherUserId)
                ];
            })
            ->values();

        return response()->json([
            'conversations' => $conversations
        ], 200);
    }

    /**
     * Get messages in a conversation
     */
    public function getConversation(Request $request, $userId)
    {
        $currentUserId = $request->user()->id;

        $messages = Message::where(function($query) use ($currentUserId, $userId) {
            $query->where('sender_id', $currentUserId)
                  ->where('recipient_id', $userId);
        })->orWhere(function($query) use ($currentUserId, $userId) {
            $query->where('sender_id', $userId)
                  ->where('recipient_id', $currentUserId);
        })
        ->with([
            'sender:id,name,profile_image',
            'recipient:id,name,profile_image',
        ])
        ->orderBy('created_at', 'asc')
        ->get();

        // Mark messages as read
        Message::where('sender_id', $userId)
            ->where('recipient_id', $currentUserId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);

        return response()->json([
            'messages' => $messages
        ], 200);
    }

    /**
     * Send a message
     */
    public function sendMessage(Request $request)
    {
        $validated = $request->validate([
            'recipient_id' => 'required|exists:users,id',
            'message' => 'required|string|max:2000',
        ]);

        $message = Message::create([
            'sender_id' => $request->user()->id,
            'recipient_id' => $validated['recipient_id'],
            'message' => $validated['message'],
            'conversation_id' => $this->getConversationId($request->user()->id, $validated['recipient_id']),
            'is_read' => false,
        ]);

        // Broadcast event for real-time
        event(new \App\Events\MessageSent($message));

        return response()->json([
            'message' => 'Message sent successfully',
            'data' => $message->load([
                'sender:id,name,profile_image',
                'recipient:id,name,profile_image',
            ])
        ], 201);
    }

    /**
     * Mark messages as read
     */
    public function markAsRead(Request $request, $userId)
    {
        $count = Message::where('sender_id', $userId)
            ->where('recipient_id', $request->user()->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);

        return response()->json([
            'message' => 'Messages marked as read',
            'count' => $count
        ], 200);
    }

    /**
     * Get unread message count
     */
    public function getUnreadCount(Request $request)
    {
        $count = Message::where('recipient_id', $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'unread_count' => $count
        ], 200);
    }

    /**
     * Delete a message
     */
    public function deleteMessage(Request $request, $id)
    {
        $message = Message::findOrFail($id);

        if ($message->sender_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $message->delete();

        return response()->json(['message' => 'Message deleted'], 200);
    }

    /**
     * Generate conversation ID between two users
     */
    private function getConversationId($user1Id, $user2Id)
    {
        $ids = [$user1Id, $user2Id];
        sort($ids);
        return 'conv_' . implode('_', $ids);
    }
}
