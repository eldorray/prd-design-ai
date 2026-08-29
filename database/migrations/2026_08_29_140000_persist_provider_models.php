<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_providers', function (Blueprint $table) {
            // The model list used to be fetched from the provider inside the
            // request that needed it, and cached for ten minutes. A single
            // timeout therefore cached an empty list, and every PRD save,
            // design save, and generation failed validation until it expired.
            //
            // Storing the last successful list means a failed sync changes
            // nothing: the previous list keeps serving.
            $table->json('models')->nullable()->after('supports_thinking');
            $table->timestamp('models_synced_at')->nullable()->after('models');

            // Never read or written anywhere; superseded by the columns above.
            $table->dropColumn('last_synced_model');
        });
    }

    public function down(): void
    {
        Schema::table('ai_providers', function (Blueprint $table) {
            $table->string('last_synced_model', 100)->nullable();
            $table->dropColumn(['models', 'models_synced_at']);
        });
    }
};
