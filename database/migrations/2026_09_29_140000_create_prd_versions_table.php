<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prd_versions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('prd_id')->constrained()->cascadeOnDelete();
            $table->longText('content');
            $table->timestamp('created_at')->nullable();

            $table->index(['prd_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prd_versions');
    }
};
