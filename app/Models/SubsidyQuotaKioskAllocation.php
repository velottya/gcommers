<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubsidyQuotaKioskAllocation extends Model
{
    protected $table = 'subsidy_quota_kiosk_allocations';

    protected $fillable = [
        'quota_product_id', 'kiosk_id', 'kiosk_name', 'kiosk_email', 'qty_ton',
    ];

    protected function casts(): array
    {
        return [
            'kiosk_id' => 'integer',
            'qty_ton'  => 'decimal:2',
        ];
    }

    public function quotaProduct(): BelongsTo
    {
        return $this->belongsTo(SubsidyQuotaProduct::class, 'quota_product_id');
    }
}
