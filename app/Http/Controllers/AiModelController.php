<?php

namespace App\Http\Controllers;

use App\Support\AiProvider;
use Illuminate\Http\JsonResponse;

class AiModelController extends Controller
{
    /**
     * Return the models resolved from all active providers configured by the
     * administrator. The client uses this endpoint on both AI workspaces so
     * partial Inertia visits cannot leave a stale model list behind.
     */
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'models' => AiProvider::modelOptions(),
        ]);
    }
}
