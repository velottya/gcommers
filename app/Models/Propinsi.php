<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Propinsi extends Model
{
    protected $table = 'propinsi';

    public function region()
    {
        return $this->belongsTo(Region::class, 'id_reg');
    }

    public function kabupatens()
    {
        return $this->hasMany(Kabupaten::class, 'id_pro');
    }
}
