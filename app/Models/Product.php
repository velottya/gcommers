<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $table = 'product_master';

    protected $fillable = [
        'kode_produk',
        'nama_produk',
        'uraian',
        'satuan',
        'status',
        'jenis',
        'foto',
    ];

    public function stockRequests()
    {
        return $this->hasMany(ProductStockRequest::class);
    }

    public function regionPrices()
    {
        return $this->hasMany(ProductRegionPrice::class);
    }
}
