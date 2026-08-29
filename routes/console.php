<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Model discovery runs on a schedule instead of inside requests: a provider
// that is slow or down must not be able to delay a page render or empty the
// list that request validation depends on.
Schedule::command('ai:sync-models')->hourly()->withoutOverlapping();
