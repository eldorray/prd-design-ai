<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePrdRequest;
use App\Models\Prd;
use App\Models\PrdVersion;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PrdController extends Controller
{
    use AuthorizesRequests;

    /**
     * Show the PRD workspace with the user's history.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $current = null;

        if ($request->filled('prd')) {
            $current = $user->prds()->whereKey($request->string('prd'))->first();
        }

        return Inertia::render('dashboard', [
            'history' => $user->prds()->get([
                'id', 'title', 'model', 'updated_at',
            ]),
            'current' => $current,
            // Metadata only — content is fetched when a version is restored.
            'versions' => $current
                ? $current->versions()
                    ->selectRaw('id, created_at, LENGTH(content) as characters')
                    ->get()
                    ->map(fn (PrdVersion $version): array => [
                        'id' => $version->id,
                        'created_at' => $version->created_at?->toIso8601String(),
                        'characters' => (int) $version->getAttribute('characters'),
                    ])
                : [],
        ]);
    }

    /**
     * Persist a new PRD for the authenticated user.
     */
    public function store(StorePrdRequest $request): JsonResponse
    {
        $prd = $request->user()->prds()->create($request->validated());

        return response()->json([
            'prd' => $prd,
        ], 201);
    }

    /**
     * Update an existing PRD owned by the authenticated user.
     */
    public function update(StorePrdRequest $request, Prd $prd): JsonResponse
    {
        $this->authorize('update', $prd);

        $validated = $request->validated();
        $prd->replaceContent($validated['content'] ?? null, $validated);

        return response()->json([
            'prd' => $prd->fresh(),
        ]);
    }

    /**
     * Bring back an earlier content. The replaced content becomes a version
     * itself, so a restore can be undone too.
     */
    public function restoreVersion(Prd $prd, PrdVersion $version): JsonResponse
    {
        $this->authorize('update', $prd);

        $prd->replaceContent($version->content);

        return response()->json([
            'prd' => $prd->fresh(),
        ]);
    }

    /**
     * Delete a PRD owned by the authenticated user.
     */
    public function destroy(Request $request, Prd $prd): RedirectResponse
    {
        $this->authorize('delete', $prd);

        $prd->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'PRD dihapus.']);

        return to_route('dashboard');
    }
}
