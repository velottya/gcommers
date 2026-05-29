<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $table      = 'Products';
    protected $primaryKey = 'Id';
    public    $timestamps = false;

    protected $casts = [
        'CreatedAt'    => 'datetime',
        'UpdatedAt'    => 'datetime',
        'Price'        => 'decimal:2',
        'Stock'        => 'integer',
        'MinimumOrder' => 'integer',
        'Rating'       => 'float',
    ];
}
