<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $table = 'Users';

    protected $primaryKey = 'Id';

    public const CREATED_AT = 'CreatedAt';

    public const UPDATED_AT = 'UpdatedAt';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'Email',
        'DisplayName',
        'Role',
        'Region',
        'Type',
        'KioskName',
        'CompanyName',
        'TransportirName',
        'PoliceNumber',
        'Phone',
        'Address',
        'PicName',
        'LicenseImageName',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'PasswordHash',
        'PasswordSalt',
        'ResetOtpHash',
        'ResetOtpSalt',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'CreatedAt' => 'datetime',
            'UpdatedAt' => 'datetime',
            'ResetOtpExpiresAt' => 'datetime',
            'ResetOtpVerifiedAt' => 'datetime',
            'LastFailedLoginAt' => 'datetime',
            'LockoutUntil' => 'datetime',
            'FailedLoginCount' => 'integer',
        ];
    }

    public function getAuthIdentifierName(): string
    {
        return 'Id';
    }

    public function getAuthPassword(): string
    {
        return (string) ($this->attributes['PasswordHash'] ?? '');
    }
}
