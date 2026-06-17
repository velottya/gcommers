<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Menanam data awal harga + ongkir per produk per region.
 * Data ini bersifat referensial dan hanya di-insert jika belum ada (insertOrIgnore).
 * Ketika AdminRegion mengajukan stok dan disetujui SuperAdmin, data ini akan terupdate otomatis.
 *
 * Harga satuan: acuan HET (Harga Eceran Tertinggi) pupuk subsidi dalam Rp/TON.
 * Biaya pengiriman: tarif ongkir dalam Rp/kg, bervariasi per region.
 * PPH: 0.25% (sesuai tarif default sistem).
 */
class ProductRegionPriceSeeder extends Seeder
{
    public function run(): void
    {
        // Ambil ID produk berdasarkan kode produk
        $products = DB::table('product_master')->pluck('id', 'kode_produk');

        if ($products->isEmpty()) {
            $this->command->warn('product_master kosong. Jalankan ProductSeeder terlebih dahulu.');
            return;
        }

        // Harga satuan per produk (Rp/TON) — acuan HET pupuk subsidi
        $hargaPerProduk = [
            'PB01001' => 2_250_000,  // Pupuk Urea Subsidi
            'PB01011' => 3_300_000,  // Pupuk NPK KAKAO Subsidi (50 kg)
            'PB01004' => 2_300_000,  // Pupuk Phonska - Subsidi
            'PB01006' =>   800_000,  // Pupuk Petroganik - Subsidi
            'PB01002' => 1_700_000,  // Pupuk ZA - Subsidi
            'PB01008' =>   800_000,  // Pupuk Zeorganik - Subsidi
            'PB01003' => 2_400_000,  // Pupuk SP-36 - Subsidi
        ];

        // Tarif ongkir per region (Rp/kg)
        // Jawa Timur sebagai base distribusi; semakin jauh semakin mahal
        $ongkirPerRegion = [
            'Jawa Timur'          => 50,
            'Jawa Tengah Selatan' => 70,
            'Jawa Tengah Utara'   => 70,
            'Makassar'            => 150,
            'Medan'               => 200,
            'Lampung'             => 100,
        ];

        $now    = now();
        $count  = 0;

        foreach ($hargaPerProduk as $kode => $hargaSatuan) {
            $productId = $products[$kode] ?? null;

            if (!$productId) {
                $this->command->warn("Produk {$kode} tidak ditemukan di product_master, dilewati.");
                continue;
            }

            $productName = DB::table('product_master')
                ->where('id', $productId)
                ->value('nama_produk');

            foreach ($ongkirPerRegion as $region => $ongkirPerKg) {
                $exists = DB::table('product_region_prices')
                    ->where('product_id', $productId)
                    ->where('region', $region)
                    ->exists();

                if (!$exists) {
                    DB::table('product_region_prices')->insert([
                        'product_id'             => $productId,
                        'product_code'           => $kode,
                        'product_name'           => $productName,
                        'region'                 => $region,
                        'qty_available'          => 0,
                        'harga_satuan'           => $hargaSatuan,
                        'biaya_pengiriman_per_kg'=> $ongkirPerKg,
                        'pajak_pph_persen'       => 0.25,
                        'effective_from'         => $now,
                        'set_by'                 => 'system-seeder',
                        'created_at'             => $now,
                        'updated_at'             => $now,
                    ]);
                    $count++;
                }
            }
        }

        $this->command->info("✓ {$count} baris product_region_prices berhasil di-seed (data existing tidak ditimpa).");
    }
}
