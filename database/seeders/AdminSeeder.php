<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Local development admin account.
 *
 * Deliberately refuses to run in production: the password here is a known
 * value, and this application's admin panel hands out AI token quota against
 * the project's own provider keys. Provision production accounts with
 * `php artisan user:create`, which prompts for a password instead.
 */
class AdminSeeder extends Seeder
{
    public const EMAIL = 'fahmie@gmail.com';

    public const PASSWORD = 'password';

    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->error(
                'AdminSeeder dilewati: password-nya nilai yang sudah diketahui umum. '
                .'Untuk production pakai: php artisan user:create '.self::EMAIL.' --role=admin --quota=1000000'
            );

            return;
        }

        $user = User::firstOrNew(['email' => self::EMAIL]);

        $user->name = $user->name ?: 'Fahmie';
        $user->password = self::PASSWORD;
        $user->email_verified_at ??= now();

        // Explicit writes: role, token_quota and status are deliberately left
        // out of the User model's fillable list, so mass assignment drops them.
        $user->role = 'admin';
        $user->token_quota = 1_000_000;
        $user->status = 'active';

        $user->save();

        $this->command?->info('Admin siap: '.self::EMAIL.' / '.self::PASSWORD);
    }
}
