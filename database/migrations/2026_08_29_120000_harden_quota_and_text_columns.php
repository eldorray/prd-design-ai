<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Public registration is closed and accounts are provisioned by an
            // administrator, so a new account starts with no spend until one
            // is granted deliberately. The old 100k default handed every new
            // row a free budget against the project's own provider keys.
            $table->integer('token_quota')->default(0)->change();
        });

        // `text` tops out at 65,535 BYTES on MySQL while these fields validate
        // up to 50,000 CHARACTERS. Multibyte input therefore overflows the
        // column, which SQLite tolerated but MySQL rejects outright.
        Schema::table('prds', function (Blueprint $table) {
            $table->longText('idea')->nullable()->change();
        });

        Schema::table('designs', function (Blueprint $table) {
            $table->longText('prompt')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->integer('token_quota')->default(100000)->change();
        });

        Schema::table('prds', function (Blueprint $table) {
            $table->text('idea')->nullable()->change();
        });

        Schema::table('designs', function (Blueprint $table) {
            $table->text('prompt')->nullable()->change();
        });
    }
};
