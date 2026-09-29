<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * A visitor asking for access. Registration stays closed, so an admin turns
 * entries into accounts by hand from the admin dashboard.
 */
class WaitlistEntry extends Model
{
    use HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'email',
        'name',
        'note',
    ];
}
