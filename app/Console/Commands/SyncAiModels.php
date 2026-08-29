<?php

namespace App\Console\Commands;

use App\Models\AiProvider as AiProviderModel;
use App\Support\AiProvider;
use Illuminate\Console\Command;
use Throwable;

/**
 * Refresh the stored model list for every active provider.
 *
 * Model discovery lives here, out of the request path, so a provider being
 * slow cannot delay a page render and a provider being down cannot empty the
 * list that request validation depends on.
 */
class SyncAiModels extends Command
{
    protected $signature = 'ai:sync-models {--provider= : Limit to one provider slug}';

    protected $description = 'Refresh the stored model list from each active AI provider';

    public function handle(): int
    {
        $providers = AiProviderModel::query()
            ->where('is_active', true)
            ->when($this->option('provider'), fn ($query, string $slug) => $query->where('slug', $slug))
            ->orderBy('name')
            ->get();

        if ($providers->isEmpty()) {
            $this->warn('Tidak ada provider aktif untuk disinkronkan.');

            return Command::SUCCESS;
        }

        $failed = 0;

        foreach ($providers as $provider) {
            try {
                $models = AiProvider::syncProvider($provider);
                $this->info("{$provider->name}: ".count($models).' model tersimpan.');
            } catch (Throwable $exception) {
                $failed++;

                // The previous list stays in place, so this degrades into
                // stale-but-working rather than an outage.
                $kept = count($provider->models ?? []);

                $this->error("{$provider->name}: gagal — {$exception->getMessage()}"
                    .($kept > 0 ? " (tetap memakai {$kept} model tersimpan)" : ''));

                report($exception);
            }
        }

        return $failed > 0 && $failed === $providers->count()
            ? Command::FAILURE
            : Command::SUCCESS;
    }
}
