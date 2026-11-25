<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sanctum 4 indexes expires_at so `sanctum:prune-expired` does not scan the
 * whole token table. Our original migration predates that, so add it here.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasIndex('personal_access_tokens', 'personal_access_tokens_expires_at_index')) {
            Schema::table('personal_access_tokens', function (Blueprint $table) {
                $table->index('expires_at');
            });
        }
    }

    public function down(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->dropIndex(['expires_at']);
        });
    }
};
