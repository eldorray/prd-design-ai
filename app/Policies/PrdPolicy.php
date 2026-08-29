<?php

namespace App\Policies;

use App\Models\Prd;
use App\Models\User;

class PrdPolicy
{
    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Prd $prd): bool
    {
        return $user->isAdmin() || $user->id === $prd->user_id;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Prd $prd): bool
    {
        return $user->isAdmin() || $user->id === $prd->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Prd $prd): bool
    {
        return $user->isAdmin() || $user->id === $prd->user_id;
    }
}
