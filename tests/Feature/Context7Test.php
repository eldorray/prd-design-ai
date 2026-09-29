<?php

use App\Services\Context7Service;
use Illuminate\Support\Facades\Http;

test('context7 service queries documentation correctly when api key is present', function () {
    config(['services.context7.api_key' => 'mocked-api-key']);

    Http::fake([
        'context7.com/api/*' => Http::response('Tailwind CSS installation info', 200),
    ]);

    $service = new Context7Service;
    $result = $service->fetchContext('installation', '/websites/tailwindcss');

    expect($result)->toBe('Tailwind CSS installation info');

    Http::assertSent(function ($request) {
        return $request->url() === 'https://context7.com/api/v2/context?query=installation&libraryId=%2Fwebsites%2Ftailwindcss'
            && $request->hasHeader('Authorization', 'Bearer mocked-api-key');
    });
});

test('context7 service fetches relevant docs based on prompt keywords', function () {
    config(['services.context7.api_key' => 'mocked-api-key']);

    Http::fake([
        'context7.com/api/*' => Http::response('Tailwind v4 docs content', 200),
    ]);

    $service = new Context7Service;
    $docs = $service->getDocsForPrompt('Buat landing page menggunakan tailwind css');

    expect($docs)
        ->toContain('## Dokumentasi Referensi Tambahan dari Upstash Context7:')
        ->toContain('### Tailwind CSS Documentation Context:')
        ->toContain('Tailwind v4 docs content');
});

test('context7 service fails gracefully when api key is not set', function () {
    config(['services.context7.api_key' => null]);

    Http::fake();

    $service = new Context7Service;
    $result = $service->fetchContext('installation', '/websites/tailwindcss');

    expect($result)->toBeNull();
    Http::assertNothingSent();
});

test('generic design words do not trigger a context7 lookup', function () {
    // "design", "layout" and "color" appear in nearly every studio prompt, so
    // matching on them added blocking lookups and prompt tokens to almost
    // every generation.
    config(['services.context7.api_key' => 'mocked-api-key']);

    Http::fake();

    $docs = (new Context7Service)->getDocsForPrompt('Design landing page dengan layout modern, color cerah, dan state yang interaktif');

    expect($docs)->toBe('');
    Http::assertNothingSent();
});

test('context7 lookups never send the user prompt to the third party', function () {
    config(['services.context7.api_key' => 'mocked-api-key']);

    Http::fake(['context7.com/api/*' => Http::response('Tailwind docs', 200)]);

    (new Context7Service)->getDocsForPrompt('Landing page tailwind untuk proyek rahasia Nusantara Pay');

    Http::assertSent(fn ($request) => ! str_contains(urldecode($request->url()), 'rahasia'));
});

test('context7 documentation is cached across generations', function () {
    config(['services.context7.api_key' => 'mocked-api-key']);

    Http::fake(['context7.com/api/*' => Http::response('Tailwind docs', 200)]);

    $service = new Context7Service;
    $service->getDocsForPrompt('Landing page pakai tailwind');
    $service->getDocsForPrompt('Dashboard admin pakai tailwind');

    Http::assertSentCount(1);
});
