<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Older rows may have no conversation_id. The pair key is stable, so
        // backfill it before the inbox starts grouping by it.
        DB::table('messages')
            ->where(fn ($query) => $query->whereNull('conversation_id')->orWhere('conversation_id', ''))
            ->orderBy('id')
            ->chunkById(500, function ($rows) {
                foreach ($rows as $row) {
                    $ids = [(int) $row->sender_id, (int) $row->recipient_id];
                    sort($ids);
                    DB::table('messages')->where('id', $row->id)->update([
                        'conversation_id' => 'conv_' . $ids[0] . '_' . $ids[1],
                    ]);
                }
            });

        Schema::table('messages', function (Blueprint $table) {
            // The inbox reads the latest message per thread and the unread
            // count per recipient. Both now have an index that matches.
            $table->index(['conversation_id', 'id']);
            $table->index(['recipient_id', 'is_read']);
            $table->index(['sender_id', 'created_at']);
        });

        // Admin lists and dashboards filter orders by status over time.
        Schema::table('orders', function (Blueprint $table) {
            $table->index(['status', 'created_at']);
            $table->index(['payment_status', 'created_at']);
        });

        // Marketplace filters and sorting.
        Schema::table('produce_listings', function (Blueprint $table) {
            $table->index(['availability_status', 'created_at']);
            $table->index(['category', 'created_at']);
            $table->index(['price']);
        });

        // MySQL gets a real full-text index for search. SQLite (used by the
        // test suite) keeps the LIKE fallback in the search helper.
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE produce_listings ADD FULLTEXT produce_listings_search (commodity_name, description, category)');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE produce_listings DROP INDEX produce_listings_search');
        }

        Schema::table('produce_listings', function (Blueprint $table) {
            $table->dropIndex(['availability_status', 'created_at']);
            $table->dropIndex(['category', 'created_at']);
            $table->dropIndex(['price']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['status', 'created_at']);
            $table->dropIndex(['payment_status', 'created_at']);
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex(['conversation_id', 'id']);
            $table->dropIndex(['recipient_id', 'is_read']);
            $table->dropIndex(['sender_id', 'created_at']);
        });
    }
};
