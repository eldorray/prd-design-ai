<?php

use App\Models\User;

test('design studio renders for an authenticated user with the m3 skin available', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('design.index'));

    $response->assertOk();

    $page = $response->viewData('page');

    expect($page['component'])->toBe('design');
});

test('production css bundle contains the pixel material tokens used by design studio', function () {
    $cssFiles = glob(public_path('build/assets/*.css'));

    expect($cssFiles)->not->toBeEmpty();

    $allCss = collect($cssFiles)
        ->map(fn (string $file): string => (string) file_get_contents($file))
        ->implode('');

    expect($allCss)
        ->toContain('--m3-tertiary-container')
        ->toContain('--m3-secondary-container')
        ->toContain('m3-fab');
});
