<?php

use App\Models\User;

test('workspace pages render their inertia components', function (string $route, string $component) {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route($route));

    $response->assertOk();

    expect($response->viewData('page')['component'])->toBe($component);
})->with([
    ['dashboard', 'dashboard'],
    ['design.index', 'design'],
]);

test('css bundle contains the paper skin tokens', function () {
    $cssFiles = glob(public_path('build/assets/*.css'));

    expect($cssFiles)->not->toBeEmpty();

    $allCss = collect($cssFiles)
        ->map(fn (string $file): string => (string) file_get_contents($file))
        ->implode('');

    expect($allCss)
        ->toContain('--brand')
        ->toContain('Instrument Serif')
        ->toContain('label-mono')
        ->not->toContain('--m3-primary');
});
