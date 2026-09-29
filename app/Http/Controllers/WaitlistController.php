<?php

namespace App\Http\Controllers;

use App\Models\WaitlistEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class WaitlistController extends Controller
{
    /**
     * Add a visitor to the waitlist.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'name' => ['nullable', 'string', 'max:120'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        // A repeat submission answers exactly like a new one, so the form
        // cannot be used to probe which addresses are already listed.
        WaitlistEntry::firstOrCreate(
            ['email' => Str::lower(trim($validated['email']))],
            ['name' => $validated['name'] ?? null, 'note' => $validated['note'] ?? null],
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Terima kasih! Kamu masuk daftar tunggu. Kami kabari lewat email saat akses dibuka.',
        ]);

        return back();
    }
}
