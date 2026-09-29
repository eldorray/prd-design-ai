<?php

use App\Models\Prd;
use App\Models\PrdVersion;
use App\Models\User;

/**
 * @return array<string, mixed>
 */
function prdPayload(Prd $prd, string $content): array
{
    return [
        'title' => $prd->title,
        'idea' => $prd->idea,
        'model' => 'deepseek-v4-flash',
        'content' => $content,
        'messages' => $prd->messages,
    ];
}

test('changing a prd keeps the previous content as a version', function () {
    $prd = Prd::factory()->create(['content' => '# Versi lama']);

    $this->actingAs($prd->user)
        ->putJson(route('prds.update', $prd), prdPayload($prd, '# Versi baru'))
        ->assertOk();

    expect($prd->versions()->pluck('content')->all())->toBe(['# Versi lama'])
        ->and($prd->fresh()->content)->toBe('# Versi baru');
});

test('saving unchanged or first content does not create a version', function () {
    $draft = Prd::factory()->draft()->create();

    $this->actingAs($draft->user)
        ->putJson(route('prds.update', $draft), prdPayload($draft, '# Pertama'))
        ->assertOk();

    $this->actingAs($draft->user)
        ->putJson(route('prds.update', $draft), prdPayload($draft->fresh(), '# Pertama'))
        ->assertOk();

    expect(PrdVersion::count())->toBe(0);
});

test('only the most recent versions are kept', function () {
    $prd = Prd::factory()->create(['content' => '# v0']);

    foreach (range(1, PrdVersion::KEEP + 5) as $revision) {
        $this->travel(1)->minutes();
        $this->actingAs($prd->user)
            ->putJson(route('prds.update', $prd), prdPayload($prd, "# v{$revision}"))
            ->assertOk();
    }

    expect($prd->versions()->count())->toBe(PrdVersion::KEEP)
        ->and($prd->versions()->latest()->first()->content)->toBe('# v'.(PrdVersion::KEEP + 4));
});

test('restoring a version brings its content back and is itself undoable', function () {
    $prd = Prd::factory()->create(['content' => '# Versi bagus']);

    $this->actingAs($prd->user)
        ->putJson(route('prds.update', $prd), prdPayload($prd, '# Refine jelek'))
        ->assertOk();

    $version = $prd->versions()->first();

    $this->actingAs($prd->user)
        ->postJson(route('prds.versions.restore', [$prd, $version]))
        ->assertOk()
        ->assertJsonPath('prd.content', '# Versi bagus');

    expect($prd->fresh()->content)->toBe('# Versi bagus')
        ->and($prd->versions()->pluck('content')->all())->toContain('# Refine jelek');
});

test('a user cannot restore another users prd version', function () {
    $prd = Prd::factory()->create(['content' => '# Milik orang']);
    $version = $prd->versions()->create(['content' => '# Lama']);

    $this->actingAs(User::factory()->create())
        ->postJson(route('prds.versions.restore', [$prd, $version]))
        ->assertForbidden();

    expect($prd->fresh()->content)->toBe('# Milik orang');
});

test('a version cannot be restored onto a different prd', function () {
    $user = User::factory()->create();
    $mine = Prd::factory()->for($user)->create();
    $other = Prd::factory()->for($user)->create();
    $version = $other->versions()->create(['content' => '# Punya PRD lain']);

    $this->actingAs($user)
        ->postJson(route('prds.versions.restore', [$mine, $version]))
        ->assertNotFound();
});

test('the workspace lists versions of the open prd without their content', function () {
    $prd = Prd::factory()->create();
    $prd->versions()->create(['content' => str_repeat('Isi panjang. ', 500)]);

    $this->actingAs($prd->user)
        ->get(route('dashboard', ['prd' => $prd->id]))
        ->assertInertia(fn ($page) => $page
            ->has('versions', 1)
            ->missing('versions.0.content')
            ->has('versions.0.id')
            ->has('versions.0.created_at')
            ->has('versions.0.characters'),
        );
});
