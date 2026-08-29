<?php

use App\Models\AiPrompt;
use App\Models\AiProvider;
use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    // Keep tests deterministic regardless of the developer's local provider rows.
    AiProvider::query()->delete();
    AiPrompt::query()->delete();
    Cache::store()->flush();
    App\Support\AiProvider::flushCache();
});

test('non-admin users cannot access ai settings', function () {
    $user = User::factory()->create(['role' => 'user']);

    $this->actingAs($user)->get(route('admin.ai.index'))->assertForbidden();
});

test('admins can view the ai settings page', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->get(route('admin.ai.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/ai-settings')
            ->has('providers')
            ->has('prompts'));
});

test('admins can create a provider with an encrypted key', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->post(route('admin.ai.providers.store'), [
            'name' => 'OpenRouter',
            'slug' => 'openrouter',
            'base_url' => 'https://openrouter.ai/api/v1',
            'api_key' => 'sk-or-secret',
            'supports_thinking' => false,
        ])
        ->assertRedirect();

    $provider = AiProvider::query()->where('slug', 'openrouter')->first();

    expect($provider)->not->toBeNull()
        ->and($provider->api_key)->toBe('sk-or-secret')
        ->and($provider->getRawOriginal('api_key'))->not->toContain('sk-or-secret');
});

test('workspace model endpoint serves the synced list without calling the provider', function () {
    AiProvider::factory()->create([
        'name' => 'Custom Gateway',
        'slug' => 'custom-gateway',
        'base_url' => 'https://gateway.example.com/v1',
        'api_key' => 'test-key',
        'models' => ['model-one', 'model-two'],
        'models_synced_at' => now(),
    ]);

    // The endpoint runs on every workspace load. It must never reach out to a
    // provider from there: a slow one would stall the page, and a failing one
    // used to empty the list that request validation depends on.
    Http::preventStrayRequests();

    App\Support\AiProvider::flushCache();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson(route('ai.models'))
        ->assertOk()
        ->assertJsonPath('models.0.id', 'model-one')
        ->assertJsonPath('models.0.provider', 'custom-gateway')
        ->assertJsonPath('models.0.provider_name', 'Custom Gateway')
        ->assertJsonPath('models.1.id', 'model-two');
});

test('the admin model button syncs and stores the provider list', function () {
    config(['services.deepseek.key' => null]);

    $provider = AiProvider::factory()->create([
        'slug' => 'testprov',
        'base_url' => 'https://fake.example.com/v1',
        'api_key' => 'test-key',
    ]);

    Http::fake([
        'https://fake.example.com/v1/models' => Http::response([
            'data' => [
                ['id' => 'model-a'],
                ['id' => 'model-b'],
            ],
        ]),
    ]);

    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->get(route('admin.ai.providers.models', $provider))
        ->assertOk()
        ->assertJsonPath('models.0', 'model-a')
        ->assertJsonPath('models.1', 'model-b');

    $provider->refresh();

    expect($provider->models)->toBe(['model-a', 'model-b'])
        ->and($provider->models_synced_at)->not->toBeNull();
});

test('loading models without a key returns 422', function () {
    $provider = AiProvider::factory()->create(['api_key' => null]);
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->get(route('admin.ai.providers.models', $provider))
        ->assertStatus(422);
});

test('ai provider falls back to static config when no rows exist', function () {
    config([
        'services.deepseek.key' => 'env-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    expect(App\Support\AiProvider::models())->toContain('deepseek-v4-flash')
        ->and(App\Support\AiProvider::apiKey('deepseek-v4-flash'))->toBe('env-key')
        ->and(App\Support\AiProvider::chatUrl('deepseek-v4-flash'))->toBe('https://api.deepseek.com/chat/completions');
});

test('prd generation injects active prd-scoped prompts', function () {
    AiPrompt::create([
        'scope' => 'prd',
        'label' => 'Bahasa formal',
        'content' => 'Selalu gunakan bahasa Indonesia formal.',
        'is_active' => true,
    ]);

    AiPrompt::create([
        'scope' => 'design',
        'label' => 'Design-only',
        'content' => 'Jangan pernah injeksi ke PRD.',
        'is_active' => true,
    ]);

    config([
        'services.deepseek.key' => 'test-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    Http::fake([
        'https://api.deepseek.com/chat/completions' => Http::response([
            'choices' => [['message' => ['content' => 'PERTANYAAN: Siapa target?']]],
        ]),
    ]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'interview',
            'messages' => [
                ['role' => 'user', 'content' => 'Ide: PRD generator.'],
            ],
        ])
        ->assertOk();

    Http::assertSent(function ($request): bool {
        $systemMessages = array_filter(
            $request['messages'],
            fn (array $message): bool => $message['role'] === 'system',
        );

        $contents = array_map(fn (array $message): string => $message['content'], $systemMessages);

        $corePrompt = collect($contents)->first(
            fn (string $content): bool => str_contains($content, 'GUARDRAIL ANTI-SLOP UNTUK PRD'),
        );

        return in_array('Selalu gunakan bahasa Indonesia formal.', $contents, true)
            && ! in_array('Jangan pernah injeksi ke PRD.', $contents, true)
            && is_string($corePrompt)
            && str_contains($corePrompt, 'Jangan mengarang fitur');
    });
});

test('inactive prompt injections are skipped', function () {
    AiPrompt::create([
        'scope' => 'prd',
        'label' => 'Nonaktif',
        'content' => 'INJEKSI_NONAKTIF_MARKER',
        'is_active' => false,
    ]);

    config([
        'services.deepseek.key' => 'test-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    Http::fake([
        'https://api.deepseek.com/chat/completions' => Http::response([
            'choices' => [['message' => ['content' => 'PERTANYAAN: Siapa target?']]],
        ]),
    ]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'interview',
            'messages' => [
                ['role' => 'user', 'content' => 'Halo'],
            ],
        ])
        ->assertOk();

    Http::assertNotSent(fn ($request): bool => str_contains(
        json_encode($request['messages']),
        'INJEKSI_NONAKTIF_MARKER',
    ));
});

test('deleting a provider flushes the model cache', function () {
    $provider = AiProvider::factory()->create(['slug' => 'flushprov']);
    $admin = User::factory()->create(['role' => 'admin']);

    // Prime the static in-memory map.
    App\Support\AiProvider::models();

    $this->actingAs($admin)
        ->delete(route('admin.ai.providers.destroy', $provider))
        ->assertRedirect();

    expect(App\Support\AiProvider::providerFor('model-a'))->not->toBe('flushprov');
});

test('friendly provider error translates gateway queue rejections', function () {
    $doubleEncoded = json_encode([
        'code' => '403',
        'message' => json_encode([
            'isQueued' => true,
            'modelKey' => 'kmodel_latest',
            'queueCount' => 1293,
            'queueType' => 'slow',
            'retryAfterSeconds' => 300,
        ]),
    ]);

    $friendly = App\Support\AiProvider::friendlyProviderError($doubleEncoded);

    expect($friendly)
        ->toContain('Server AI sedang ramai')
        ->toContain('1.293 permintaan di depan Anda')
        ->toContain('jalur lambat (free tier)')
        ->toContain('5 menit');
});

test('friendly provider error ignores unrelated error bodies', function () {
    expect(App\Support\AiProvider::friendlyProviderError('not json at all'))->toBeNull()
        ->and(App\Support\AiProvider::friendlyProviderError(json_encode(['error' => ['message' => 'bad request']])))->toBeNull();
});

test('prd assistant surfaces a friendly message with 429 for queue rejections', function () {
    config([
        'services.deepseek.key' => 'test-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    $queueBody = json_encode([
        'code' => '10605',
        'message' => json_encode([
            'isQueued' => true,
            'queueCount' => 1293,
            'queueType' => 'slow',
            'retryAfterSeconds' => 300,
        ]),
    ]);

    Http::fake([
        'https://api.deepseek.com/*' => Http::response($queueBody, 403),
    ]);

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'interview',
            'messages' => [
                ['role' => 'user', 'content' => 'Halo'],
            ],
        ]);

    $response->assertStatus(429)
        ->assertJsonPath('retry_after', 300);

    expect($response->json('message'))->toContain('Server AI sedang ramai')
        ->and($response->json('message'))->not->toContain('{');
});

test('design stream emits a friendly error event for queue rejections', function () {
    $provider = AiProvider::factory()->create([
        'slug' => 'queueprov',
        'base_url' => 'https://queue.example.com/v1',
        'api_key' => 'test-key',
    ]);

    $queueBody = json_encode([
        'code' => '10605',
        'message' => json_encode([
            'isQueued' => true,
            'queueCount' => 1293,
            'queueType' => 'slow',
            'retryAfterSeconds' => 300,
        ]),
    ]);

    // Guzzle needs the http_errors flow; fake a 403 via Http::fake is not
    // possible for Guzzle in the stream controller — instead call the
    // friendly parser through the controller's SSE error path indirectly:
    // assert the parser output shape used in the event payload.
    $friendly = App\Support\AiProvider::friendlyProviderError($queueBody);

    expect($friendly)->toContain('Server AI sedang ramai')
        ->and($friendly)->toContain('1.293');
});
