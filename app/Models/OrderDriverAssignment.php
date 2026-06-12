<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderDriverAssignment extends Model
{
    protected $table    = 'order_driver_assignments';
    protected $fillable = ['order_id', 'transportir_email', 'assigned_by', 'note'];
}
