<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiUsageLog;
use App\Models\Design;
use App\Models\Prd;
use App\Models\User;
use App\Models\WaitlistEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    /**
     * Display the admin dashboard with user management and analytics.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'role' => ['nullable', 'in:user,admin'],
            'status' => ['nullable', 'in:active,blocked'],
        ]);

        $users = User::query()
            // This month's usage, matching what the monthly quota counts.
            ->withSum(['aiUsageLogs as used_tokens' => fn ($query) => $query->currentPeriod()], 'total_tokens')
            ->when($filters['search'] ?? null, fn ($query, string $search) => $query->where(
                fn ($query) => $query->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"),
            ))
            ->when($filters['role'] ?? null, fn ($query, string $role) => $query->where('role', $role))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->orderBy('name')
            ->paginate(20, ['id', 'name', 'email', 'role', 'token_quota', 'status', 'created_at'])
            ->withQueryString()
            ->through(fn (User $user): array => [
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
            'waitlist_count' => WaitlistEntry::count(),
        ];

        return Inertia::render('admin/dashboard', [
            'users' => $users,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'role' => $filters['role'] ?? 'all',
                'status' => $filters['status'] ?? 'all',
            ],
            // ponytail: newest 100 only; paginate if the waitlist outgrows that.
            'waitlist' => WaitlistEntry::query()
                ->latest()
                ->limit(100)
                ->get(['id', 'email', 'name', 'note', 'created_at']),
            'analytics' => $analytics,
        ]);
    }

    /**
     * Create an account by hand — registration is closed, so this (and the
     * `user:create` command) is how people get in.
     */
    public function storeUser(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::default()],
            'role' => ['required', 'in:user,admin'],
            'token_quota' => ['required', 'integer', 'min:0'],
        ]);

        $user = new User;
        $user->name = $validated['name'];
        $user->email = Str::lower($validated['email']);
        $user->password = $validated['password'];
        // Explicit writes: role, quota and status are deliberately not fillable.
        $user->role = $validated['role'];
        $user->token_quota = $validated['token_quota'];
        $user->status = 'active';
        $user->email_verified_at = now();
        $user->save();

        WaitlistEntry::where('email', $user->email)->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "Akun {$user->email} dibuat."]);

        return redirect()->back();
    }

    /**
     * Remove a waitlist entry without creating an account.
     */
    public function destroyWaitlistEntry(WaitlistEntry $waitlistEntry): RedirectResponse
    {
        $waitlistEntry->delete();

        return redirect()->back();
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
