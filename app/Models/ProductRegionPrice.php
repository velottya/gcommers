<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductRegionPrice extends Model
{
    protected $table = 'product_region_prices';

    protected $fillable = [
        'product_id',
        'product_code',
        'product_name',
        'region',
        'qty_available',
        'harga_satuan',
        'biaya_pengiriman_per_kg',
        'pajak_pph_persen',
        'effective_from',
        'set_by',
    ];

    protected function casts(): array
    {
        return [
            'qty_available'          => 'decimal:2',
            'harga_satuan'           => 'decimal:2',
            'biaya_pengiriman_per_kg'=> 'decimal:2',
            'pajak_pph_persen'       => 'decimal:2',
            'effective_from'         => 'datetime',
        ];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
