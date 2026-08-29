<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('designs', function (Blueprint $table) {
            $table->json('canvases')->nullable()->after('messages');
        });

        // Backfill existing single-canvas designs into the new structure.
        DB::table('designs')->orderBy('id')->lazyById()->each(function ($design) {
            $messages = $design->messages;
            if (is_string($messages)) {
                $decoded = json_decode($messages, true);
                $messages = is_array($decoded) ? $decoded : [];
            }
            $messages = $messages ?? [];

            $canvas = [[
                'kind' => $design->kind ?? 'landing-page',
                'html' => $design->html,
                'messages' => $messages,
                'prompt' => $design->prompt,
            ]];

            DB::table('designs')
                ->where('id', $design->id)
                ->update(['canvases' => json_encode($canvas)]);
        });
    }

    public function down(): void
    {
        Schema::table('designs', function (Blueprint $table) {
            $table->dropColumn('canvases');
        });
    }
};
