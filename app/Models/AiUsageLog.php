<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiUsageLog extends Model
{
    use HasUuids;

    /**
     * The table has no updated_at column, so only created_at is maintained.
     * Leaving timestamps off entirely (as this model used to) wrote a NULL
     * created_at on every row, which made usage impossible to report on.
     */
    public const UPDATED_AT = null;

    /**
     * The attributes that are mass fillable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'model',
        'mode',
        'total_tokens',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    /**
     * Usage that counts against the quota: quotas are monthly and reset on the
     * first day of each calendar month.
     *
     * @param  Builder<AiUsageLog>  $query
     */
    #[Scope]
    protected function currentPeriod(Builder $query): void
    {
        $query->where('created_at', '>=', now()->startOfMonth());
    }

    /**
     * Get the user that owns the usage log.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
