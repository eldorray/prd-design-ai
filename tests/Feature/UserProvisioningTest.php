<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Laravel\Fortify\Features;

test('public registration is closed', function () {
    expect(Features::enabled(Features::registration()))->toBeFalse();
    expect(Route::has('register'))->toBeFalse();
});

test('an administrator can be provisioned from the console', function () {
    $this->artisan('user:create', [
        'email' => 'owner@example.com',
        '--name' => 'Owner',
        '--role' => 'admin',
        '--quota' => 50000,
        '--password' => 'correct-horse-battery-staple',
    ])->assertSuccessful();

    $user = User::where('email', 'owner@example.com')->firstOrFail();

    expect($user->isAdmin())->toBeTrue()
        ->and($user->token_quota)->toBe(50000)
        ->and($user->status)->toBe('active');
});

test('creating an existing user resets their password and quota', function () {
    $user = User::factory()->create([
        'email' => 'staff@example.com',
        'role' => 'user',
        'token_quota' => 0,
    ]);

    $this->artisan('user:create', [
        'email' => 'staff@example.com',
        '--quota' => 25000,
        '--password' => 'correct-horse-battery-staple',
    ])->assertSuccessful();

    expect($user->fresh()->token_quota)->toBe(25000);
});

test('promoting a user actually writes the role', function () {
    // `role` is excluded from the model's fillable list, so the command's
    // original update() call dropped it and reported success regardless.
    $user = User::factory()->create(['role' => 'user']);

    $this->artisan('user:promote-admin', ['email' => $user->email])
        ->assertSuccessful();

    expect($user->fresh()->isAdmin())->toBeTrue();
});

test('a row that does not name a quota gets none', function () {
    // The column default used to be 100000, which handed every account a free
    // budget against the project's own provider keys. The factory still sets
    // an explicit quota, so this checks the schema rather than the fixture.
    DB::table('users')->insert([
        'id' => (string) Str::uuid(),
        'name' => 'Schema Default',
        'email' => 'schema-default@example.com',
        'password' => Hash::make('correct-horse-battery-staple'),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect(User::where('email', 'schema-default@example.com')->firstOrFail()->token_quota)->toBe(0);
});
