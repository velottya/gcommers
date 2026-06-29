<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KecamatanProductPrice extends Model
{
    protected $table = 'kecamatan_product_prices';

    protected $fillable = [
        'region', 'kecamatan', 'product_id', 'product_code', 'product_name',
        'harga_satuan', 'submission_id', 'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'harga_satuan' => 'decimal:2',
            'approved_at'  => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(CostRateSubmission::class, 'submission_id');
    }
}
