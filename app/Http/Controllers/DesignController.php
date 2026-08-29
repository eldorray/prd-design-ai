<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDesignRequest;
use App\Models\Design;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DesignController extends Controller
{
    use AuthorizesRequests;

    /**
     * Show the design studio with the user's history.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $current = null;

        if ($request->filled('design')) {
            $current = $user->designs()->whereKey($request->string('design'))->first();

            if ($current && empty($current->canvases)) {
                $current->canvases = [[
                    'kind' => $current->kind,
                    'html' => $current->html,
                    'messages' => $current->messages ?? [],
                    'prompt' => $current->prompt,
                ]];
            }
        }

        $fromPrd = null;
        if ($request->filled('prd_id')) {
            $fromPrd = $user->prds()->whereKey($request->string('prd_id'))->first(['id', 'title', 'content']);
        }

        return Inertia::render('design', [
            'history' => $user->designs()->get([
                'id', 'title', 'kind', 'model', 'updated_at',
            ]),
            'current' => $current,
            'fromPrd' => $fromPrd,
        ]);
    }

    /**
     * Persist a new design for the authenticated user.
     */
    public function store(StoreDesignRequest $request): JsonResponse
    {
        $design = $request->user()->designs()->create($request->validated());

        return response()->json([
            'design' => $design,
        ], 201);
    }

    /**
     * Update an existing design owned by the authenticated user.
     */
    public function update(StoreDesignRequest $request, Design $design): JsonResponse
    {
        $this->authorize('update', $design);

        $design->update($request->validated());

        return response()->json([
            'design' => $design->fresh(),
        ]);
    }

    /**
     * Delete a design owned by the authenticated user.
     */
    public function destroy(Request $request, Design $design): RedirectResponse
    {
        $this->authorize('delete', $design);

        $design->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Design dihapus.']);

        return to_route('design.index');
    }
}
