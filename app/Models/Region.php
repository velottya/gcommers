<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Region extends Model
{
    protected $table = 'region';

    public function propinsis()
    {
        return $this->hasMany(Propinsi::class, 'id_reg');
    }
}
