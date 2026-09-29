<?php

use App\Models\User;
use App\Support\PrdTemplate;
use GuzzleHttp\Psr7\Response as GuzzleResponse;
use Illuminate\Support\Facades\Http;

/**
 * Send one PRD assistant request and return the system prompt it produced.
 *
 * @param  array<string, mixed>  $overrides
 */
function prdSystemPromptFor(array $overrides = []): array
{
    config([
        'services.deepseek.key' => 'test-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    Http::fake([
        'https://api.deepseek.com/chat/completions' => Http::response([
            'choices' => [['message' => ['content' => '## API Endpoints']]],
        ]),
    ]);

    test()->actingAs(User::factory()->create())
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'generate',
            'idea' => 'Aplikasi kasir warung kopi',
            'messages' => [['role' => 'user', 'content' => 'Target: pemilik warung.']],
            ...$overrides,
        ])
        ->assertOk();

    $sent = null;
    Http::assertSent(function ($request) use (&$sent): bool {
        $sent = $request->data();

        return true;
    });

    return $sent;
}

test('the generate prompt asks for a full specification per feature', function () {
    $prompt = prdSystemPromptFor()['messages'][0]['content'];

    expect($prompt)
        ->toContain('### F-01')
        ->toContain('(P0)')
        ->toContain('User story')
        ->toContain('Aturan & validasi')
        ->toContain('State & error')
        ->toContain('Hak akses')
        ->toContain('(asumsi)')
        ->toContain('### AC F-01')
        ->toContain('Given')
        ->toContain(PrdTemplate::MAX_WORDS.' kata');
});

test('the generate prompt lists every required section in order', function () {
    $prompt = prdSystemPromptFor()['messages'][0]['content'];

    $positions = array_map(
        fn (string $section): int|false => strpos($prompt, "\n## {$section}\n"),
        PrdTemplate::SECTIONS,
    );

    expect($positions)->not->toContain(false)
        ->and($positions)->toBe(collect($positions)->sort()->values()->all());
});

test('complete mode asks only for the missing sections with their format rules', function () {
    $body = prdSystemPromptFor([
        'mode' => 'complete',
        'draft' => "# Kasir Kopi\n\n## Ringkasan\nKasir sederhana.",
        'missing_sections' => ['API Endpoints', 'Task Breakdown'],
    ]);

    $prompt = $body['messages'][0]['content'];

    expect($prompt)
        ->toContain('Tulis HANYA section berikut')
        ->toContain("## API Endpoints\n## Task Breakdown")
        ->toContain('Method | Endpoint | Deskripsi | Auth')
        ->toContain('Kasir sederhana.')
        ->and($body['temperature'])->toBe(0.35);
});

test('complete mode needs known section names', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'complete',
            'draft' => '# PRD',
            'messages' => [['role' => 'user', 'content' => 'Lengkapi']],
        ])
        ->assertJsonValidationErrors('missing_sections');

    $this->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'complete',
            'draft' => '# PRD',
            'missing_sections' => ['Bukan Section'],
            'messages' => [['role' => 'user', 'content' => 'Lengkapi']],
        ])
        ->assertJsonValidationErrors('missing_sections.0');
});

test('the workspace receives the required section list', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page->where('prdSections', PrdTemplate::SECTIONS));
});

test('the stream reports when the provider cut the document off', function () {
    $sse = implode("\n\n", [
        'data: '.json_encode(['choices' => [['delta' => ['content' => '## Ringkasan']]]]),
        'data: '.json_encode(['choices' => [['delta' => [], 'finish_reason' => 'length']]]),
        'data: [DONE]',
    ])."\n\n";

    fakeProviderStream([new GuzzleResponse(200, [], $sse)]);

    $content = $this->actingAs(User::factory()->create(['token_quota' => 100000]))
        ->postJson(route('prd-assistant.stream'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'generate',
            'messages' => [['role' => 'user', 'content' => 'Ide']],
        ])
        ->streamedContent();

    expect($content)->toContain("event: done\ndata: ".json_encode(['truncated' => true]));
});

test('a stream that finished normally is not marked as cut off', function () {
    $sse = implode("\n\n", [
        'data: '.json_encode(['choices' => [['delta' => ['content' => '## Ringkasan']]]]),
        'data: '.json_encode(['choices' => [['delta' => [], 'finish_reason' => 'stop']]]),
        'data: [DONE]',
    ])."\n\n";

    fakeProviderStream([new GuzzleResponse(200, [], $sse)]);

    $content = $this->actingAs(User::factory()->create(['token_quota' => 100000]))
        ->postJson(route('prd-assistant.stream'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'generate',
            'messages' => [['role' => 'user', 'content' => 'Ide']],
        ])
        ->streamedContent();

    expect($content)->toContain("event: done\ndata: ".json_encode(['truncated' => false]));
});
