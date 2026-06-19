<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Users', function (Blueprint $table) {
            $table->string('Kecamatan', 150)->nullable()->after('Region');
        });
    }

    public function down(): void
    {
        Schema::table('Users', function (Blueprint $table) {
            $table->dropColumn('Kecamatan');
        });
    }
};
