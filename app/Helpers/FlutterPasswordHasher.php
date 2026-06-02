<?php

namespace App\Helpers;

/**
 * Replicates PasswordHasher dari AuthDatabase.cs (backend C# Flutter):
 *
 *   Iterations = 100_000
 *   SaltSize   = 16 bytes
 *   KeySize    = 32 bytes
 *   Algorithm  = PBKDF2-HMAC-SHA256  (Rfc2898DeriveBytes)
 */
class FlutterPasswordHasher
{
    private const ITERATIONS = 100_000;
    private const SALT_SIZE  = 16;
    private const KEY_SIZE   = 32;

    /**
     * Hash a plain-text password.
     *
     * @return array{salt: string, hash: string}  Raw binary strings.
     */
    public static function hash(string $password): array
    {
        $salt = random_bytes(self::SALT_SIZE);
        $hash = hash_pbkdf2('sha256', $password, $salt, self::ITERATIONS, self::KEY_SIZE, true);

        return ['salt' => $salt, 'hash' => $hash];
    }

    /**
     * Verify a plain-text password against stored salt + hash (raw binary).
     */
    public static function verify(string $password, string $salt, string $expectedHash): bool
    {
        $hash = hash_pbkdf2('sha256', $password, $salt, self::ITERATIONS, strlen($expectedHash), true);

        return hash_equals($expectedHash, $hash);
    }

    /**
     * Return SQL Server binary literals for use with DB::raw().
     * e.g. ["0xABCDEF...", "0x123456..."]
     *
     * @return array{saltLiteral: string, hashLiteral: string}
     */
    public static function hashToSqlLiterals(string $password): array
    {
        ['salt' => $salt, 'hash' => $hash] = self::hash($password);

        return [
            'saltLiteral' => '0x' . strtoupper(bin2hex($salt)),
            'hashLiteral' => '0x' . strtoupper(bin2hex($hash)),
        ];
    }
}
