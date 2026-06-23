<?php

use App\Helpers\FlutterPasswordHasher;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Satu kiosk dummy di region Jawa Timur, Kabupaten Malang, untuk menguji
 * fitur alamat kios + jarak ke gudang.
 */
return new class extends Migration
{
    private const EMAIL = 'kiosk.malang@example.com';

    public function up(): void
    {
        if (DB::table('Users')->where('Email', self::EMAIL)->exists()) {
            return;
        }

        $kabupaten = DB::table('kabupaten')->where('nama_kab', 'Kab. Malang')->first();
        if (! $kabupaten) {
            return; // data wilayah belum tersedia
        }

        $kecamatan = DB::table('kecamatan')->where('id_kab', $kabupaten->id)->orderBy('id')->first();
        $propinsi  = DB::table('propinsi')->where('id', $kabupaten->id_pro)->first();

        ['saltLiteral' => $saltLit, 'hashLiteral' => $hashLit] =
            FlutterPasswordHasher::hashToSqlLiterals('password123');

        DB::table('Users')->insert([
            'Email'        => self::EMAIL,
            'DisplayName'  => 'Kiosk Dummy Malang',
            'KioskName'    => 'Kiosk Pakisaji Malang',
            'Phone'        => '081234500000',
            'Address'      => 'Jl. Raya Pakisaji No. 10',
            'Region'       => 'Jawa Timur',
            'Kecamatan'    => $kecamatan->nama_kec ?? 'Pakisaji',
            'ProvinsiId'   => $propinsi->id ?? null,
            'KabupatenId'  => $kabupaten->id,
            'KecamatanId'  => $kecamatan->id ?? null,
            'Kelurahan'    => 'Glanggang',
            'KodePos'      => '65162',
            'Latitude'     => -8.069302,
            'Longitude'    => 112.598571,
            'Role'         => 'kiosk',
            'PasswordHash' => DB::raw($hashLit),
            'PasswordSalt' => DB::raw($saltLit),
            'CreatedAt'    => now(),
            'UpdatedAt'    => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('Users')->where('Email', self::EMAIL)->delete();
    }
};
