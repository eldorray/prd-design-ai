<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A snapshot of a PRD's content taken just before it was overwritten, so a
 * bad refine can be undone.
 */
class PrdVersion extends Model
{
    use HasUuids;

    /**
     * Snapshots kept per PRD; older ones are pruned on write.
     */
    public const KEEP = 20;

    public const UPDATED_AT = null;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'content',
    ];

    /**
     * @return BelongsTo<Prd, $this>
     */
    public function prd(): BelongsTo
    {
        return $this->belongsTo(Prd::class);
    }
}
