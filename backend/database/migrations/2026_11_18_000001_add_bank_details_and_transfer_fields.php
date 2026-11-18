<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('bank_name')->nullable()->after('lga');
            $table->string('bank_code', 20)->nullable()->after('bank_name');
            $table->string('account_name')->nullable()->after('bank_code');
            $table->string('account_number', 20)->nullable()->after('account_name');
            $table->string('paystack_recipient_code')->nullable()->after('account_number');
        });

        Schema::table('payouts', function (Blueprint $table) {
            $table->string('transfer_code')->nullable()->after('reference');
            $table->string('transfer_status')->nullable()->after('transfer_code');
            $table->string('transfer_reference')->nullable()->after('transfer_status');
            $table->string('bank_name')->nullable()->after('transfer_reference');
            $table->string('account_number', 20)->nullable()->after('bank_name');
            $table->string('account_name')->nullable()->after('account_number');
            $table->string('failure_reason', 255)->nullable()->after('account_name');
            $table->timestamp('sent_at')->nullable()->after('paid_at');

            $table->index('transfer_code');
            $table->index('transfer_reference');
        });
    }

    public function down(): void
    {
        Schema::table('payouts', function (Blueprint $table) {
            $table->dropIndex(['transfer_code']);
            $table->dropIndex(['transfer_reference']);
            $table->dropColumn([
                'transfer_code',
                'transfer_status',
                'transfer_reference',
                'bank_name',
                'account_number',
                'account_name',
                'failure_reason',
                'sent_at',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'bank_name',
                'bank_code',
                'account_name',
                'account_number',
                'paystack_recipient_code',
            ]);
        });
    }
};
