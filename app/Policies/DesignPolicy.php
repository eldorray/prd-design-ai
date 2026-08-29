<?php

namespace App\Policies;

use App\Models\Design;
use App\Models\User;

class DesignPolicy
{
    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Design $design): bool
    {
        return $user->isAdmin() || $user->id === $design->user_id;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Design $design): bool
    {
        return $user->isAdmin() || $user->id === $design->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Design $design): bool
    {
        return $user->isAdmin() || $user->id === $design->user_id;
    }
}
