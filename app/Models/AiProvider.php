<?php

namespace App\Models;

use Database\Factories\AiProviderFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiProvider extends Model
{
    /** @use HasFactory<AiProviderFactory> */
    use HasFactory, HasUuids;

    protected static function newFactory()
    {
        return AiProviderFactory::new();
    }

    protected $table = 'ai_providers';

    protected $fillable = ['name', 'slug', 'base_url', 'api_key', 'is_active', 'supports_thinking'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'supports_thinking' => 'boolean',
            'api_key' => 'encrypted',
        ];
    }

    /**
     * Resolve the configured providers as a plain lookup keyed by slug.
     *
     * @return array<string, array{id: string, name: string, base_url: string, api_key: ?string, supports_thinking: bool}>
     */
    public static function lookup(): array
    {
        return static::query()
            ->where('is_active', true)
            ->get(['id', 'name', 'slug', 'base_url', 'api_key', 'supports_thinking'])
            ->mapWithKeys(fn (self $provider): array => [
                $provider->slug => [
                    'id' => $provider->id,
                    'name' => $provider->name,
                    'base_url' => $provider->base_url,
                    'api_key' => $provider->api_key,
                    'supports_thinking' => $provider->supports_thinking,
                ],
            ])
            ->all();
    }
}
