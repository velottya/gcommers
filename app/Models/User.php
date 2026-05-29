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

    public const ADMIN_ROLES = [
        'SuperAdmin',
        'AdminRegion',
        'AdminTransport',
    ];

    public const ADMIN_ROLE_STORAGE_MAP = [
        'SuperAdmin' => 'superadmin',
        'AdminRegion' => 'admin',
        'AdminTransport' => 'transportir',
    ];

    private const ADMIN_ROLE_STORAGE_LOOKUP = [
        'superadmin' => 'SuperAdmin',
        'admin' => 'AdminRegion',
        'transportir' => 'AdminTransport',
    ];

    public const ADMIN_ROLE_DATABASE_VALUES = [
        'superadmin',
        'admin',
        'transportir',
        'SuperAdmin',
        'AdminRegion',
        'AdminTransport',
    ];

    private const ROLE_ALIASES = [
        'superadmin' => 'SuperAdmin',
        'adminregion' => 'AdminRegion',
        'admintransport' => 'AdminTransport',
    ];

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
        'PasswordHash',
        'PasswordSalt',
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

    public function getRoleAttribute(?string $value): string
    {
        $normalized = strtolower(trim($value ?? ''));

        return self::ROLE_ALIASES[$normalized]
            ?? self::ADMIN_ROLE_STORAGE_LOOKUP[$normalized]
            ?? trim($value ?? '');
    }

    public function isAdminRole(): bool
    {
        return in_array($this->Role, self::ADMIN_ROLES, true);
    }

    public static function normalizeAdminRoleForStorage(string $role): string
    {
        $trimmed = trim($role);

        if (array_key_exists($trimmed, self::ADMIN_ROLE_STORAGE_MAP)) {
            return self::ADMIN_ROLE_STORAGE_MAP[$trimmed];
        }

        $normalized = strtolower($trimmed);

        if (array_key_exists($normalized, self::ADMIN_ROLE_STORAGE_LOOKUP)) {
            return self::ADMIN_ROLE_STORAGE_MAP[self::ADMIN_ROLE_STORAGE_LOOKUP[$normalized]];
        }

        return $normalized;
    }

    public static function adminRoleDatabaseValues(): array
    {
        return self::ADMIN_ROLE_DATABASE_VALUES;
    }

    public function getAuthPassword(): string
    {
        return (string) ($this->attributes['PasswordHash'] ?? '');
    }
}
