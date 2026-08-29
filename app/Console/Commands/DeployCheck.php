<?php

namespace App\Console\Commands;

use App\Models\AiProvider;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/**
 * Preflight for a production deployment.
 *
 * Every check here corresponds to a way this app has a silent, total failure
 * mode: a leftover dev-server marker that blanks the whole frontend, a debug
 * flag that prints the provider API keys on the first exception. None of them
 * announce themselves, so they get asserted instead.
 *
 * Run it on the server, after `php artisan config:cache`.
 */
class DeployCheck extends Command
{
    protected $signature = 'deploy:check {--strict : Treat warnings as failures}';

    protected $description = 'Verify this installation is safe to serve in production';

    /** @var list<array{level: string, label: string, detail: string}> */
    private array $results = [];

    public function handle(): int
    {
        $this->checkEnvironment();
        $this->checkFrontendAssets();
        $this->checkDatabase();
        $this->checkAiProviders();
        $this->checkMail();
        $this->checkStorage();

        $this->newLine();

        foreach ($this->results as $result) {
            $this->line(match ($result['level']) {
                'fail' => "  <fg=red>FAIL</>  {$result['label']} — {$result['detail']}",
                'warn' => "  <fg=yellow>WARN</>  {$result['label']} — {$result['detail']}",
                default => "  <fg=green>OK</>    {$result['label']}",
            });
        }

        $failures = count(array_filter($this->results, fn (array $r): bool => $r['level'] === 'fail'));
        $warnings = count(array_filter($this->results, fn (array $r): bool => $r['level'] === 'warn'));

        $this->newLine();

        if ($failures > 0) {
            $this->error("{$failures} pemeriksaan gagal. Jangan lanjutkan deploy sebelum diperbaiki.");

            return Command::FAILURE;
        }

        if ($warnings > 0 && $this->option('strict')) {
            $this->error("{$warnings} peringatan, dan --strict aktif.");

            return Command::FAILURE;
        }

        $this->info($warnings > 0
            ? "Siap deploy, dengan {$warnings} peringatan di atas."
            : 'Siap deploy.');

        return Command::SUCCESS;
    }

    private function checkEnvironment(): void
    {
        $this->assert(
            app()->isProduction(),
            'APP_ENV',
            'bernilai "'.app()->environment().'", seharusnya "production"',
        );

        // The first uncaught exception on a debug page prints the whole .env,
        // provider API keys included.
        $this->assert(
            config('app.debug') === false,
            'APP_DEBUG',
            'masih aktif — halaman error akan menampilkan seluruh isi .env termasuk API key',
        );

        $this->assert(
            filled(config('app.key')),
            'APP_KEY',
            'kosong, jalankan php artisan key:generate',
        );

        $url = (string) config('app.url');

        $this->assert(
            ! Str::contains($url, ['localhost', '127.0.0.1']),
            'APP_URL',
            'masih menunjuk "'.$url.'"',
        );

        if (Str::startsWith($url, 'https://')) {
            $this->assert(
                config('session.secure') === true,
                'SESSION_SECURE_COOKIE',
                'belum true padahal APP_URL sudah https — cookie session ikut terkirim lewat HTTP polos',
            );
        } else {
            $this->warn_('HTTPS', 'APP_URL bukan https');
        }
    }

    private function checkFrontendAssets(): void
    {
        // Laravel's Vite helper reads this file first and, when it exists,
        // pulls every asset from a dev server that is not running here.
        $this->assert(
            ! file_exists(public_path('hot')),
            'public/hot',
            'ada di server — seluruh asset akan ditarik dari Vite dev server dan halaman tampil kosong',
        );

        $this->assert(
            file_exists(public_path('build/manifest.json')),
            'Build asset',
            'public/build/manifest.json tidak ada, jalankan npm run build',
        );
    }

    private function checkDatabase(): void
    {
        try {
            DB::connection()->getPdo();
        } catch (Throwable $exception) {
            $this->fail_('Database', 'tidak bisa terhubung: '.$exception->getMessage());

            return;
        }

        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            // Three parallel SSE streams plus session and cache writes on one
            // lock file is where "database is locked" comes from.
            $this->warn_('Database', 'memakai SQLite; stream desain paralel berisiko "database is locked"');
        } else {
            $this->ok('Database ('.$driver.')');
        }

        $pending = collect(app('migrator')->getMigrationFiles(database_path('migrations')))
            ->keys()
            ->diff(app('migrator')->getRepository()->getRan())
            ->count();

        $this->assert($pending === 0, 'Migrasi', "{$pending} migrasi belum dijalankan");
    }

    private function checkAiProviders(): void
    {
        try {
            $active = AiProvider::query()->where('is_active', true)->get();
        } catch (Throwable) {
            $this->fail_('Provider AI', 'tabel ai_providers belum ada, jalankan php artisan migrate');

            return;
        }

        if ($active->isEmpty()) {
            $this->warn_('Provider AI', 'belum ada provider aktif; daftar model akan kosong');

            return;
        }

        $keyless = $active->filter(fn (AiProvider $provider): bool => blank($provider->api_key));

        $this->assert(
            $keyless->isEmpty(),
            'Provider AI',
            'aktif tanpa API key: '.$keyless->pluck('name')->join(', '),
        );

        // Without a synced list every model fails Rule::in and nothing can be
        // saved or generated, so this is a hard failure rather than a warning.
        $unsynced = $active->filter(fn (AiProvider $provider): bool => blank($provider->models));

        $this->assert(
            $unsynced->isEmpty(),
            'Daftar model',
            'belum tersinkron untuk: '.$unsynced->pluck('name')->join(', ').' — jalankan php artisan ai:sync-models',
        );

        $stale = $active->filter(
            fn (AiProvider $provider): bool => $provider->models_synced_at?->lt(now()->subDay()) ?? false,
        );

        if ($stale->isNotEmpty()) {
            $this->warn_('Daftar model', 'lebih dari 24 jam tidak tersinkron ('.$stale->pluck('name')->join(', ').'); pastikan cron schedule:run berjalan');
        }
    }

    private function checkMail(): void
    {
        $mailer = (string) config('mail.default');

        if (in_array($mailer, ['log', 'array'], true)) {
            $this->warn_('Mail', "MAIL_MAILER=\"{$mailer}\" — reset password tidak akan terkirim");

            return;
        }

        $this->ok('Mail ('.$mailer.')');
    }

    private function checkStorage(): void
    {
        foreach (['storage/logs' => storage_path('logs'), 'storage/framework' => storage_path('framework')] as $label => $path) {
            $this->assert(is_writable($path), $label, 'tidak bisa ditulis');
        }
    }

    private function assert(bool $passed, string $label, string $failureDetail): void
    {
        $passed ? $this->ok($label) : $this->fail_($label, $failureDetail);
    }

    private function ok(string $label): void
    {
        $this->results[] = ['level' => 'ok', 'label' => $label, 'detail' => ''];
    }

    private function fail_(string $label, string $detail): void
    {
        $this->results[] = ['level' => 'fail', 'label' => $label, 'detail' => $detail];
    }

    private function warn_(string $label, string $detail): void
    {
        $this->results[] = ['level' => 'warn', 'label' => $label, 'detail' => $detail];
    }
}
