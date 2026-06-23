<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AdminRegion memilih gudang asal (dari gudang_submissions yang approved) untuk
 * memenuhi sebuah order, dipakai untuk menghitung jarak ke alamat kios.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Orders', function (Blueprint $table) {
            $table->unsignedBigInteger('GudangSubmissionId')->nullable()->after('Vendor');
            $table->foreign('GudangSubmissionId')->references('id')->on('gudang_submissions')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('Orders', function (Blueprint $table) {
            $table->dropForeign(['GudangSubmissionId']);
            $table->dropColumn('GudangSubmissionId');
        });
    }
};
