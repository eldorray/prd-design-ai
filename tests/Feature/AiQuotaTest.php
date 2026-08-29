<?php

use App\Models\AiUsageLog;
use App\Models\User;
use App\Support\AiQuota;
use Illuminate\Support\Facades\Http;

test('a reservation is debited before the provider answers', function () {
    $user = User::factory()->create(['role' => 'user', 'token_quota' => 100000]);

    $reservation = AiQuota::reserve($user, 'deepseek-v4-flash', 'generate');

    expect($reservation)->not->toBeNull()
        ->and($reservation->total_tokens)->toBe(AiQuota::ESTIMATE)
        ->and($user->remainingQuota())->toBe(100000 - AiQuota::ESTIMATE);
});

test('a parallel burst cannot clear a quota that only covers one request', function () {
    // The design studio fires one request per selected canvas at the same
    // time. Before reservations existed, all three read the same balance and
    // all three were allowed through.
    $user = User::factory()->create(['role' => 'user', 'token_quota' => AiQuota::ESTIMATE]);

    $first = AiQuota::reserve($user, 'deepseek-v4-flash', 'generate');
    $second = AiQuota::reserve($user, 'deepseek-v4-flash', 'generate');
    $third = AiQuota::reserve($user, 'deepseek-v4-flash', 'generate');

    expect($first)->not->toBeNull()
        ->and($second)->toBeNull()
        ->and($third)->toBeNull();
});

test('settling replaces the estimate with the real token count', function () {
    $user = User::factory()->create(['role' => 'user', 'token_quota' => 100000]);

    $reservation = AiQuota::reserve($user, 'deepseek-v4-flash', 'generate');
    AiQuota::settle($reservation, 137);

    expect($user->remainingQuota())->toBe(100000 - 137);
});

test('admins are exempt from the balance but still recorded', function () {
    $admin = User::factory()->create(['role' => 'admin', 'token_quota' => 0]);

    $reservation = AiQuota::reserve($admin, 'deepseek-v4-flash', 'generate');

    expect($reservation)->not->toBeNull()
        ->and($reservation->total_tokens)->toBe(0);

    AiQuota::settle($reservation, 500);

    expect((int) $admin->aiUsageLogs()->sum('total_tokens'))->toBe(500);
});

test('a provider error refunds the reservation', function () {
    $user = User::factory()->create(['role' => 'user', 'token_quota' => 100000]);
    $this->actingAs($user);

    Http::fake(['*' => Http::response(['error' => 'upstream exploded'], 500)]);

    $this->postJson(route('prd-assistant.messages'), [
        'model' => 'deepseek-v4-flash',
        'mode' => 'generate',
        'messages' => [['role' => 'user', 'content' => 'Write a PRD']],
    ])->assertStatus(502);

    expect($user->aiUsageLogs()->count())->toBe(0)
        ->and($user->remainingQuota())->toBe(100000);
});

test('usage logs record when they happened', function () {
    // The model used to disable timestamps entirely, which wrote a NULL
    // created_at on every row and made usage impossible to report over time.
    $user = User::factory()->create(['role' => 'user', 'token_quota' => 100000]);

    $log = AiUsageLog::create([
        'user_id' => $user->id,
        'model' => 'deepseek-v4-flash',
        'mode' => 'generate',
        'total_tokens' => 10,
    ]);

    expect($log->fresh()->created_at)->not->toBeNull();
});
