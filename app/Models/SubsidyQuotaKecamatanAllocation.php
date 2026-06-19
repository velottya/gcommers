<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubsidyQuotaKecamatanAllocation extends Model
{
    protected $table = 'subsidy_quota_kecamatan_allocations';

    protected $fillable = [
        'quota_product_id', 'kecamatan', 'qty_ton', 'status',
    ];

    protected function casts(): array
    {
        return [
            'qty_ton' => 'decimal:2',
        ];
    }

    public function quotaProduct(): BelongsTo
    {
        return $this->belongsTo(SubsidyQuotaProduct::class, 'quota_product_id');
    }
}
