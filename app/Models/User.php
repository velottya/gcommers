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

    public const VALID_REGIONS = [
        'Jawa Timur',
        'Jawa Tengah Selatan',
        'Jawa Tengah Utara',
        'Makassar',
        'Medan',
        'Lampung',
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
        'Kecamatan',
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
        'ProvinsiId',
        'KabupatenId',
        'KecamatanId',
        'Kelurahan',
        'KodePos',
        'Latitude',
        'Longitude',
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
            'Latitude' => 'decimal:6',
            'Longitude' => 'decimal:6',
        ];
    }

    public function propinsi()
    {
        return $this->belongsTo(Propinsi::class, 'ProvinsiId');
    }

    public function kabupaten()
    {
        return $this->belongsTo(Kabupaten::class, 'KabupatenId');
    }

    public function kecamatan()
    {
        return $this->belongsTo(Kecamatan::class, 'KecamatanId');
    }

    // Wilayah kerja AdminTransport: banyak kecamatan.
    public function kecamatans()
    {
        // withTimestamps() butuh nama kolom eksplisit di sini: User::CREATED_AT/UPDATED_AT
        // ('CreatedAt'/'UpdatedAt') tidak cocok dengan kolom pivot user_kecamatans yang
        // dibuat lewat $table->timestamps() biasa (created_at/updated_at).
        return $this->belongsToMany(Kecamatan::class, 'user_kecamatans', 'user_id', 'kecamatan_id')
            ->withTimestamps('created_at', 'updated_at');
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
