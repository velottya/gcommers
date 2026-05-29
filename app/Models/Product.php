<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $table = 'Products';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $casts = [
        'createdAt'    => 'datetime',
        'updateAt'     => 'datetime', // typo di schema asli
        'price'        => 'decimal:2',
        'stock'        => 'integer',
        'minimumOrder' => 'integer',
        'rating'       => 'float',
    ];
}
