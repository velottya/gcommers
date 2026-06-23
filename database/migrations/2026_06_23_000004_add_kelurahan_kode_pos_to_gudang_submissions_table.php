<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gudang_submissions', function (Blueprint $table) {
            // ->after() hanya berlaku di MySQL; di SQL Server kolom akan ditambahkan di akhir.
            $table->string('kelurahan', 150)->nullable()->after('kecamatan_id');
            $table->string('kode_pos', 10)->nullable()->after('kelurahan');
        });
    }

    public function down(): void
    {
        Schema::table('gudang_submissions', function (Blueprint $table) {
            $table->dropColumn(['kelurahan', 'kode_pos']);
        });
    }
};
