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
