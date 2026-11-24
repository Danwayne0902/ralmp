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
     * Get one row per conversation, using the latest message in each thread.
     * The old version loaded every message the user had ever exchanged and
     * grouped them in PHP, which grew with chat history.
     */
    public function getConversations(Request $request)
    {
        $userId = $request->user()->id;

        $base = Message::query()->where(function ($query) use ($userId) {
            $query->where('sender_id', $userId)->orWhere('recipient_id', $userId);
        });

        // One id per conversation: the newest message in that thread.
        $latestIds = (clone $base)
            ->whereNotNull('conversation_id')
            ->selectRaw('MAX(id) as id')
            ->groupBy('conversation_id')
            ->pluck('id');

        $messages = Message::with([
            'sender:id,name,profile_image',
            'recipient:id,name,profile_image',
        ])
            ->whereIn('id', $latestIds)
            ->orderByDesc('id')
            ->limit(max(1, min((int) $request->get('per_page', 100), 200)))
            ->get();

        // One grouped query supplies every unread badge.
        $unread = (clone $base)
            ->where('recipient_id', $userId)
            ->where('is_read', false)
            ->selectRaw('conversation_id, COUNT(*) as total')
            ->groupBy('conversation_id')
            ->pluck('total', 'conversation_id');

        $conversations = $messages
            ->map(function (Message $lastMessage) use ($userId, $unread) {
                $otherUser = $lastMessage->sender_id === $userId
                    ? $lastMessage->recipient
                    : $lastMessage->sender;

                if (!$otherUser) {
                    return null;
                }

                return [
                    'user' => $otherUser,
                    'last_message' => $lastMessage,
                    'unread_count' => (int) ($unread[$lastMessage->conversation_id] ?? 0),
                    'conversation_id' => $lastMessage->conversation_id,
                ];
            })
            ->filter()
            ->values();

        return response()->json([
            'conversations' => $conversations,
        ], 200);
    }

    /**
     * Get a page of messages in a conversation. The newest page is returned
     * by default; before_id loads older pages and after_id loads new messages
     * for polling without re-downloading the whole thread.
     */
    public function getConversation(Request $request, $userId)
    {
        $currentUserId = $request->user()->id;
        $perPage = max(1, min((int) $request->get('per_page', 50), 100));

        $base = Message::where(function ($query) use ($currentUserId, $userId) {
            // Both directions must stay inside one group, otherwise a later
            // before_id/after_id filter is OR-ed out by the second branch.
            $query->where(function ($q) use ($currentUserId, $userId) {
                $q->where('sender_id', $currentUserId)
                    ->where('recipient_id', $userId);
            })->orWhere(function ($q) use ($currentUserId, $userId) {
                $q->where('sender_id', $userId)
                    ->where('recipient_id', $currentUserId);
            });
        });

        $afterId = (int) $request->get('after_id', 0);
        $beforeId = (int) $request->get('before_id', 0);

        if ($afterId > 0) {
            $messages = (clone $base)
                ->with([
                    'sender:id,name,profile_image',
                    'recipient:id,name,profile_image',
                    'offer.driver:id,name,profile_image',
                ])
                ->where('id', '>', $afterId)
                ->orderBy('id')
                ->limit($perPage)
                ->get();

            $hasMore = $messages->count() === $perPage;
        } else {
            $query = (clone $base)
                ->with([
                    'sender:id,name,profile_image',
                    'recipient:id,name,profile_image',
                    'offer.driver:id,name,profile_image',
                ])
                ->orderByDesc('id')
                ->limit($perPage + 1);

            if ($beforeId > 0) {
                $query->where('id', '<', $beforeId);
            }

            $rows = $query->get();
            $hasMore = $rows->count() > $perPage;
            $messages = $rows->take($perPage)->reverse()->values();
        }

        // Opening or polling an active thread clears its unread flags.
        Message::where('sender_id', $userId)
            ->where('recipient_id', $currentUserId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'messages' => $messages,
            'meta' => [
                'has_more' => $hasMore,
                'oldest_id' => $messages->first()?->id,
                'newest_id' => $messages->last()?->id,
            ],
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
