<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $email       = 'superadmin@gcommers.id';
        $password    = Hash::make('Admin@1234');

        DB::statement(
            "IF NOT EXISTS (SELECT 1 FROM [Users] WHERE [Email] = ?)
             INSERT INTO [Users]
                 ([Email],[PasswordHash],[PasswordSalt],[Role],[DisplayName],[FailedLoginCount],[CreatedAt],[UpdatedAt])
             VALUES
                 (?,
                  HASHBYTES('SHA2_512', 'admin_placeholder'),
                  HASHBYTES('SHA2_256', 'admin_placeholder_salt'),
                  'superadmin', 'Super Admin GCommers', 0,
                  SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())",
            [$email, $email]
        );

        $userId = DB::table('Users')->where('Email', $email)->value('Id');

        DB::table('admin_credentials')->updateOrInsert(
            ['user_id' => $userId],
            ['password' => $password, 'updated_at' => now(), 'created_at' => now()]
        );

        $this->command->info('SuperAdmin seeded.');
        $this->command->table(
            ['Role', 'Email', 'Password'],
            [['SuperAdmin', $email, 'Admin@1234']]
        );
    }
}
