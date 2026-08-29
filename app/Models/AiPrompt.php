<?php

namespace App\Models;

use Database\Factories\AiPromptFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A configurable prompt injected into AI generations (PRD or Design).
 */
class AiPrompt extends Model
{
    /** @use HasFactory<AiPromptFactory> */
    use HasFactory, HasUuids;

    protected $table = 'ai_prompts';

    protected $fillable = ['scope', 'label', 'content', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * All active injections for a scope, ordered oldest first so admins can
     * rely on insertion order.
     *
     * @return list<array{id: string, label: string, content: string}>
     */
    public static function activeFor(string $scope): array
    {
        return static::query()
            ->where('scope', $scope)
            ->where('is_active', true)
            ->orderBy('created_at')
            ->get(['id', 'label', 'content'])
            ->map(fn (self $prompt): array => [
                'id' => $prompt->id,
                'label' => $prompt->label,
                'content' => $prompt->content,
            ])
            ->all();
    }
}
