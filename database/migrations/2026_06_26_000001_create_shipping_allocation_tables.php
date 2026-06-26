<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Alokasi biaya pengiriman per kecamatan dipisah dari Harga Produk (cost_rate_*).
 * Sebelumnya transport_partner/biaya_pengiriman menempel di tiap baris produk x
 * kecamatan, padahal ongkir semestinya soal "kecamatan ini dikirim mitra apa",
 * lepas dari produk yang dikirim. Aturan baru: 1 kecamatan = 1 mitra transportir.
 */
return new class extends Migration
{
    private const VALID_REGIONS = [
        'Jawa Timur', 'Jawa Tengah Selatan', 'Jawa Tengah Utara',
        'Makassar', 'Medan', 'Lampung',
    ];

    public function up(): void
    {
        Schema::create('shipping_allocation_submissions', function (Blueprint $table) {
            $table->id();
            $table->string('region', 100);
            $table->string('status', 20)->default('draft');
            $table->text('notes')->nullable();
            $table->string('submitted_by', 256);
            $table->string('reviewed_by', 256)->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
        });

        $regions = implode("','", self::VALID_REGIONS);
        DB::statement("ALTER TABLE shipping_allocation_submissions ADD CONSTRAINT chk_sas_region CHECK (region IN ('{$regions}'))");

        Schema::create('shipping_allocation_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('submission_id');
            $table->foreign('submission_id')
                  ->references('id')->on('shipping_allocation_submissions')
                  ->cascadeOnDelete();
            $table->string('kecamatan', 150);
            $table->string('transport_partner', 200);
            $table->decimal('biaya_pengiriman', 12, 2);
            $table->string('status', 20)->default('pending');
            $table->timestamps();
            $table->unique(['submission_id', 'kecamatan']);
        });

        Schema::create('kecamatan_shipping_rates', function (Blueprint $table) {
            $table->id();
            $table->string('region', 100);
            $table->string('kecamatan', 150);
            $table->string('transport_partner', 200);
            $table->decimal('biaya_pengiriman', 12, 2);
            $table->unsignedBigInteger('submission_id')->nullable();
            $table->foreign('submission_id')
                  ->references('id')->on('shipping_allocation_submissions')
                  ->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->unique('kecamatan');
        });

        $this->migrateExistingPartnerData();
    }

    /**
     * cost_rate_items lama menyimpan transport_partner+biaya_pengiriman per baris
     * produk x kecamatan, kadang beda mitra untuk produk berbeda di kecamatan yang
     * sama. Konsolidasikan ke 1 mitra per kecamatan (mitra yang paling sering
     * dipakai, ambil yang pertama kalau seri) supaya data lama tidak hilang sama
     * sekali, lalu pindahkan ke struktur baru sebagai 1 ajuan per region yang
     * sudah approved (mengikuti status ajuan asalnya).
     */
    private function migrateExistingPartnerData(): void
    {
        if (! Schema::hasColumn('cost_rate_items', 'transport_partner')) {
            return;
        }

        $rows = DB::table('cost_rate_items')
            ->join('cost_rate_submissions', 'cost_rate_submissions.id', '=', 'cost_rate_items.submission_id')
            ->whereNotNull('cost_rate_items.transport_partner')
            ->select(
                'cost_rate_submissions.region',
                'cost_rate_items.kecamatan',
                'cost_rate_items.transport_partner',
                'cost_rate_items.biaya_pengiriman',
                'cost_rate_submissions.submitted_by',
                'cost_rate_submissions.reviewed_by'
            )
            ->get();

        if ($rows->isEmpty()) {
            return;
        }

        $now = now();

        foreach ($rows->groupBy('region') as $region => $regionRows) {
            $submissionId = DB::table('shipping_allocation_submissions')->insertGetId([
                'region'       => $region,
                'status'       => 'approved',
                'notes'        => 'Dipindahkan otomatis dari data Alokasi Biaya lama.',
                'submitted_by' => $regionRows->first()->submitted_by,
                'reviewed_by'  => $regionRows->first()->reviewed_by,
                'reviewed_at'  => $now,
                'review_note'  => 'Migrasi otomatis.',
                'created_at'   => $now,
                'updated_at'   => $now,
            ]);

            foreach ($regionRows->groupBy('kecamatan') as $kecamatan => $kecRows) {
                $winner = $kecRows->groupBy('transport_partner')
                    ->map(fn ($g) => ['partner' => $g->first()->transport_partner, 'biaya' => $g->first()->biaya_pengiriman, 'count' => $g->count()])
                    ->sortByDesc('count')
                    ->first();

                DB::table('shipping_allocation_items')->insert([
                    'submission_id'     => $submissionId,
                    'kecamatan'         => $kecamatan,
                    'transport_partner' => $winner['partner'],
                    'biaya_pengiriman'  => $winner['biaya'],
                    'status'            => 'approved',
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ]);

                DB::table('kecamatan_shipping_rates')->updateOrInsert(
                    ['kecamatan' => $kecamatan],
                    [
                        'region'            => $region,
                        'transport_partner' => $winner['partner'],
                        'biaya_pengiriman'  => $winner['biaya'],
                        'submission_id'     => $submissionId,
                        'approved_at'       => $now,
                        'updated_at'        => $now,
                        'created_at'        => $now,
                    ]
                );

                // Selaraskan current-state lama (dibaca app Flutter) supaya tetap konsisten.
                DB::table('kecamatan_product_prices')
                    ->where('kecamatan', $kecamatan)
                    ->update([
                        'transport_partner' => $winner['partner'],
                        'biaya_pengiriman'  => $winner['biaya'],
                    ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('kecamatan_shipping_rates');
        Schema::dropIfExists('shipping_allocation_items');
        Schema::dropIfExists('shipping_allocation_submissions');
    }
};
