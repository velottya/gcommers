<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $table      = 'OrderItems';
    protected $primaryKey = 'Id';
    public    $timestamps = false;

    protected $casts = [
        'Quantity'   => 'integer',
        'UnitPrice'  => 'decimal:2',
        'TotalPrice' => 'decimal:2',
    ];

    public function product()
    {
        return $this->belongsTo(CatalogProduct::class, 'ProductId', 'Id');
    }

    /**
     * Kode produk diturunkan dari Products.ProductCode lewat ProductId, bukan
     * kolom baru di OrderItems — supaya selalu sinkron dengan katalog & tetap
     * jadi kunci silang yang valid ke kecamatan_product_prices/kecamatan_product_stocks
     * (product_id di kedua tabel itu sama-sama mengacu ke Products.Id).
     */
    public function getProductCodeAttribute(): ?string
    {
        return $this->product?->ProductCode;
    }
}
