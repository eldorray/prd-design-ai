<?php

use App\Models\User;
use Database\Seeders\AdminSeeder;
use Illuminate\Support\Facades\Hash;

test('the seeder creates a working admin account', function () {
    $this->seed(AdminSeeder::class);

    $user = User::where('email', AdminSeeder::EMAIL)->firstOrFail();

    expect($user->isAdmin())->toBeTrue()
        ->and($user->status)->toBe('active')
        ->and($user->token_quota)->toBe(1_000_000)
        ->and(Hash::check(AdminSeeder::PASSWORD, $user->password))->toBeTrue();
});

test('running the seeder twice does not duplicate the account', function () {
    $this->seed(AdminSeeder::class);
    $this->seed(AdminSeeder::class);

    expect(User::where('email', AdminSeeder::EMAIL)->count())->toBe(1);
});

test('the seeder refuses to run in production', function () {
    // Laravel already prompts before `db:seed` in production, but a deploy
    // script running `db:seed --force` walks straight past that. The password
    // here is a known value and this account controls AI token quota, so the
    // seeder blocks itself too. Invoked directly to test that guard rather
    // than the console confirmation in front of it.
    app()->detectEnvironment(fn (): string => 'production');

    (new AdminSeeder)->run();

    expect(User::where('email', AdminSeeder::EMAIL)->exists())->toBeFalse();
});
