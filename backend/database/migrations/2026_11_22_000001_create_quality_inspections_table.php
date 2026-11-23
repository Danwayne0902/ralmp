<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One recorded check per order. The checker signs it with their own
        // account, and the readings stay with the order afterwards.
        Schema::create('quality_inspections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('inspector_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('verdict', 20); // release | conditional | freeze
            $table->json('readings')->nullable();
            $table->decimal('origin_weight', 12, 2)->nullable();
            $table->decimal('destination_weight', 12, 2)->nullable();
            $table->decimal('weight_variance', 6, 2)->nullable();
            $table->text('note')->nullable();
            $table->timestamp('signed_at');
            $table->timestamps();

            $table->index('signed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quality_inspections');
    }
};
