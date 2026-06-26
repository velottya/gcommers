<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Tabel `Products` (PascalCase, bukan `product_master`) — katalog produk asli
 * dari sisi Flutter/pemesanan. OrderItems.ProductId dan kecamatan_product_prices/
 * kecamatan_product_stocks.product_id sama-sama mengacu ke tabel ini.
 */
class CatalogProduct extends Model
{
    protected $table      = 'Products';
    protected $primaryKey = 'Id';
    public    $timestamps = false;
}
