<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Biaya pengiriman dihapus sebagai komponen biaya terpisah pada pemesanan
 * kios — harga satuan produk (Rp/kg) yang diatur AdminRegion sekarang sudah
 * dianggap include ongkos kirim. Tarif per mitra transportir
 * (`transport_partner_rates`) TETAP ADA, tapi sekarang murni internal
 * (assignment per order lewat `Orders.Vendor`, dan dasar hitung Tagihan
 * Transport) — tidak lagi disinkronkan ke tabel current-state yang dibaca
 * Flutter Kiosk untuk katalog/harga.
 *
 * CATATAN: migration ini SENGAJA drop kolom yang sudah ada di `Orders` dan
 * `kecamatan_product_prices` (keduanya tabel bersama dengan Flutter app,
 * lihat docs/ORDER_FLOW_CONTRACT.md) — pelanggaran aturan "additive-only"
 * yang disengaja, dikoordinasikan terpisah dengan sisi Flutter.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('Orders', 'ShippingAmount')) {
            Schema::table('Orders', function (Blueprint $table) {
                $table->dropColumn('ShippingAmount');
            });
        }

        Schema::table('kecamatan_product_prices', function (Blueprint $table) {
            $columns = array_filter(['biaya_pengiriman', 'transport_partner'], fn ($c) => Schema::hasColumn('kecamatan_product_prices', $c));
            if ($columns) {
                $table->dropColumn($columns);
            }
        });

        // Hanya pernah dipakai ShippingAllocationController (sudah dihapus) untuk
        // menulis, dan CostRateController::refreshCurrentPrices() untuk membaca
        // (juga sudah dihapus di migration ini) — tidak ada pembaca/penulis lagi.
        Schema::dropIfExists('kecamatan_shipping_rates');
    }

    public function down(): void
    {
        if (! Schema::hasColumn('Orders', 'ShippingAmount')) {
            Schema::table('Orders', function (Blueprint $table) {
                $table->decimal('ShippingAmount', 16, 2)->default(0);
            });
        }

        Schema::table('kecamatan_product_prices', function (Blueprint $table) {
            if (! Schema::hasColumn('kecamatan_product_prices', 'biaya_pengiriman')) {
                $table->decimal('biaya_pengiriman', 12, 2)->nullable();
            }
            if (! Schema::hasColumn('kecamatan_product_prices', 'transport_partner')) {
                $table->string('transport_partner', 200)->nullable();
            }
        });

        Schema::create('kecamatan_shipping_rates', function (Blueprint $table) {
            $table->id();
            $table->string('region', 100);
            $table->string('kecamatan', 150);
            $table->string('transport_partner', 200);
            $table->decimal('biaya_pengiriman', 12, 2);
            $table->unsignedBigInteger('submission_id')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->unique('kecamatan');
        });
    }
};
