<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Pengajuan quota subsidi kini per bulan (period 'YYYY-MM'), bukan per tahun saja.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subsidy_quota_submissions', function (Blueprint $table) {
            $table->dropUnique(['region', 'year']);
            $table->string('period', 7)->nullable()->after('region');
        });

        DB::statement("UPDATE subsidy_quota_submissions SET period = CONCAT(CAST(year AS VARCHAR(4)), '-01')");

        Schema::table('subsidy_quota_submissions', function (Blueprint $table) {
            $table->dropColumn('year');
        });

        DB::statement('ALTER TABLE subsidy_quota_submissions ALTER COLUMN period VARCHAR(7) NOT NULL');

        Schema::table('subsidy_quota_submissions', function (Blueprint $table) {
            $table->unique(['region', 'period']);
        });
    }

    public function down(): void
    {
        Schema::table('subsidy_quota_submissions', function (Blueprint $table) {
            $table->dropUnique(['region', 'period']);
            $table->unsignedInteger('year')->nullable()->after('region');
        });

        DB::statement('UPDATE subsidy_quota_submissions SET year = CAST(LEFT(period, 4) AS INT)');

        Schema::table('subsidy_quota_submissions', function (Blueprint $table) {
            $table->dropColumn('period');
        });

        DB::statement('ALTER TABLE subsidy_quota_submissions ALTER COLUMN year INT NOT NULL');

        Schema::table('subsidy_quota_submissions', function (Blueprint $table) {
            $table->unique(['region', 'year']);
        });
    }
};
