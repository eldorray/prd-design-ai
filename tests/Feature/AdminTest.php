<?php

use App\Models\AiUsageLog;
use App\Models\Prd;
use App\Models\User;
use Illuminate\Support\Facades\Http;

test('guests are redirected from admin dashboard to login page', function () {
    $response = $this->get(route('admin.dashboard'));
    $response->assertRedirect(route('login'));
});

test('non-admin users cannot access admin dashboard', function () {
    $user = User::factory()->create(['role' => 'user']);
    $this->actingAs($user);

    $response = $this->get(route('admin.dashboard'));
    $response->assertForbidden();
});

test('admins can access admin dashboard and see analytics', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $user = User::factory()->create(['role' => 'user']);

    // Create some usage log
    AiUsageLog::create([
        'user_id' => $user->id,
        'model' => 'deepseek-v4-flash',
        'mode' => 'generate',
        'total_tokens' => 300,
    ]);

    $this->actingAs($admin);

    $response = $this->get(route('admin.dashboard'));
    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/dashboard')
            ->has('users')
            ->has('analytics')
            ->where('analytics.total_users', 2)
            ->where('analytics.total_tokens', 300)
        );
});

test('admins can update user details', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $user = User::factory()->create(['role' => 'user', 'token_quota' => 1000]);

    $this->actingAs($admin);

    $response = $this->put(route('admin.users.update', $user), [
        'role' => 'admin',
        'status' => 'blocked',
        'token_quota' => 50000,
    ]);

    $response->assertRedirect();
    $user->refresh();

    expect($user->role)->toBe('admin');
    expect($user->status)->toBe('blocked');
    expect($user->token_quota)->toBe(50000);
});

test('admins can delete users', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $user = User::factory()->create(['role' => 'user']);

    $this->actingAs($admin);

    $response = $this->delete(route('admin.users.destroy', $user));
    $response->assertRedirect();

    $this->assertModelMissing($user);
});

test('admins cannot delete themselves', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin);

    $response = $this->delete(route('admin.users.destroy', $admin));
    $response->assertRedirect();

    $this->assertModelExists($admin);
});

test('admins bypass PrdPolicy to manage standard users prds', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $user = User::factory()->create(['role' => 'user']);
    $prd = Prd::factory()->for($user)->create();

    $this->actingAs($admin);

    // Can update
    $responseUpdate = $this->putJson(route('prds.update', $prd), [
        'title' => 'Admin Updated Title',
        'idea' => $prd->idea,
        'model' => $prd->model,
        'content' => '# Admin content',
        'messages' => [],
    ]);
    $responseUpdate->assertOk();

    // Can delete
    $responseDelete = $this->delete(route('prds.destroy', $prd));
    $responseDelete->assertRedirect();
    $this->assertModelMissing($prd);
});

test('users with exhausted quota are blocked from generating PRD', function () {
    $user = User::factory()->create(['role' => 'user', 'token_quota' => 100]);

    // Exhaust user quota
    AiUsageLog::create([
        'user_id' => $user->id,
        'model' => 'deepseek-v4-flash',
        'mode' => 'generate',
        'total_tokens' => 150,
    ]);

    $this->actingAs($user);

    $response = $this->postJson(route('prd-assistant.messages'), [
        'model' => 'deepseek-v4-flash',
        'mode' => 'generate',
        'messages' => [
            ['role' => 'user', 'content' => 'Please generate PRD'],
        ],
    ]);

    $response->assertStatus(403);
    $response->assertJsonPath('message', 'Kuota token AI Anda sudah habis. Silakan hubungi administrator.');
});

test('blocked users cannot use AI assistant', function () {
    $user = User::factory()->create(['role' => 'user', 'status' => 'blocked']);

    $this->actingAs($user);

    $response = $this->postJson(route('prd-assistant.messages'), [
        'model' => 'deepseek-v4-flash',
        'mode' => 'generate',
        'messages' => [
            ['role' => 'user', 'content' => 'Hello'],
        ],
    ]);

    $response->assertStatus(403);
    $response->assertJsonPath('message', 'Akun Anda ditangguhkan.');
});

test('AI usage is correctly logged on successful prompt completion', function () {
    $user = User::factory()->create(['role' => 'user', 'token_quota' => 100000]);
    $this->actingAs($user);

    Http::fake([
        '*' => Http::response([
            'choices' => [
                [
                    'message' => [
                        'content' => 'Here is your PRD document output content.',
                    ],
                ],
            ],
            'usage' => [
                'prompt_tokens' => 45,
                'completion_tokens' => 15,
                'total_tokens' => 60,
            ],
        ], 200),
    ]);

    $this->postJson(route('prd-assistant.messages'), [
        'model' => 'deepseek-v4-flash',
        'mode' => 'generate',
        'messages' => [
            ['role' => 'user', 'content' => 'Write a PRD'],
        ],
    ]);

    $this->assertDatabaseHas('ai_usage_logs', [
        'user_id' => $user->id,
        'model' => 'deepseek-v4-flash',
        'mode' => 'generate',
        'total_tokens' => 60,
    ]);
});

test('blocked users are rejected on non-AI routes by middleware', function () {
    $user = User::factory()->create(['role' => 'user', 'status' => 'blocked']);

    $this->actingAs($user);

    $this->get(route('dashboard'))->assertForbidden();
    $this->get(route('design.index'))->assertForbidden();
});

test('user role and quota cannot be mass assigned', function () {
    $user = User::factory()->create(['role' => 'user']);

    // Even if malicious input reaches mass assignment, the sensitive
    // attributes must be ignored because they are not fillable.
    $user->fill(['role' => 'admin', 'token_quota' => 999999999, 'status' => 'active']);
    $user->save();
    $user->refresh();

    expect($user->role)->toBe('user');
    expect($user->token_quota)->toBe(100000);
});
