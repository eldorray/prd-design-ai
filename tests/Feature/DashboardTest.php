<?php

use App\Models\User;
use Illuminate\Support\Carbon;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('the dashboard shares this month\'s token quota', function () {
    $user = User::factory()->create(['role' => 'user', 'token_quota' => 100000]);

    // Last month's usage has already been reset and must not count.
    $this->travelTo(Carbon::parse('2026-08-20 09:00:00'));
    $user->aiUsageLogs()->create(['model' => 'deepseek-v4-flash', 'mode' => 'generate', 'total_tokens' => 9000]);

    $this->travelTo(Carbon::parse('2026-09-15 10:00:00'));
    $user->aiUsageLogs()->create(['model' => 'deepseek-v4-flash', 'mode' => 'interview', 'total_tokens' => 1200]);
    $user->aiUsageLogs()->create(['model' => 'deepseek-v4-flash', 'mode' => 'generate', 'total_tokens' => 40000]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('quota.used', 41200)
            ->where('quota.limit', 100000)
            ->where('quota.resets_at', Carbon::parse('2026-10-01 00:00:00')->toIso8601String()));
});

test('admins see their usage without a quota limit', function () {
    $admin = User::factory()->create(['role' => 'admin', 'token_quota' => 0]);
    $admin->aiUsageLogs()->create(['model' => 'deepseek-v4-flash', 'mode' => 'generate', 'total_tokens' => 500]);

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('quota.used', 500)
            ->where('quota.limit', null)
            ->has('quota.resets_at'));
});
