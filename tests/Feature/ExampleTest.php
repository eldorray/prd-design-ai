<?php

test('returns a successful response', function () {
    $response = $this->get(route('home'));

    $response->assertOk();
});

test('the footer credit comes from config', function () {
    config(['app.powered_by' => 'GPT Astra']);

    $this->get(route('home'))
        ->assertInertia(fn ($page) => $page->where('poweredBy', 'GPT Astra'));

    config(['app.powered_by' => '']);

    $this->get(route('home'))
        ->assertInertia(fn ($page) => $page->where('poweredBy', ''));
});
