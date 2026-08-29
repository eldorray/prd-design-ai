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

test('the seeder also runs in production', function () {
    // Intentional: the same seeding command is used on every environment.
    app()->detectEnvironment(fn (): string => 'production');

    (new AdminSeeder)->run();

    $user = User::where('email', AdminSeeder::EMAIL)->firstOrFail();

    expect($user->isAdmin())->toBeTrue()
        ->and(Hash::check(AdminSeeder::PASSWORD, $user->password))->toBeTrue();
});
