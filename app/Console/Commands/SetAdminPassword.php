<?php

namespace App\Console\Commands;

use App\Models\AdminCredential;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SetAdminPassword extends Command
{
    protected $signature = 'admin:set-password {email} {password}';

    protected $description = 'Set atau reset password admin console untuk user berdasarkan email';

    public function handle(): int
    {
        $email    = $this->argument('email');
        $password = $this->argument('password');
        $passwordHash = Hash::make($password);
        $passwordSalt = Str::random(32);

        $user = User::where('Email', $email)
            ->whereIn('Role', User::adminRoleDatabaseValues())
            ->first();

        if (! $user) {
            $this->error("User admin dengan email '{$email}' tidak ditemukan.");
            return Command::FAILURE;
        }

        AdminCredential::updateOrCreate(
            ['user_id' => (string) $user->Id],
            ['password' => $passwordHash]
        );

        $user->update([
            'PasswordHash' => DB::raw($this->toVarbinaryExpression($passwordHash)),
            'PasswordSalt' => DB::raw($this->toVarbinaryExpression($passwordSalt)),
        ]);

        $this->info("Password admin console berhasil di-set untuk: {$email} ({$user->Role})");

        return Command::SUCCESS;
    }

    private function toVarbinaryExpression(string $value): string
    {
        $escapedValue = str_replace("'", "''", $value);

        return "CONVERT(VARBINARY(MAX), '{$escapedValue}')";
    }
}
