<?php

use App\Models\Prd;
use App\Models\User;

test('dashboard shows the authenticated user prd history', function () {
    $user = User::factory()->create();
    $own = Prd::factory()->for($user)->create(['title' => 'My PRD']);
    Prd::factory()->create(['title' => 'Someone else PRD']);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('history', 1)
            ->where('history.0.id', $own->id)
            ->where('history.0.title', 'My PRD')
            ->where('current', null));
});

test('dashboard loads a selected prd into current', function () {
    $user = User::factory()->create();
    $prd = Prd::factory()->for($user)->create();

    $this->actingAs($user)
        ->get(route('dashboard', ['prd' => $prd->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('current.id', $prd->id)
            ->where('current.content', $prd->content));
});

test('a user cannot load another users prd', function () {
    $user = User::factory()->create();
    $foreignPrd = Prd::factory()->create();

    $this->actingAs($user)
        ->get(route('dashboard', ['prd' => $foreignPrd->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('current', null));
});

test('a user can store a prd', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson(route('prds.store'), [
        'title' => 'Generator PRD',
        'idea' => 'AI PRD Generator',
        'model' => 'deepseek-v4-flash',
        'content' => '# Generator PRD',
        'messages' => [
            ['role' => 'user', 'content' => 'Ide saya...'],
            ['role' => 'assistant', 'content' => 'Pertanyaannya...'],
        ],
    ]);

    $response->assertCreated()->assertJsonPath('prd.title', 'Generator PRD');

    $this->assertDatabaseHas('prds', [
        'user_id' => $user->id,
        'title' => 'Generator PRD',
        'content' => '# Generator PRD',
    ]);
});

test('a user can update their prd', function () {
    $user = User::factory()->create();
    $prd = Prd::factory()->for($user)->create();

    $this->actingAs($user)
        ->putJson(route('prds.update', $prd), [
            'title' => 'Updated PRD',
            'idea' => $prd->idea,
            'model' => $prd->model,
            'content' => '# Updated PRD',
            'messages' => [
                ['role' => 'user', 'content' => 'Revisi'],
            ],
        ])
        ->assertOk()
        ->assertJsonPath('prd.title', 'Updated PRD');

    expect($prd->fresh()->content)->toBe('# Updated PRD');
});

test('a user cannot update another users prd', function () {
    $user = User::factory()->create();
    $foreignPrd = Prd::factory()->create();

    $this->actingAs($user)
        ->putJson(route('prds.update', $foreignPrd), [
            'title' => 'Hijacked',
            'model' => 'deepseek-v4-flash',
            'messages' => [],
        ])
        ->assertForbidden();
});

test('a user can delete their prd', function () {
    $user = User::factory()->create();
    $prd = Prd::factory()->for($user)->create();

    $this->actingAs($user)
        ->delete(route('prds.destroy', $prd))
        ->assertRedirect(route('dashboard'));

    $this->assertModelMissing($prd);
});

test('a user cannot delete another users prd', function () {
    $user = User::factory()->create();
    $foreignPrd = Prd::factory()->create();

    $this->actingAs($user)
        ->delete(route('prds.destroy', $foreignPrd))
        ->assertForbidden();

    $this->assertModelExists($foreignPrd);
});

test('storing a prd requires a title and valid model', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('prds.store'), [
            'model' => 'invalid-model',
            'messages' => [],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['title', 'model']);
});
