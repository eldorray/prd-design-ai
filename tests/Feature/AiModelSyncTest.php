<?php

use App\Models\AiProvider;
use App\Models\User;
use App\Support\AiProvider as AiProviderSupport;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    AiProvider::query()->delete();
    Cache::store()->flush();
    AiProviderSupport::flushCache();
});

test('a failed sync keeps the previously stored models', function () {
    // This is the whole point of storing them. The old code cached the empty
    // result of a failed fetch for ten minutes, which made every model fail
    // `Rule::in` and took PRD saves, design saves, and generation down with it.
    $provider = AiProvider::factory()->create([
        'slug' => 'flaky',
        'base_url' => 'https://flaky.example.com/v1',
        'api_key' => 'test-key',
        'models' => ['known-good-a', 'known-good-b'],
        'models_synced_at' => now()->subHour(),
    ]);

    Http::fake(['https://flaky.example.com/v1/models' => Http::response('gateway down', 503)]);

    $this->artisan('ai:sync-models')->assertFailed();

    expect($provider->fresh()->models)->toBe(['known-good-a', 'known-good-b']);

    AiProviderSupport::flushCache();

    expect(AiProviderSupport::models())->toBe(['known-good-a', 'known-good-b']);
});

test('a provider timing out does not empty the model list', function () {
    AiProvider::factory()->create([
        'slug' => 'timeout',
        'base_url' => 'https://timeout.example.com/v1',
        'api_key' => 'test-key',
        'models' => ['still-here'],
        'models_synced_at' => now()->subHour(),
    ]);

    Http::fake(fn () => throw new ConnectionException('timed out'));

    $this->artisan('ai:sync-models')->assertFailed();

    AiProviderSupport::flushCache();

    expect(AiProviderSupport::models())->toContain('still-here');
});

test('a successful sync replaces the stored list', function () {
    $provider = AiProvider::factory()->create([
        'slug' => 'fresh',
        'base_url' => 'https://fresh.example.com/v1',
        'api_key' => 'test-key',
        'models' => ['old-model'],
    ]);

    Http::fake([
        'https://fresh.example.com/v1/models' => Http::response([
            'data' => [['id' => 'new-a'], ['id' => 'new-b']],
        ]),
    ]);

    $this->artisan('ai:sync-models')->assertSuccessful();

    expect($provider->fresh()->models)->toBe(['new-a', 'new-b'])
        ->and(AiProviderSupport::models())->toBe(['new-a', 'new-b']);
});

test('resolving models never calls a provider', function () {
    AiProvider::factory()->create([
        'slug' => 'quiet',
        'api_key' => 'test-key',
        'models' => ['quiet-model'],
        'models_synced_at' => now(),
    ]);

    // Any stray request from this path fails the test.
    Http::preventStrayRequests();

    expect(AiProviderSupport::models())->toBe(['quiet-model'])
        ->and(AiProviderSupport::providerFor('quiet-model'))->toBe('quiet')
        ->and(AiProviderSupport::modelOptions())->toHaveCount(1);
});

test('rendering an authenticated page never calls a provider', function () {
    // The Inertia middleware shares the model list on every authenticated
    // request. On a cold cache that used to mean one HTTP round trip per
    // provider, with a ten second timeout each, before the page could render.
    AiProvider::factory()->create([
        'slug' => 'quiet',
        'api_key' => 'test-key',
        'models' => ['quiet-model'],
        'models_synced_at' => now(),
    ]);

    Http::preventStrayRequests();

    $this->actingAs(User::factory()->create())
        ->get(route('dashboard'))
        ->assertOk();
});

test('an inactive provider drops out of the model list', function () {
    $provider = AiProvider::factory()->create([
        'slug' => 'retired',
        'api_key' => 'test-key',
        'models' => ['retired-model'],
        'is_active' => true,
    ]);

    expect(AiProviderSupport::models())->toContain('retired-model');

    $provider->forceFill(['is_active' => false])->save();
    AiProviderSupport::flushCache();

    expect(AiProviderSupport::models())->not->toContain('retired-model');
});

test('syncing a provider without a key fails without touching the network', function () {
    $provider = AiProvider::factory()->create(['api_key' => null]);

    Http::preventStrayRequests();

    expect(fn () => AiProviderSupport::syncProvider($provider))
        ->toThrow(RuntimeException::class, 'API key belum diisi untuk provider ini.');
});
