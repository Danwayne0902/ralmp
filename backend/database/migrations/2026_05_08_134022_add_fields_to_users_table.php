<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone')->nullable()->unique();
            $table->string('role')->default('farmer');
            $table->text('address')->nullable();
            $table->string('state')->nullable();
            $table->string('lga')->nullable();
            $table->string('profile_image')->nullable();
            $table->boolean('verification_status')->default(false);
            $table->string('verification_token')->nullable()->unique();
            $table->string('reset_token')->nullable()->unique();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'phone')) $table->dropColumn('phone');
            if (Schema::hasColumn('users', 'role')) $table->dropColumn('role');
            if (Schema::hasColumn('users', 'address')) $table->dropColumn('address');
            if (Schema::hasColumn('users', 'state')) $table->dropColumn('state');
            if (Schema::hasColumn('users', 'lga')) $table->dropColumn('lga');
            if (Schema::hasColumn('users', 'profile_image')) $table->dropColumn('profile_image');
            if (Schema::hasColumn('users', 'verification_status')) $table->dropColumn('verification_status');
            if (Schema::hasColumn('users', 'verification_token')) $table->dropColumn('verification_token');
            if (Schema::hasColumn('users', 'reset_token')) $table->dropColumn('reset_token');
        });
    }
};
