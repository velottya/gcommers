<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderEvent extends Model
{
    // Kolom diasumsikan dari pola camelCase yang konsisten dengan tabel lain.
    // Sesuaikan properti jika nama kolom berbeda.
    protected $table = 'OrderEvents';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $casts = [
        'createdAt' => 'datetime',
    ];
}
