<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiUsageLog;
use App\Models\Design;
use App\Models\Prd;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    /**
     * Display the admin dashboard with user management and analytics.
     */
    public function index(Request $request): Response
    {
        // ponytail: one aggregated query instead of a SUM per row. Still loads
        // every user at once, which is fine while registration is closed and
        // accounts are provisioned by hand; paginate if that ever changes.
        $users = User::query()
            ->withSum('aiUsageLogs as used_tokens', 'total_tokens')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'token_quota', 'status', 'created_at'])
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'token_quota' => $user->token_quota,
                'status' => $user->status,
                'created_at' => $user->created_at?->toIso8601String(),
                'used_tokens' => (int) $user->used_tokens,
            ]);

        $analytics = [
            'total_users' => User::count(),
            'total_tokens' => (int) AiUsageLog::sum('total_tokens'),
            'total_prds' => Prd::count(),
            'total_designs' => Design::count(),
        ];

        return Inertia::render('admin/dashboard', [
            'users' => $users,
            'analytics' => $analytics,
        ]);
    }

    /**
     * Update a user's role, quota, or status.
     */
    public function updateUser(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'role' => 'required|in:user,admin',
            'token_quota' => 'required|integer|min:0',
            'status' => 'required|in:active,blocked',
        ]);

        // An admin demoting or suspending their own account locks them out of
        // the panel, and there is no way back in from the UI.
        if ($request->user()->is($user) && ($validated['role'] !== 'admin' || $validated['status'] !== 'active')) {
            return back()->withErrors([
                'role' => 'Anda tidak bisa mencabut akses admin atau menangguhkan akun Anda sendiri.',
            ]);
        }

        // Explicit writes instead of mass assignment: these attributes are
        // deliberately not fillable on the User model.
        $user->role = $validated['role'];
        $user->token_quota = $validated['token_quota'];
        $user->status = $validated['status'];
        $user->save();

        return redirect()->back();
    }

    /**
     * Delete a user.
     */
    public function destroyUser(User $user): RedirectResponse
    {
        if (auth()->id() === $user->id) {
            return redirect()->back();
        }

        $user->delete();

        return redirect()->back();
    }
}
