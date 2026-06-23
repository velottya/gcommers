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
            $table->string('no_telp', 20)->nullable()->after('nama_pic');
            $table->decimal('latitude', 10, 6)->nullable()->after('alamat_gudang');
            $table->decimal('longitude', 10, 6)->nullable()->after('latitude');
        });
    }

    public function down(): void
    {
        Schema::table('gudang_submissions', function (Blueprint $table) {
            $table->dropColumn(['no_telp', 'latitude', 'longitude']);
        });
    }
};
