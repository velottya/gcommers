<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const VALID_REGIONS = [
        'Jawa Timur',
        'Jawa Tengah Selatan',
        'Jawa Tengah Utara',
        'Makassar',
        'Medan',
        'Lampung',
    ];

    public function up(): void
    {
        $list = implode("','", self::VALID_REGIONS);

        DB::statement("ALTER TABLE product_stock_requests ADD CONSTRAINT chk_psr_region CHECK (region IN ('{$list}'))");
        DB::statement("ALTER TABLE product_region_prices  ADD CONSTRAINT chk_prp_region CHECK (region IN ('{$list}'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE product_stock_requests DROP CONSTRAINT chk_psr_region');
        DB::statement('ALTER TABLE product_region_prices  DROP CONSTRAINT chk_prp_region');
    }
};
