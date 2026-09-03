<?php

use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

test('authenticated users can send an interview message to deepseek', function () {
    config([
        'services.deepseek.key' => 'test-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    Http::fake([
        'https://api.deepseek.com/chat/completions' => Http::response([
            'model' => 'deepseek-v4-flash',
            'choices' => [
                [
                    'message' => [
                        'content' => 'Siapa target user utama produk ini?',
                    ],
                ],
            ],
            'usage' => [
                'total_tokens' => 128,
            ],
        ]),
    ]);

    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'interview',
            'idea' => 'AI PRD Generator',
            'draft' => '',
            'messages' => [
                [
                    'role' => 'user',
                    'content' => 'Saya ingin membuat PRD generator.',
                ],
            ],
        ]);

    $response
        ->assertOk()
        ->assertJsonPath('message', 'Siapa target user utama produk ini?')
        ->assertJsonPath('model', 'deepseek-v4-flash')
        ->assertJsonPath('usage.total_tokens', 128);

    Http::assertSent(fn ($request): bool => $request->hasHeader('Authorization', 'Bearer test-key')
        && $request['model'] === 'deepseek-v4-flash'
        && $request['thinking']['type'] === 'disabled'
        && ! array_key_exists('reasoning_effort', $request->data())
        && $request['messages'][0]['role'] === 'system'
        && $request['messages'][1]['role'] === 'user');
});

test('pro model enables thinking and reasoning effort', function () {
    config([
        'services.deepseek.key' => 'test-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    Http::fake([
        'https://api.deepseek.com/chat/completions' => Http::response([
            'model' => 'deepseek-v4-pro',
            'choices' => [
                [
                    'message' => [
                        'content' => '# Produk',
                    ],
                ],
            ],
        ]),
    ]);

    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-pro',
            'mode' => 'generate',
            'messages' => [
                [
                    'role' => 'user',
                    'content' => 'Generate PRD.',
                ],
            ],
        ])
        ->assertOk();

    Http::assertSent(fn ($request): bool => $request['model'] === 'deepseek-v4-pro'
        && $request['thinking']['type'] === 'enabled'
        && $request['reasoning_effort'] === 'high');
});

test('assistant request validates model names', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-chat',
            'mode' => 'interview',
            'messages' => [
                [
                    'role' => 'user',
                    'content' => 'Halo',
                ],
            ],
        ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('model');
});

test('assistant returns service unavailable when key is missing', function () {
    config(['services.deepseek.key' => null]);

    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-pro',
            'mode' => 'generate',
            'messages' => [
                [
                    'role' => 'user',
                    'content' => 'Generate PRD.',
                ],
            ],
        ]);

    $response->assertStatus(503);
});

test('gemini model routes to the gemini provider without thinking options', function () {
    config([
        'services.gemini.key' => 'gemini-test-key',
        'services.gemini.base_url' => 'https://generativelanguage.googleapis.com/v1beta/openai',
    ]);

    Http::fake([
        'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' => Http::response([
            'model' => 'gemini-3.5-flash',
            'choices' => [
                ['message' => ['content' => 'Siapa target user produk ini?']],
            ],
        ]),
    ]);

    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'gemini-3.5-flash',
            'mode' => 'interview',
            'messages' => [
                ['role' => 'user', 'content' => 'Saya ingin membuat PRD generator.'],
            ],
        ])
        ->assertOk()
        ->assertJsonPath('message', 'Siapa target user produk ini?');

    Http::assertSent(fn ($request): bool => str_contains($request->url(), 'generativelanguage.googleapis.com')
        && $request->hasHeader('Authorization', 'Bearer gemini-test-key')
        && $request['model'] === 'gemini-3.5-flash'
        && ! array_key_exists('thinking', $request->data())
        && ! array_key_exists('reasoning_effort', $request->data()));
});

test('gemini model returns service unavailable when gemini key is missing', function () {
    config(['services.gemini.key' => null]);

    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'gemini-3.5-flash',
            'mode' => 'interview',
            'messages' => [
                ['role' => 'user', 'content' => 'Halo'],
            ],
        ])
        ->assertStatus(503);
});

test('provider gateway timeout returns an actionable message', function () {
    config([
        'services.deepseek.key' => 'test-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    Http::fake([
        'https://api.deepseek.com/chat/completions' => Http::response('Gateway Time-out', 504),
    ]);

    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'interview',
            'messages' => [
                ['role' => 'user', 'content' => 'Ide produk saya'],
            ],
        ])
        ->assertStatus(504)
        ->assertJsonPath('message', 'Penyedia AI kehabisan waktu saat memproses permintaan. Coba kirim lagi atau pilih model lain.');
});

test('interview system prompt includes anti-repeat rule, answer count, and ready signal', function () {
    config([
        'services.deepseek.key' => 'test-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    Http::fake([
        'https://api.deepseek.com/chat/completions' => Http::response([
            'choices' => [['message' => ['content' => 'PERTANYAAN: Siapa target user?']]],
        ]),
    ]);

    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'interview',
            'messages' => [
                ['role' => 'user', 'content' => 'Ide: PRD generator.'],
                ['role' => 'assistant', 'content' => 'PERTANYAAN: Siapa target user?'],
                ['role' => 'user', 'content' => 'Solo founder.'],
            ],
        ])
        ->assertOk();

    Http::assertSent(fn ($request): bool => str_contains($request['messages'][0]['content'], 'Jangan mengulang pertanyaan')
        && str_contains($request['messages'][0]['content'], '[SIAP_GENERATE]')
        && str_contains($request['messages'][0]['content'], 'sudah menjawab 2 kali'));
});

test('generate system prompt includes the full document structure', function () {
    config([
        'services.deepseek.key' => 'test-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    Http::fake([
        'https://api.deepseek.com/chat/completions' => Http::response([
            'choices' => [['message' => ['content' => '# Produk']]],
        ]),
    ]);

    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'generate',
            'messages' => [
                ['role' => 'user', 'content' => 'Generate PRD.'],
            ],
        ])
        ->assertOk();

    Http::assertSent(function ($request): bool {
        $prompt = $request['messages'][0]['content'];

        return str_contains($prompt, 'jawaban interview')
            && str_contains($prompt, '2500 kata')
            && str_contains($prompt, '## Diagram ERD')
            && str_contains($prompt, 'erDiagram')
            && str_contains($prompt, '## API Endpoints')
            && str_contains($prompt, '## Task Breakdown')
            && str_contains($prompt, '## Metrik Keberhasilan')
            && str_contains($prompt, '## Non-Functional Requirements')
            && str_contains($prompt, '## Rekomendasi Tech Stack')
            && str_contains($prompt, '- [ ]');
    });
});

test('refine system prompt demands document-only output', function () {
    config([
        'services.deepseek.key' => 'test-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    Http::fake([
        'https://api.deepseek.com/chat/completions' => Http::response([
            'choices' => [['message' => ['content' => '# Produk Revisi']]],
        ]),
    ]);

    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'refine',
            'draft' => '# Produk',
            'messages' => [
                ['role' => 'user', 'content' => 'Tambahkan acceptance criteria.'],
            ],
        ])
        ->assertOk();

    Http::assertSent(fn ($request): bool => str_contains($request['messages'][0]['content'], 'tanpa pembuka atau penutup percakapan'));
});

test('ai endpoints are rate limited per user', function () {
    config([
        'services.deepseek.key' => 'test-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    Http::fake([
        'https://api.deepseek.com/*' => Http::response([
            'choices' => [['message' => ['content' => 'PERTANYAAN: Siapa target?']]],
        ]),
    ]);

    $user = User::factory()->create();

    $this->actingAs($user);

    foreach (range(1, 10) as $i) {
        $response = $this->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'interview',
            'messages' => [
                ['role' => 'user', 'content' => "Pesan ke-{$i}"],
            ],
        ]);
        expect($response->status())->not->toBe(429);
    }

    // The 11th request within the same minute must be throttled.
    $this->postJson(route('prd-assistant.messages'), [
        'model' => 'deepseek-v4-flash',
        'mode' => 'interview',
        'messages' => [
            ['role' => 'user', 'content' => 'Pesan ke-11'],
        ],
    ])->assertStatus(429);
});

test('provider error bodies are not leaked to the client', function () {
    config([
        'services.deepseek.key' => 'test-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    Http::fake([
        'https://api.deepseek.com/*' => Http::response([
            'error' => ['message' => 'Internal secret detail sk-abc123'],
        ], 500),
    ]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'interview',
            'messages' => [
                ['role' => 'user', 'content' => 'Halo'],
            ],
        ])
        ->assertStatus(502)
        ->assertJsonMissing(['detail']);
});

test('a transient 502 is retried once and succeeds without user-visible error', function () {
    config([
        'services.deepseek.key' => 'test-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    $attempts = 0;

    Http::fake(function () use (&$attempts) {
        $attempts++;

        if ($attempts === 1) {
            return Http::response('Bad Gateway', 502);
        }

        return Http::response([
            'choices' => [['message' => ['content' => 'PERTANYAAN: Siapa target user?']]],
        ]);
    });

    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'interview',
            'messages' => [
                ['role' => 'user', 'content' => 'Ide produk saya'],
            ],
        ])
        ->assertOk()
        ->assertJsonPath('message', 'PERTANYAAN: Siapa target user?');

    expect($attempts)->toBe(2);
});

test('a persistent 502 surfaces a friendly error after the retry', function () {
    config([
        'services.deepseek.key' => 'test-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    $attempts = 0;

    Http::fake(function () use (&$attempts) {
        $attempts++;

        return Http::response('Bad Gateway', 502);
    });

    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'interview',
            'messages' => [
                ['role' => 'user', 'content' => 'Ide produk saya'],
            ],
        ])
        ->assertStatus(502);

    expect($attempts)->toBe(2);
});

test('a dropped connection is retried once before failing', function () {
    config([
        'services.deepseek.key' => 'test-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    $attempts = 0;

    Http::fake(function () use (&$attempts) {
        $attempts++;

        if ($attempts === 1) {
            throw new ConnectionException('timed out');
        }

        return Http::response([
            'choices' => [['message' => ['content' => 'PERTANYAAN: Siapa target user?']]],
        ]);
    });

    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('prd-assistant.messages'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'interview',
            'messages' => [
                ['role' => 'user', 'content' => 'Ide produk saya'],
            ],
        ])
        ->assertOk();

    expect($attempts)->toBe(2);
});
