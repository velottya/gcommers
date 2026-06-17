<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductStockRequest extends Model
{
    protected $table = 'product_stock_requests';

    protected $fillable = [
        'product_id',
        'product_code',
        'product_name',
        'region',
        'qty_requested',
        'harga_satuan',
        'biaya_pengiriman_per_kg',
        'pajak_pph_persen',
        'notes',
        'status',
        'requested_by',
        'reviewed_by',
        'reviewed_at',
        'review_note',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at'            => 'datetime',
            'qty_requested'          => 'integer',
            'harga_satuan'           => 'decimal:2',
            'biaya_pengiriman_per_kg'=> 'decimal:2',
            'pajak_pph_persen'       => 'decimal:2',
        ];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
