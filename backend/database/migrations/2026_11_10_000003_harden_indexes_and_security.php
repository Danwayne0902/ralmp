<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('reset_token_expires_at')->nullable()->after('reset_token');
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->index('conversation_id');
        });

        Schema::table('reviews', function (Blueprint $table) {
            // One review per buyer per order.
            $table->unique(['user_id', 'order_id']);
        });

        Schema::table('deliveries', function (Blueprint $table) {
            // One delivery per order, and a place to keep the pickup slot.
            $table->unique('order_id');
            $table->string('pickup_time_slot')->nullable()->after('pickup_date');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->unique('payment_reference');
        });

        // Reviews must be moderated before they are publicly visible.
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE reviews ALTER is_approved SET DEFAULT 0');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE reviews ALTER is_approved SET DEFAULT 1');
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['payment_reference']);
        });

        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropUnique(['order_id']);
            $table->dropColumn('pickup_time_slot');
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'order_id']);
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex(['conversation_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('reset_token_expires_at');
        });
    }
};
