<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Redesign skema produk:
 *  - Buat tabel product_master: master data 7 produk subsidi (tanpa stok/harga).
 *  - Hapus & buat ulang product_stock_requests dengan FK ke product_master.
 *  - Hapus & buat ulang product_region_prices dengan FK ke product_master + kolom qty_available.
 *
 * Catatan: tabel SQL Server "Products" (PascalCase, milik Flutter app) TIDAK disentuh.
 * Tabel baru "product_master" (snake_case) adalah tabel admin-side yang berdiri sendiri.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Drop tabel lama (urutan terbalik agar tidak ada konflik dependensi)
        Schema::dropIfExists('product_region_prices');
        Schema::dropIfExists('product_stock_requests');

        // ── 1. product_master ────────────────────────────────────────────────────
        // Master data produk pupuk subsidi. Hanya 7 produk, bersifat referensial.
        // Tidak menyimpan stok ataupun harga — keduanya ada di tabel region.
        Schema::create('product_master', function (Blueprint $table) {
            $table->id();
            $table->string('kode_produk', 20)->unique();
            $table->string('nama_produk', 100);
            $table->text('uraian')->nullable();
            $table->string('satuan', 20)->default('TON');
            $table->string('status', 20)->default('Aktif');   // Aktif|Nonaktif
            $table->string('jenis', 50)->default('Subsidi');
            $table->string('foto', 255)->default('nologo.png');
            $table->timestamps();
        });

        // ── 2. product_stock_requests ────────────────────────────────────────────
        // Ajuan penambahan stok oleh AdminRegion → disetujui/ditolak SuperAdmin.
        // Stok yang disetujui ditambahkan ke product_region_prices.qty_available.
        Schema::create('product_stock_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->foreign('product_id')->references('id')->on('product_master');
            $table->string('product_code', 20);    // denorm untuk keterbacaan riwayat
            $table->string('product_name', 100);   // denorm untuk keterbacaan riwayat
            $table->string('region', 100);          // matches Users.Region pemohon
            $table->integer('qty_requested');
            $table->decimal('harga_satuan', 15, 2)->nullable();
            $table->decimal('biaya_pengiriman_per_kg', 10, 2)->nullable();  // tarif ongkir Rp/kg
            $table->decimal('pajak_pph_persen', 5, 2)->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('submitted');   // submitted|approved|rejected
            $table->string('requested_by', 256);                  // email AdminRegion
            $table->string('reviewed_by', 256)->nullable();       // email SuperAdmin
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
        });

        // ── 3. product_region_prices ─────────────────────────────────────────────
        // Harga satuan + biaya ongkir (per kg) + PPH + stok tersedia per produk per region.
        // Diisi awal via seeder, lalu diperbarui setiap kali ajuan stok disetujui SuperAdmin.
        Schema::create('product_region_prices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->foreign('product_id')->references('id')->on('product_master');
            $table->string('product_code', 20);
            $table->string('product_name', 100);
            $table->string('region', 100);
            $table->decimal('qty_available', 12, 2)->default(0);            // stok tersedia di region ini
            $table->decimal('harga_satuan', 15, 2)->default(0);             // Rp per TON
            $table->decimal('biaya_pengiriman_per_kg', 10, 2)->default(0);  // tarif ongkir Rp/kg
            $table->decimal('pajak_pph_persen', 5, 2)->default(0.25);
            $table->timestamp('effective_from')->nullable();
            $table->string('set_by', 256)->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'region']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_region_prices');
        Schema::dropIfExists('product_stock_requests');
        Schema::dropIfExists('product_master');

        // Pulihkan product_stock_requests versi lama (tanpa FK formal, kolom lama)
        Schema::create('product_stock_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->string('product_name', 255);
            $table->string('product_code', 100)->nullable();
            $table->string('region', 100);
            $table->integer('qty_requested');
            $table->decimal('harga_satuan', 15, 2)->nullable();
            $table->decimal('biaya_pengiriman', 15, 2)->nullable();
            $table->decimal('pajak_pph_persen', 5, 2)->nullable();
            $table->decimal('pajak_ppn_persen', 5, 2)->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('submitted');
            $table->string('requested_by', 256);
            $table->string('reviewed_by', 256)->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
        });

        Schema::create('product_region_prices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->string('product_name', 255);
            $table->string('product_code', 100)->nullable();
            $table->string('region', 100);
            $table->decimal('harga_satuan', 15, 2)->default(0);
            $table->decimal('biaya_pengiriman', 15, 2)->default(0);
            $table->decimal('pajak_pph_persen', 5, 2)->default(0.25);
            $table->decimal('pajak_ppn_persen', 5, 2)->default(11);
            $table->timestamp('effective_from')->nullable();
            $table->string('set_by', 256)->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'region']);
        });

    }
};
