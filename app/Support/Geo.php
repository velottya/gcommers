<?php

namespace App\Support;

class Geo
{
    private const EARTH_RADIUS_METERS = 6371000;

    public static function haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $lat1Rad = deg2rad($lat1);
        $lat2Rad = deg2rad($lat2);
        $dLat    = deg2rad($lat2 - $lat1);
        $dLng    = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2 + cos($lat1Rad) * cos($lat2Rad) * sin($dLng / 2) ** 2;

        return self::EARTH_RADIUS_METERS * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
