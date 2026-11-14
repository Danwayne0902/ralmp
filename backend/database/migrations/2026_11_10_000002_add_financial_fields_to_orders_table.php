<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Keep the order total breakdown explicit instead of deriving it
            // from client-supplied values.
            $table->decimal('subtotal', 12, 2)->default(0)->after('unit_price');
            $table->decimal('delivery_fee', 12, 2)->default(0)->after('subtotal');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['subtotal', 'delivery_fee']);
        });
    }
};
