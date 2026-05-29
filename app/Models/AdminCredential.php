<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminCredential extends Model
{
    protected $table = 'admin_credentials';

    protected $fillable = ['user_id', 'password', 'last_login_at'];

    protected $hidden = ['password'];

    protected $casts = [
        'last_login_at' => 'datetime',
    ];
}
