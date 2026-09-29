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

test('the quota resets at the start of each month', function () {
    $user = User::factory()->create(['role' => 'user', 'token_quota' => 1000]);

    $this->travelTo(now()->subMonth());
    $user->aiUsageLogs()->create(['model' => 'deepseek-v4-flash', 'mode' => 'generate', 'total_tokens' => 1000]);
    $this->travelBack();

    $user->aiUsageLogs()->create(['model' => 'deepseek-v4-flash', 'mode' => 'generate', 'total_tokens' => 300]);

    expect($user->remainingQuota())->toBe(700);
});

test('a reservation holds the prompt size on top of the completion estimate', function () {
    $user = User::factory()->create(['role' => 'user', 'token_quota' => 100000]);

    $reservation = AiQuota::reserve($user, 'deepseek-v4-flash', 'refine', 5000);

    expect($reservation->total_tokens)->toBe(AiQuota::ESTIMATE + 5000);
});

test('a prompt larger than the remaining quota is refused', function () {
    // Checking only "remaining > 0" let one token of balance pay for a 30k
    // token refine of a large design.
    $user = User::factory()->create(['role' => 'user', 'token_quota' => 10000]);

    expect(AiQuota::reserve($user, 'deepseek-v4-flash', 'refine', 20000))->toBeNull();
});

test('the prd assistant refuses a prompt the remaining quota cannot cover', function () {
    $user = User::factory()->create(['role' => 'user', 'token_quota' => 2000]);
    $this->actingAs($user);

    Http::fake();

    $this->postJson(route('prd-assistant.messages'), [
        'model' => 'deepseek-v4-flash',
        'mode' => 'refine',
        'draft' => str_repeat('Draft PRD panjang. ', 2000),
        'messages' => [['role' => 'user', 'content' => 'Rapikan bagian fitur']],
    ])->assertForbidden();

    Http::assertNothingSent();
});

test('the design stream refuses a prompt the remaining quota cannot cover', function () {
    $user = User::factory()->create(['role' => 'user', 'token_quota' => 2000]);

    $this->actingAs($user)
        ->postJson(route('design-assistant.stream'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'refine',
            'kind' => 'landing-page',
            'prompt' => 'Ubah warna tombol',
            'current_html' => '<html><body>'.str_repeat('<div class="card">Konten</div>', 1000).'</body></html>',
        ])
        ->assertForbidden();

    expect($user->aiUsageLogs()->count())->toBe(0);
});
