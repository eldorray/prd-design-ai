<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiPrompt;
use App\Models\AiProvider as AiProviderModel;
use App\Support\AiProvider;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class AiSettingController extends Controller
{
    /**
     * Show the AI settings page with providers and prompt injections.
     */
    public function index(): Response
    {
        $providers = AiProviderModel::query()
            ->orderBy('name')
            ->get()
            ->map(fn (AiProviderModel $provider): array => [
                'id' => $provider->id,
                'name' => $provider->name,
                'slug' => $provider->slug,
                'base_url' => $provider->base_url,
                'has_key' => filled($provider->api_key),
                'is_active' => $provider->is_active,
                'supports_thinking' => $provider->supports_thinking,
                'model_count' => count($provider->models ?? []),
                'models_synced_at' => $provider->models_synced_at?->toIso8601String(),
            ]);

        $prompts = AiPrompt::query()
            ->orderBy('scope')
            ->orderBy('label')
            ->get()
            ->map(fn (AiPrompt $prompt): array => [
                'id' => $prompt->id,
                'scope' => $prompt->scope,
                'label' => $prompt->label,
                'content' => $prompt->content,
                'is_active' => $prompt->is_active,
            ]);

        return Inertia::render('admin/ai-settings', [
            'providers' => $providers,
            'prompts' => $prompts,
        ]);
    }

    /**
     * Store a new provider.
     */
    public function storeProvider(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'slug' => ['required', 'string', 'max:40', 'alpha_dash', 'unique:ai_providers,slug'],
            'base_url' => ['required', 'url', 'max:255'],
            'api_key' => ['nullable', 'string', 'max:500'],
            'supports_thinking' => ['boolean'],
        ]);

        $provider = AiProviderModel::create([
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'base_url' => $validated['base_url'],
            'api_key' => $validated['api_key'] ?? null,
            'supports_thinking' => $validated['supports_thinking'] ?? false,
            'is_active' => true,
        ]);

        AiProvider::flushCache();
        $this->syncQuietly($provider);

        return to_route('admin.ai.index');
    }

    /**
     * Update a provider (key left blank keeps the existing one).
     */
    public function updateProvider(Request $request, AiProviderModel $provider): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'base_url' => ['required', 'url', 'max:255'],
            'api_key' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
            'supports_thinking' => ['boolean'],
        ]);

        $provider->name = $validated['name'];
        $provider->base_url = $validated['base_url'];
        $provider->is_active = $validated['is_active'] ?? false;
        $provider->supports_thinking = $validated['supports_thinking'] ?? false;

        if (array_key_exists('api_key', $validated) && filled($validated['api_key'] ?? null)) {
            $provider->api_key = $validated['api_key'];
        }

        $provider->save();
        AiProvider::flushCache();

        if ($provider->wasChanged(['base_url', 'api_key', 'is_active'])) {
            $this->syncQuietly($provider);
        }

        return to_route('admin.ai.index');
    }

    /**
     * Pull the model list after an edit so a new provider is usable straight
     * away, without letting a failure block saving the settings themselves.
     */
    private function syncQuietly(AiProviderModel $provider): void
    {
        if (! $provider->is_active || blank($provider->api_key)) {
            return;
        }

        try {
            $models = AiProvider::syncProvider($provider);

            Inertia::flash('toast', [
                'type' => 'success',
                'message' => count($models).' model dimuat dari '.$provider->name.'.',
            ]);
        } catch (Throwable $exception) {
            report($exception);

            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Provider tersimpan, tapi daftar model gagal dimuat. Coba tombol "Muat model".',
            ]);
        }
    }

    /**
     * Delete a provider.
     */
    public function destroyProvider(AiProviderModel $provider): RedirectResponse
    {
        $provider->delete();
        AiProvider::flushCache();

        return to_route('admin.ai.index');
    }

    /**
     * Sync this provider's model list on demand.
     *
     * The scheduled `ai:sync-models` command does the same thing hourly; this
     * is the manual trigger so an administrator does not have to wait after
     * adding a key. A failure leaves the stored list untouched.
     */
    public function models(AiProviderModel $provider): JsonResponse
    {
        if (blank($provider->api_key)) {
            return response()->json([
                'message' => 'API key belum diisi untuk provider ini.',
            ], 422);
        }

        try {
            $models = AiProvider::syncProvider($provider);
        } catch (ConnectionException) {
            return response()->json([
                'message' => 'Tidak bisa menghubungi provider. Periksa Base URL.',
            ], 502);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => $exception instanceof \RuntimeException
                    ? $exception->getMessage()
                    : 'Gagal memuat daftar model dari provider.',
            ], 502);
        }

        return response()->json([
            'models' => $models,
            'synced_at' => $provider->models_synced_at?->toIso8601String(),
        ]);
    }

    /**
     * Store a new prompt injection.
     */
    public function storePrompt(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'scope' => ['required', 'string', 'in:prd,design'],
            'label' => ['required', 'string', 'max:120'],
            'content' => ['required', 'string', 'max:5000'],
        ]);

        AiPrompt::create([...$validated, 'is_active' => true]);

        return to_route('admin.ai.index');
    }

    /**
     * Update a prompt injection.
     */
    public function updatePrompt(Request $request, AiPrompt $prompt): RedirectResponse
    {
        $validated = $request->validate([
            'scope' => ['required', 'string', 'in:prd,design'],
            'label' => ['required', 'string', 'max:120'],
            'content' => ['required', 'string', 'max:5000'],
            'is_active' => ['boolean'],
        ]);

        $prompt->update($validated);

        return to_route('admin.ai.index');
    }

    /**
     * Delete a prompt injection.
     */
    public function destroyPrompt(AiPrompt $prompt): RedirectResponse
    {
        $prompt->delete();

        return to_route('admin.ai.index');
    }
}
