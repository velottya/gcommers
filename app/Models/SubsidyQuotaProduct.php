<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubsidyQuotaProduct extends Model
{
    protected $table = 'subsidy_quota_products';

    protected $fillable = [
        'submission_id', 'product_id', 'product_code', 'product_name', 'total_qty_ton',
    ];

    protected function casts(): array
    {
        return [
            'total_qty_ton' => 'decimal:2',
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(SubsidyQuotaSubmission::class, 'submission_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function kioskAllocations(): HasMany
    {
        return $this->hasMany(SubsidyQuotaKioskAllocation::class, 'quota_product_id');
    }
}
