<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Satu gudang sekarang bisa mencakup banyak kecamatan (lintas kabupeten),
 * bukan cuma 1 kabupaten/kecamatan seperti sebelumnya. Dipakai untuk
 * menentukan kios mana saja yang otomatis "tercakup" oleh gudang ini
 * (lihat OrderController::gudangOptions()).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gudang_submission_kecamatans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gudang_submission_id');
            $table->foreign('gudang_submission_id')->references('id')->on('gudang_submissions')->cascadeOnDelete();
            $table->unsignedBigInteger('kecamatan_id');
            $table->foreign('kecamatan_id')->references('id')->on('kecamatan');
            $table->timestamps();
            $table->unique(['gudang_submission_id', 'kecamatan_id']);
        });

        // Pindahkan kecamatan_id tunggal yang sudah ada ke tabel pivot baru.
        $now = now();
        foreach (DB::table('gudang_submissions')->select('id', 'kecamatan_id')->whereNotNull('kecamatan_id')->get() as $row) {
            DB::table('gudang_submission_kecamatans')->insert([
                'gudang_submission_id' => $row->id,
                'kecamatan_id'         => $row->kecamatan_id,
                'created_at'           => $now,
                'updated_at'           => $now,
            ]);
        }

        Schema::table('gudang_submissions', function (Blueprint $table) {
            $table->dropForeign(['kabupaten_id']);
            $table->dropForeign(['kecamatan_id']);
            $table->dropColumn(['kabupaten_id', 'kecamatan_id']);
        });
    }

    public function down(): void
    {
        Schema::table('gudang_submissions', function (Blueprint $table) {
            $table->unsignedBigInteger('kabupaten_id')->nullable();
            $table->unsignedBigInteger('kecamatan_id')->nullable();
        });

        // Lossy: hanya kecamatan pertama per gudang yang dikembalikan ke kolom tunggal.
        $firstPerSubmission = DB::table('gudang_submission_kecamatans')
            ->select('gudang_submission_id', 'kecamatan_id')
            ->orderBy('id')
            ->get()
            ->groupBy('gudang_submission_id')
            ->map(fn ($rows) => $rows->first());

        foreach ($firstPerSubmission as $submissionId => $row) {
            $kecamatan = DB::table('kecamatan')->where('id', $row->kecamatan_id)->first();

            DB::table('gudang_submissions')->where('id', $submissionId)->update([
                'kecamatan_id' => $row->kecamatan_id,
                'kabupaten_id' => $kecamatan?->id_kab,
            ]);
        }

        Schema::table('gudang_submissions', function (Blueprint $table) {
            $table->foreign('kabupaten_id')->references('id')->on('kabupaten');
            $table->foreign('kecamatan_id')->references('id')->on('kecamatan');
        });

        Schema::dropIfExists('gudang_submission_kecamatans');
    }
};
