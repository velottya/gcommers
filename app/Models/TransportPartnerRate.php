<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransportPartnerRate extends Model
{
    protected $table = 'transport_partner_rates';

    protected $fillable = [
        'region', 'company_name', 'kecamatan_id', 'shipping_cost_per_kg', 'set_by',
    ];

    protected function casts(): array
    {
        return [
            'shipping_cost_per_kg' => 'decimal:2',
        ];
    }

    public function kecamatan(): BelongsTo
    {
        return $this->belongsTo(Kecamatan::class, 'kecamatan_id');
    }

    /**
     * Tarif satu mitra untuk satu kiosk: pakai tarif khusus kecamatan kalau sudah
     * diatur admin, kalau belum jatuh ke tarif default per-region milik mitra tsb.
     */
    public static function resolveRate(?string $region, $kecamatanId, string $companyName): ?float
    {
        if (! $region) {
            return null;
        }

        $base = static::where('region', $region)->where('company_name', $companyName);

        if ($kecamatanId) {
            $specific = (clone $base)->where('kecamatan_id', $kecamatanId)->value('shipping_cost_per_kg');
            if ($specific !== null) {
                return (float) $specific;
            }
        }

        $fallback = (clone $base)->whereNull('kecamatan_id')->value('shipping_cost_per_kg');

        return $fallback !== null ? (float) $fallback : null;
    }

    /**
     * Prefetch semua tarif (region-default + per-kecamatan) satu mitra untuk
     * dipakai berulang lewat lookupFromMap() tanpa query per baris.
     */
    public static function rateMapFor(string $companyName, array $regions): array
    {
        $map = [];
        foreach (static::where('company_name', $companyName)->whereIn('region', array_filter($regions))->get() as $r) {
            $map[$r->region . '|' . ($r->kecamatan_id ?? '')] = (float) $r->shipping_cost_per_kg;
        }

        return $map;
    }

    public static function lookupFromMap(array $map, ?string $region, $kecamatanId): ?float
    {
        if (! $region) {
            return null;
        }

        if ($kecamatanId && array_key_exists($region . '|' . $kecamatanId, $map)) {
            return $map[$region . '|' . $kecamatanId];
        }

        return $map[$region . '|'] ?? null;
    }
}
