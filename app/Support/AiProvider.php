<?php

namespace App\Support;

use App\Models\AiProvider as AiProviderModel;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

class AiProvider
{
    /**
     * Legacy static fallback used when no provider rows exist in the database
     * (fresh install). Mirrors the previous hardcoded MODELS map.
     *
     * @var array<string, array{base_url: string, key: string}>
     */
    private const FALLBACK_PROVIDERS = [
        'deepseek' => [
            'base_url' => 'https://api.deepseek.com',
            'key' => 'DEEPSEEK_API_KEY',
        ],
        'gemini' => [
            'base_url' => 'https://generativelanguage.googleapis.com/v1beta/openai',
            'key' => 'GEMINI_API_KEY',
        ],
        'tokenrouter' => [
            'base_url' => 'https://api.tokenrouter.com/v1',
            'key' => 'TOKENROUTER_API_KEY',
        ],
    ];

    /**
     * Legacy static model list per provider slug (fresh-install fallback).
     *
     * @var array<string, list<string>>
     */
    private const FALLBACK_MODELS = [
        'deepseek' => ['deepseek-v4-flash', 'deepseek-v4-pro'],
        'gemini' => ['gemini-3.5-flash', 'gemini-3.1-pro-preview'],
        'tokenrouter' => ['MiniMax-M3'],
    ];

    /**
     * Map of model => provider slug derived from the DB providers.
     *
     * @var array<string, string>|null
     */
    protected static ?array $modelMap = null;

    /**
     * The list of selectable model identifiers (DB-driven, cached).
     *
     * @return list<string>
     */
    public static function models(): array
    {
        return array_keys(self::modelMap());
    }

    /**
     * Models for workspace dropdowns, including their provider identity.
     *
     * @return list<array{id: string, provider: string, provider_name: string}>
     */
    public static function modelOptions(): array
    {
        $map = self::modelMap();
        $providerNames = self::providerNames();

        return collect($map)
            ->map(fn (string $provider, string $model): array => [
                'id' => $model,
                'provider' => $provider,
                'provider_name' => $providerNames[$provider] ?? $provider,
            ])
            ->values()
            ->all();
    }

    /**
     * Resolve the provider slug for a given model.
     */
    public static function providerFor(string $model): string
    {
        return self::modelMap()[$model] ?? '';
    }

    /**
     * Get the configured API key for the model's provider.
     */
    public static function apiKey(string $model): ?string
    {
        $slug = self::providerFor($model);

        if ($slug === '') {
            return null;
        }

        $provider = self::dbProviders()[$slug] ?? null;

        if ($provider !== null) {
            return $provider['api_key'];
        }

        // Static fallback (no DB rows): read from config/env.
        $envKey = self::FALLBACK_PROVIDERS[$slug]['key'] ?? null;
        $key = $envKey !== null ? config('services.'.$slug.'.key') : null;

        return is_string($key) && $key !== '' ? $key : null;
    }

    /**
     * Get the chat completions endpoint URL for the model's provider.
     */
    public static function chatUrl(string $model): string
    {
        $slug = self::providerFor($model);

        if ($slug === '') {
            return '';
        }

        $provider = self::dbProviders()[$slug] ?? null;

        if ($provider !== null) {
            return rtrim($provider['base_url'], '/').'/chat/completions';
        }

        $base = (string) config('services.'.$slug.'.base_url');

        return rtrim($base, '/').'/chat/completions';
    }

    /**
     * Whether the model's provider supports DeepSeek-style thinking options.
     */
    public static function supportsThinking(string $model): bool
    {
        $slug = self::providerFor($model);

        if ($slug === '') {
            return false;
        }

        $provider = self::dbProviders()[$slug] ?? null;

        if ($provider !== null) {
            return $provider['supports_thinking'];
        }

        return $slug === 'deepseek';
    }

    /**
     * Whether the model runs in a deeper "thinking" mode by default.
     */
    public static function usesThinking(string $model): bool
    {
        return str_contains($model, 'pro');
    }

    /**
     * Fetch the available models from the provider's /models endpoint.
     * Returns the raw id list; caller caches the result.
     *
     * @return list<string>
     */
    public static function fetchModels(string $base_url, string $apiKey): array
    {
        $response = Http::withToken($apiKey)
            ->acceptJson()
            ->connectTimeout(5)
            ->timeout(10)
            ->get(rtrim($base_url, '/').'/models');

        if ($response->failed()) {
            throw new \RuntimeException('Gagal memuat model: HTTP '.$response->status());
        }

        $ids = collect($response->json('data') ?? [])
            ->map(fn ($model): string => (string) ($model['id'] ?? ''))
            ->filter(fn (string $id): bool => $id !== '')
            ->values()
            ->all();

        if ($ids === []) {
            throw new \RuntimeException('Provider tidak mengembalikan daftar model.');
        }

        return $ids;
    }

    /**
     * Model => provider slug map, DB-driven with static fallback.
     *
     * @return array<string, string>
     */
    protected static function modelMap(): array
    {
        if (self::$modelMap !== null) {
            return self::$modelMap;
        }

        return self::$modelMap = Cache::remember(
            'ai_providers.model_map',
            now()->addMinutes(10),
            function (): array {
                $providers = self::dbProviders();

                if ($providers === []) {
                    $map = [];

                    foreach (self::FALLBACK_MODELS as $slug => $models) {
                        foreach ($models as $model) {
                            $map[$model] = $slug;
                        }
                    }

                    return $map;
                }

                $map = [];

                foreach ($providers as $slug => $provider) {
                    $models = self::fetchProviderModels($slug, $provider);

                    foreach ($models as $model) {
                        $map[$model] = $slug;
                    }
                }

                return $map;
            },
        );
    }

    /**
     * Resolve a provider's models — cached per provider slug.
     *
     * @param  array{id: string, name: string, base_url: string, api_key: ?string, supports_thinking: bool}  $provider
     * @return list<string>
     */
    protected static function fetchProviderModels(string $slug, array $provider): array
    {
        return Cache::remember(
            'ai_providers.models.'.$slug,
            now()->addMinutes(10),
            function () use ($provider): array {
                if ($provider['api_key'] === null) {
                    return [];
                }

                try {
                    return self::fetchModels($provider['base_url'], $provider['api_key']);
                } catch (Throwable) {
                    // Provider unreachable — no models from it this cycle.
                    return [];
                }
            },
        );
    }

    /**
     * Human-readable provider names keyed by slug.
     *
     * @return array<string, string>
     */
    protected static function providerNames(): array
    {
        $providers = self::dbProviders();

        if ($providers !== []) {
            return collect($providers)
                ->mapWithKeys(fn (array $provider, string $slug): array => [
                    $slug => $provider['name'],
                ])
                ->all();
        }

        return [
            'deepseek' => 'DeepSeek',
            'gemini' => 'Gemini',
            'tokenrouter' => 'TokenRouter',
        ];
    }

    /**
     * Active DB providers keyed by slug.
     *
     * @return array<string, array{id: string, name: string, base_url: string, api_key: ?string, supports_thinking: bool}>
     */
    protected static function dbProviders(): array
    {
        try {
            return AiProviderModel::lookup();
        } catch (Throwable) {
            // Table missing (pre-migration) — fall through to static config.
            return [];
        }
    }

    /**
     * Build a friendly Indonesian message for gateway "queued" rejections —
     * free-tier proxies that answer 403/200 with a payload like
     * {"code":"10605","message":"{\"isQueued\":true,\"queueCount\":1293,...}"}.
     * The inner object is often double-encoded. Returns null when the body
     * is not a queue error.
     */
    public static function friendlyProviderError(string $body): ?string
    {
        $decoded = json_decode($body, true);

        if (! is_array($decoded)) {
            return null;
        }

        // Unwrap double-encoded payloads: outer message may hold the real JSON.
        if (is_string($decoded['message'] ?? null)) {
            $inner = json_decode($decoded['message'], true);

            if (is_array($inner)) {
                $decoded = array_merge($decoded, $inner);
            }
        }

        $isQueued = $decoded['isQueued'] ?? null;
        $code = (string) ($decoded['code'] ?? '');

        if (! $isQueued && $code !== '10605') {
            return null;
        }

        $segments = [];

        if (isset($decoded['queueCount'])) {
            $segments[] = number_format((int) $decoded['queueCount'], 0, ',', '.')
                .' permintaan di depan Anda';
        }

        $queueType = $decoded['queueType'] ?? null;

        if (is_string($queueType) && $queueType !== '') {
            $segments[] = 'jalur '.($queueType === 'slow' ? 'lambat (free tier)' : $queueType);
        }

        $detail = $segments === [] ? '' : ' — '.implode(', ', $segments);

        $retrySeconds = isset($decoded['retryAfterSeconds']) ? max(1, (int) $decoded['retryAfterSeconds']) : null;

        if ($retrySeconds !== null) {
            $retryText = $retrySeconds >= 3600
                ? round($retrySeconds / 3600).' jam'
                : ($retrySeconds >= 60 ? round($retrySeconds / 60).' menit' : $retrySeconds.' detik');
            $retrySuffix = " Coba lagi dalam ±{$retryText}, atau ganti model lain di dropdown.";
        } else {
            $retrySuffix = ' Coba lagi beberapa saat lagi, atau ganti model lain di dropdown.';
        }

        return 'Server AI sedang ramai dan menolak permintaan baru'.$detail.'.'.$retrySuffix;
    }

    /**
     * Flush the resolved model map + per-provider caches (call after admin edits).
     */
    public static function flushCache(): void
    {
        self::$modelMap = null;
        Cache::forget('ai_providers.model_map');

        foreach (array_keys(self::dbProviders()) as $slug) {
            Cache::forget('ai_providers.models.'.$slug);
        }
    }
}
