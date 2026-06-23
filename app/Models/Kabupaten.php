<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Kabupaten extends Model
{
    protected $table = 'kabupaten';

    public function propinsi()
    {
        return $this->belongsTo(Propinsi::class, 'id_pro');
    }

    public function kecamatans()
    {
        return $this->hasMany(Kecamatan::class, 'id_kab');
    }
}
