<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Prd extends Model
{
    /** @use HasFactory<PrdFactory> */
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'title',
        'idea',
        'model',
        'content',
        'messages',
    ];

    /**
     * Get the user that owns the PRD.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Earlier contents of this PRD, newest first.
     *
     * @return HasMany<PrdVersion, $this>
     */
    public function versions(): HasMany
    {
        return $this->hasMany(PrdVersion::class)->latest()->latest('id');
    }

    /**
     * Replace the content, keeping the old one as a restorable version.
     * Unchanged or empty previous content is not worth a snapshot.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function replaceContent(?string $content, array $attributes = []): void
    {
        $previous = $this->getOriginal('content');

        $this->fill([...$attributes, 'content' => $content])->save();

        if (blank($previous) || $previous === $content) {
            return;
        }

        $this->versions()->create(['content' => $previous]);

        // ponytail: prune on write; a scheduled cleanup only if writes get hot.
        $this->versions()
            ->skip(PrdVersion::KEEP)
            ->take(PHP_INT_MAX)
            ->pluck('id')
            ->whenNotEmpty(fn ($ids) => PrdVersion::whereIn('id', $ids)->delete());
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'messages' => 'array',
        ];
    }
}
