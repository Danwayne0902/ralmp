<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('escrow_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('farmer_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 14, 2);
            $table->decimal('farmer_amount', 14, 2);
            $table->decimal('delivery_amount', 14, 2)->default(0);
            $table->decimal('released_amount', 14, 2)->default(0);
            $table->string('status')->default('funded');
            $table->timestamp('funded_at')->nullable();
            $table->timestamps();
        });

        Schema::create('escrow_releases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('escrow_account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('milestone');
            $table->string('label');
            $table->foreignId('payee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('payee_role');
            $table->decimal('percentage', 5, 2)->default(0);
            $table->decimal('amount', 14, 2);
            $table->string('status')->default('pending');
            $table->string('trigger')->nullable();
            $table->foreignId('released_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('released_at')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique(['order_id', 'milestone']);
            $table->index(['status', 'milestone']);
        });

        Schema::create('payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('escrow_release_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->decimal('amount', 14, 2);
            $table->string('status')->default('pending');
            $table->string('reference')->unique();
            $table->text('note')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payouts');
        Schema::dropIfExists('escrow_releases');
        Schema::dropIfExists('escrow_accounts');
    }
};
