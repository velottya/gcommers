<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PPh dihapus dari Alokasi Biaya. Biaya pengiriman kini diturunkan otomatis
 * dari tarif mitra transportir yang dipilih per baris kecamatan, bukan
 * diketik manual.
 */
return new class extends Migration
{
    private const VALID_REGIONS = [
        'Jawa Timur', 'Jawa Tengah Selatan', 'Jawa Tengah Utara',
        'Makassar', 'Medan', 'Lampung',
    ];

    public function up(): void
    {
        Schema::table('cost_rate_submissions', function (Blueprint $table) {
            $table->dropColumn('pph_persen');
        });

        Schema::table('cost_rate_items', function (Blueprint $table) {
            $table->string('transport_partner', 200)->nullable()->after('kecamatan');
        });

        Schema::table('kecamatan_product_prices', function (Blueprint $table) {
            $table->dropColumn('pph_persen');
            $table->string('transport_partner', 200)->nullable()->after('biaya_pengiriman');
        });

        Schema::create('transport_partner_rates', function (Blueprint $table) {
            $table->id();
            $table->string('region', 100);
            $table->string('company_name', 200);
            $table->decimal('shipping_cost_per_kg', 12, 2);
            $table->string('set_by', 256);
            $table->timestamps();
            $table->unique(['region', 'company_name']);
        });

        $regions = implode("','", self::VALID_REGIONS);
        DB::statement("ALTER TABLE transport_partner_rates ADD CONSTRAINT chk_tpr_region CHECK (region IN ('{$regions}'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('transport_partner_rates');

        Schema::table('kecamatan_product_prices', function (Blueprint $table) {
            $table->dropColumn('transport_partner');
            $table->decimal('pph_persen', 5, 2)->nullable();
        });

        Schema::table('cost_rate_items', function (Blueprint $table) {
            $table->dropColumn('transport_partner');
        });

        Schema::table('cost_rate_submissions', function (Blueprint $table) {
            $table->decimal('pph_persen', 5, 2)->nullable();
        });
    }
};
