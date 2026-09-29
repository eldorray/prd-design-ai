<?php

use App\Models\AiUsageLog;
use App\Models\User;
use App\Support\AiQuota;
use GuzzleHttp\Psr7\Response as GuzzleResponse;

/**
 * An OpenAI-style SSE body with the given content deltas.
 *
 * @param  list<string>  $deltas
 */
function providerSse(array $deltas, int $totalTokens = 321): string
{
    $events = array_map(
        fn (string $delta): string => 'data: '.json_encode(['choices' => [['delta' => ['content' => $delta]]]]),
        $deltas,
    );

    $events[] = 'data: '.json_encode(['choices' => [], 'usage' => ['total_tokens' => $totalTokens]]);
    $events[] = 'data: [DONE]';

    return implode("\n\n", $events)."\n\n";
}

function streamPrd(User $user, string $mode = 'generate'): string
{
    return test()->actingAs($user)
        ->postJson(route('prd-assistant.stream'), [
            'model' => 'deepseek-v4-flash',
            'mode' => $mode,
            'idea' => 'Aplikasi kasir untuk warung kopi',
            'messages' => [['role' => 'user', 'content' => 'Target: pemilik warung.']],
        ])
        ->streamedContent();
}

test('the prd stream requires authentication', function () {
    $this->postJson(route('prd-assistant.stream'), [
        'model' => 'deepseek-v4-flash',
        'mode' => 'generate',
        'messages' => [['role' => 'user', 'content' => 'Ide']],
    ])->assertUnauthorized();
});

test('a generated prd streams chunk by chunk and settles the real usage', function () {
    fakeProviderStream([new GuzzleResponse(200, ['Content-Type' => 'text/event-stream'], providerSse(['# Kasir Kopi', "\n## Ringkasan"]))]);

    $user = User::factory()->create(['role' => 'user', 'token_quota' => 100000]);

    $content = streamPrd($user);

    expect($content)
        ->toContain('event: chunk')
        ->toContain(json_encode(['delta' => '# Kasir Kopi']))
        ->toContain('event: done')
        ->and((int) $user->aiUsageLogs()->sum('total_tokens'))->toBe(321);
});

test('the prd stream sends the same generate prompt with streaming enabled', function () {
    $history = [];
    fakeProviderStream([new GuzzleResponse(200, [], providerSse(['# PRD']))], $history);

    streamPrd(User::factory()->create(['token_quota' => 100000]));

    $body = json_decode((string) $history[0]['request']->getBody(), true);

    expect($body['stream'])->toBeTrue()
        ->and($body['stream_options'])->toBe(['include_usage' => true])
        ->and($body['messages'][0]['role'])->toBe('system')
        ->and($body['messages'][0]['content'])
        ->toContain('## Diagram ERD')
        ->toContain('Aplikasi kasir untuk warung kopi')
        ->toContain('GUARDRAIL ANTI-SLOP UNTUK PRD');
});

test('the prd stream refuses when the quota is exhausted', function () {
    $history = [];
    fakeProviderStream([], $history);

    $user = User::factory()->create(['role' => 'user', 'token_quota' => 100]);
    AiUsageLog::create(['user_id' => $user->id, 'model' => 'deepseek-v4-flash', 'mode' => 'generate', 'total_tokens' => 100]);

    $this->actingAs($user)
        ->postJson(route('prd-assistant.stream'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'generate',
            'messages' => [['role' => 'user', 'content' => 'Ide']],
        ])
        ->assertForbidden()
        ->assertJsonPath('message', AiQuota::EXHAUSTED_MESSAGE);

    expect($history)->toBe([]);
});
