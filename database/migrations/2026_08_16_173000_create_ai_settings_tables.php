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
        Schema::create('ai_providers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('base_url');
            $table->text('api_key')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('supports_thinking')->default(false);
            $table->string('last_synced_model', 100)->nullable();
            $table->timestamps();
        });

        Schema::create('ai_prompts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('scope', 20); // prd | design
            $table->string('label', 120);
            $prompt = $table->text('content');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_providers');
        Schema::dropIfExists('ai_prompts');
    }
};
