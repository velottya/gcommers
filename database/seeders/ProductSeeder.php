<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            ['PB01001', 'Pupuk Urea Subsidi',              'Pupuk nitrogen (N 46%) untuk tanaman padi, jagung, dan tebu.'],
            ['PB01011', 'Pupuk NPK KAKAO Subsidi (50 kg)', 'Pupuk majemuk NPK formula khusus tanaman kakao.'],
            ['PB01004', 'Pupuk Phonska - Subsidi',         'Pupuk majemuk NPK (15-15-15) untuk berbagai jenis tanaman pangan.'],
            ['PB01006', 'Pupuk Petroganik - Subsidi',      'Pupuk organik granul berbahan dasar kotoran ternak pilihan.'],
            ['PB01002', 'Pupuk ZA - Subsidi',              'Pupuk amonium sulfat (N 21%, S 24%) untuk tanaman tebu dan hortikultura.'],
            ['PB01008', 'Pupuk Zeorganik - Subsidi',       'Pupuk organik berbasis zeolit untuk perbaikan struktur tanah.'],
            ['PB01003', 'Pupuk SP-36 - Subsidi',           'Pupuk fosfat (P2O5 36%) untuk mendukung pertumbuhan akar tanaman.'],
        ];

        $now = now();

        foreach ($products as [$code, $name, $uraian]) {
            DB::table('product_master')->updateOrInsert(
                ['kode_produk' => $code],
                [
                    'nama_produk' => $name,
                    'uraian'      => $uraian,
                    'satuan'      => 'TON',
                    'status'      => 'Aktif',
                    'jenis'       => 'Subsidi',
                    'foto'        => 'nologo.png',
                    'created_at'  => $now,
                    'updated_at'  => $now,
                ]
            );
        }

        $this->command->info('✓ ' . count($products) . ' produk berhasil di-seed ke product_master.');
    }
}
