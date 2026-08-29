<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePrdRequest;
use App\Models\Prd;
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

        $prd->update($request->validated());

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
