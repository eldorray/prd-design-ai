<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Admin account, seeded with a fixed password so the same command works on
 * every environment including production.
 *
 * The password is a known value, so change it from Settings > Security after
 * the first login on any deployment that is reachable from the internet. This
 * account carries admin rights and a large AI token quota billed to the
 * project's own provider keys.
 */
class AdminSeeder extends Seeder
{
    public const EMAIL = 'fahmie@gmail.com';

    public const PASSWORD = 'password';

    public function run(): void
    {
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
