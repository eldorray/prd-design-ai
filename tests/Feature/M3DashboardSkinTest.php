<?php

use App\Models\User;

test('dashboard renders the m3 skin root class', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('dashboard'));

    $response->assertOk();

    $page = $response->viewData('page');
    $component = $page['component'];

    expect($component)->toBe('dashboard');
});

test('dashboard css bundle contains the m3 token definitions', function () {
    $cssFiles = glob(public_path('build/assets/*.css'));

    expect($cssFiles)->not->toBeEmpty();

    $allCss = collect($cssFiles)
        ->map(fn (string $file): string => (string) file_get_contents($file))
        ->implode('');

    expect($allCss)
        ->toContain('--m3-primary')
        ->toContain('m3-fab')
        ->toContain('--m3-surface-1');
});
