<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CostRateItem extends Model
{
    protected $table = 'cost_rate_items';

    protected $fillable = [
        'submission_id', 'product_id', 'product_code', 'product_name',
        'kecamatan', 'harga_satuan', 'biaya_pengiriman', 'status',
    ];

    protected function casts(): array
    {
        return [
            'harga_satuan'      => 'decimal:2',
            'biaya_pengiriman'  => 'decimal:2',
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(CostRateSubmission::class, 'submission_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
