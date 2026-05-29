<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Nama model SystemNotification untuk menghindari konflik dengan
// Illuminate\Notifications\Notification bawaan Laravel.
class SystemNotification extends Model
{
    protected $table = 'Notifications';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = ['isRead'];

    protected $casts = [
        'createdAt' => 'datetime',
        'isRead'    => 'boolean',
    ];
}
