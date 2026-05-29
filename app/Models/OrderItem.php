<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    // Kolom diasumsikan dari pola camelCase yang konsisten dengan tabel lain.
    // Sesuaikan properti jika nama kolom berbeda.
    protected $table = 'OrderItems';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $casts = [
        'createdAt' => 'datetime',
        'price'     => 'decimal:2',
        'subtotal'  => 'decimal:2',
        'quantity'  => 'integer',
    ];
}
