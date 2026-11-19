<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Money the platform keeps. One row per released payment part.
        Schema::create('platform_fees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('escrow_release_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('payee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('payout_id')->nullable()->constrained()->nullOnDelete();
            $table->string('kind', 20); // goods | delivery
            $table->decimal('base_amount', 14, 2);
            $table->decimal('rate', 5, 2);
            $table->decimal('amount', 14, 2);
            $table->timestamps();

            $table->index(['order_id', 'kind']);
        });

        // A delivery price agreed between the buyer and a driver.
        Schema::create('delivery_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('driver_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('proposed_by')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 14, 2);
            $table->string('status', 20)->default('proposed'); // proposed | accepted | declined | withdrawn | superseded
            $table->string('note', 255)->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status']);
            $table->index(['driver_id', 'status']);
        });

        Schema::table('deliveries', function (Blueprint $table) {
            $table->decimal('agreed_amount', 14, 2)->nullable()->after('delivery_cost');
            $table->string('payment_reference')->nullable()->after('agreed_amount');
            $table->string('payment_status', 20)->default('unpaid')->after('payment_reference');
            $table->timestamp('paid_at')->nullable()->after('payment_status');
            // Both sides must confirm before the driver is paid.
            $table->timestamp('buyer_confirmed_at')->nullable()->after('paid_at');
            $table->timestamp('farmer_confirmed_at')->nullable()->after('buyer_confirmed_at');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->string('kind', 20)->default('order')->after('order_id');
            $table->foreignId('delivery_id')->nullable()->after('kind')->constrained()->nullOnDelete();
        });

        // Delivery offers appear inside the chat thread.
        Schema::table('messages', function (Blueprint $table) {
            $table->string('type', 20)->default('text')->after('message');
            $table->foreignId('offer_id')->nullable()->after('type')->constrained('delivery_offers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('offer_id');
            $table->dropColumn('type');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('delivery_id');
            $table->dropColumn('kind');
        });

        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn([
                'agreed_amount',
                'payment_reference',
                'payment_status',
                'paid_at',
                'buyer_confirmed_at',
                'farmer_confirmed_at',
            ]);
        });

        Schema::dropIfExists('delivery_offers');
        Schema::dropIfExists('platform_fees');
    }
};
