<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Older code did json_encode() on an attribute already cast to array,
     * which stored a JSON *string* inside the JSON column. Decode one level
     * so images are real arrays again.
     */
    public function up(): void
    {
        DB::table('produce_listings')
            ->whereNotNull('images')
            ->orderBy('id')
            ->each(function ($listing) {
                $decoded = json_decode($listing->images, true);

                if (!is_string($decoded)) {
                    return;
                }

                $inner = json_decode($decoded, true);

                if (!is_array($inner)) {
                    return;
                }

                DB::table('produce_listings')
                    ->where('id', $listing->id)
                    ->update(['images' => json_encode($inner)]);
            });
    }

    public function down(): void
    {
        // Data repair; no safe automatic rollback.
    }
};
