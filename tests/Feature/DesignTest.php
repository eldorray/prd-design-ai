<?php

use App\Models\Design;
use App\Models\User;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Psr7\FnStream;
use GuzzleHttp\Psr7\Request as GuzzleRequest;
use GuzzleHttp\Psr7\Response as GuzzleResponse;
use GuzzleHttp\Psr7\Utils;
use Illuminate\Support\Facades\Schema;

test('design studio shows the authenticated user history', function () {
    $user = User::factory()->create();
    $own = Design::factory()->for($user)->create(['title' => 'My Design']);
    Design::factory()->create(['title' => 'Someone else']);

    $this->actingAs($user)
        ->get(route('design.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('design')
            ->has('history', 1)
            ->where('history.0.id', $own->id)
            ->where('current', null));
});

test('design studio loads a selected design', function () {
    $user = User::factory()->create();
    $design = Design::factory()->for($user)->create();

    $this->actingAs($user)
        ->get(route('design.index', ['design' => $design->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('current.id', $design->id)
            ->where('current.html', $design->html));
});

test('a user cannot load another users design', function () {
    $user = User::factory()->create();
    $foreign = Design::factory()->create();

    $this->actingAs($user)
        ->get(route('design.index', ['design' => $foreign->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('current', null));
});

test('a user can store a design', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('designs.store'), [
            'title' => 'Coffee landing',
            'prompt' => 'Landing page kedai kopi',
            'kind' => 'landing-page',
            'model' => 'deepseek-v4-flash',
            'html' => '<!doctype html><html></html>',
            'messages' => [
                ['role' => 'user', 'content' => 'Buat landing kopi'],
                ['role' => 'assistant', 'content' => '<!doctype html>'],
            ],
        ])
        ->assertCreated()
        ->assertJsonPath('design.title', 'Coffee landing');

    $this->assertDatabaseHas('designs', [
        'user_id' => $user->id,
        'title' => 'Coffee landing',
        'kind' => 'landing-page',
    ]);
});

test('a user cannot update another users design', function () {
    $user = User::factory()->create();
    $foreign = Design::factory()->create();

    $this->actingAs($user)
        ->putJson(route('designs.update', $foreign), [
            'title' => 'Hijacked',
            'kind' => 'landing-page',
            'model' => 'deepseek-v4-flash',
            'messages' => [],
        ])
        ->assertForbidden();
});

test('a user can delete their design', function () {
    $user = User::factory()->create();
    $design = Design::factory()->for($user)->create();

    $this->actingAs($user)
        ->delete(route('designs.destroy', $design))
        ->assertRedirect(route('design.index'));

    $this->assertModelMissing($design);
});

test('storing a design validates kind and model', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('designs.store'), [
            'title' => 'Bad',
            'kind' => 'invalid-kind',
            'model' => 'invalid-model',
            'messages' => [],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['kind', 'model']);
});

test('design stream requires authentication', function () {
    $this->postJson(route('design-assistant.stream'), [
        'model' => 'deepseek-v4-flash',
        'mode' => 'generate',
        'kind' => 'landing-page',
        'prompt' => 'Landing page kopi',
    ])->assertUnauthorized();
});

test('design stream validates the payload', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('design-assistant.stream'), [
            'model' => 'invalid',
            'mode' => 'generate',
            'kind' => 'invalid',
            'prompt' => '',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['model', 'kind', 'prompt']);
});

test('design stream emits an error event when the api key is missing', function () {
    config(['services.deepseek.key' => null]);

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->postJson(route('design-assistant.stream'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'generate',
            'kind' => 'landing-page',
            'prompt' => 'Landing page kopi',
        ]);

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('text/event-stream');
    expect($response->streamedContent())->toContain('event: error');
});

test('a user can export their design as a zip with separated files', function () {
    $user = User::factory()->create();
    $design = Design::factory()->for($user)->create([
        'title' => 'Coffee Shop',
        'html' => '<!doctype html><html><head><style>body{color:red}</style></head>'.
            '<body><h1>Hi</h1><script>console.log(\'hi\')</script></body></html>',
    ]);

    $response = $this->actingAs($user)->get(route('designs.export', $design));

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('application/zip');
    expect($response->headers->get('content-disposition'))->toContain('coffee-shop.zip');
});

test('a user cannot export another users design', function () {
    $user = User::factory()->create();
    $foreign = Design::factory()->create();

    $this->actingAs($user)
        ->get(route('designs.export', $foreign))
        ->assertForbidden();
});

test('exporting a design without html returns not found', function () {
    $user = User::factory()->create();
    $design = Design::factory()->for($user)->draft()->create();

    $this->actingAs($user)
        ->get(route('designs.export', $design))
        ->assertNotFound();
});

test('a user can store a mobile-app design mockup', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson(route('designs.store'), [
        'title' => 'My Mobile App',
        'prompt' => 'A mobile app wallet design',
        'kind' => 'mobile-app',
        'model' => 'deepseek-v4-flash',
        'html' => '<html></html>',
        'messages' => [],
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('designs', [
        'user_id' => $user->id,
        'title' => 'My Mobile App',
        'kind' => 'mobile-app',
    ]);
});

test('designs table has a canvases json column', function () {
    expect(Schema::hasColumn('designs', 'canvases'))->toBeTrue();
});

test('canvases is cast to an array on the model', function () {
    $design = Design::factory()->create();

    expect($design->fresh()->canvases)->toBeArray()
        ->and($design->fresh()->canvases[0]['kind'])->toBeString();
});

test('a user can store a design with multiple canvases', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('designs.store'), [
            'title' => 'Multi project',
            'prompt' => 'Aplikasi toko online',
            'kind' => 'landing-page',
            'model' => 'deepseek-v4-flash',
            'html' => '<!doctype html><html></html>',
            'messages' => [],
            'canvases' => [
                ['kind' => 'landing-page', 'html' => '<html>L</html>', 'messages' => [], 'prompt' => 'x'],
                ['kind' => 'dashboard', 'html' => '<html>D</html>', 'messages' => [], 'prompt' => 'x'],
            ],
        ])
        ->assertCreated()
        ->assertJsonPath('design.canvases.1.kind', 'dashboard');
});

test('updating a design persists the canvases column', function () {
    $user = User::factory()->create();
    $design = Design::factory()->for($user)->create();

    $this->actingAs($user)
        ->putJson(route('designs.update', $design), [
            'title' => 'Updated project',
            'prompt' => 'Aplikasi toko online',
            'kind' => 'dashboard',
            'model' => 'deepseek-v4-flash',
            'html' => '<html>D</html>',
            'messages' => [],
            'canvases' => [
                ['kind' => 'landing-page', 'html' => '<html>L</html>', 'messages' => [], 'prompt' => 'x'],
                ['kind' => 'dashboard', 'html' => '<html>D</html>', 'messages' => [], 'prompt' => 'x'],
            ],
        ])
        ->assertOk()
        ->assertJsonPath('design.canvases.1.kind', 'dashboard');

    expect($design->fresh()->canvases)->toHaveCount(2)
        ->and($design->fresh()->canvases[0]['kind'])->toBe('landing-page');
});

test('storing a design rejects an invalid canvas kind', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('designs.store'), [
            'title' => 'Bad canvas',
            'kind' => 'landing-page',
            'model' => 'deepseek-v4-flash',
            'messages' => [],
            'canvases' => [
                ['kind' => 'not-a-kind', 'html' => '<html></html>', 'messages' => []],
            ],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['canvases.0.kind']);
});

test('loading a legacy design without canvases synthesizes one canvas', function () {
    $user = User::factory()->create();
    $design = Design::factory()->for($user)->create([
        'kind' => 'dashboard',
        'html' => '<html>legacy</html>',
        'canvases' => null,
    ]);

    $this->actingAs($user)
        ->get(route('design.index', ['design' => $design->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('current.canvases.0.kind', 'dashboard')
            ->where('current.canvases.0.html', '<html>legacy</html>'));
});

test('export strips the legacy visual edit bridge from the document', function () {
    $user = User::factory()->create();
    $design = Design::factory()->for($user)->create([
        'title' => 'Legacy Bridge',
        'html' => '<!doctype html><html><head></head><body><h1>Hi</h1>'.
            '<script data-design-edit-bridge>(function(){var editable=false;})()</script>'.
            '</body></html>',
    ]);

    $response = $this->actingAs($user)->get(route('designs.export', $design));

    $response->assertOk();

    $zip = new ZipArchive;
    $zip->open($response->getFile()->getPathname());
    $html = $zip->getFromName('index.html');
    $zip->close();

    expect($html)->not->toContain('data-design-edit-bridge');
    expect($html)->toContain('<h1>Hi</h1>');
});

function streamDesign(User $user): string
{
    return test()->actingAs($user)
        ->postJson(route('design-assistant.stream'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'generate',
            'kind' => 'landing-page',
            'prompt' => 'Landing page kopi',
        ])
        ->streamedContent();
}

test('a design stream that never reached the provider is refunded', function () {
    $request = new GuzzleRequest('POST', 'https://api.deepseek.com/chat/completions');
    fakeProviderStream([new ConnectException('Connection refused', $request)]);

    $user = User::factory()->create(['role' => 'user', 'token_quota' => 100000]);

    expect(streamDesign($user))->toContain('event: error')
        ->and($user->aiUsageLogs()->count())->toBe(0);
});

test('a design request that stalls after being sent keeps its reservation', function () {
    // The stream handler wraps a post-send timeout as a RequestException with
    // no response — the provider already has the prompt and may be generating.
    $request = new GuzzleRequest('POST', 'https://api.deepseek.com/chat/completions');
    fakeProviderStream([new RequestException('Read timed out', $request)]);

    $user = User::factory()->create(['role' => 'user', 'token_quota' => 100000]);

    expect(streamDesign($user))->toContain('event: error')
        ->and($user->aiUsageLogs()->count())->toBe(1);
});

test('a design stream that drops mid-flight keeps its reservation', function () {
    $reads = 0;
    $body = FnStream::decorate(Utils::streamFor(''), [
        'eof' => fn (): bool => false,
        'read' => function () use (&$reads): string {
            if ($reads++ === 0) {
                return 'data: '.json_encode(['choices' => [['delta' => ['content' => '<html>']]]])."\n\n";
            }

            throw new RuntimeException('Connection reset by peer');
        },
    ]);

    fakeProviderStream([new GuzzleResponse(200, ['Content-Type' => 'text/event-stream'], $body)]);

    $user = User::factory()->create(['role' => 'user', 'token_quota' => 100000]);

    expect(streamDesign($user))->toContain('event: chunk')->toContain('event: error')
        ->and($user->aiUsageLogs()->count())->toBe(1);
});

test('the design stream accepts only an inline reference image', function () {
    config(['services.deepseek.key' => null]);

    $user = User::factory()->create();
    $request = fn (string $image) => $this->actingAs($user)->postJson(route('design-assistant.stream'), [
        'model' => 'deepseek-v4-flash',
        'mode' => 'generate',
        'kind' => 'landing-page',
        'prompt' => 'Landing page kopi',
        'image' => $image,
    ]);

    $request('https://example.com/screenshot.png')->assertJsonValidationErrors('image');
    $request('data:text/html;base64,PGgxPkhpPC9oMT4=')->assertJsonValidationErrors('image');
    $request('data:image/png;base64,iVBORw0KGgo=')->assertOk();
});

test('the design stream counts its system prompt against the quota', function () {
    // The prompt alone is a handful of tokens; the system prompt and
    // guardrails are well over a thousand.
    $user = User::factory()->create(['role' => 'user', 'token_quota' => 600]);

    $this->actingAs($user)
        ->postJson(route('design-assistant.stream'), [
            'model' => 'deepseek-v4-flash',
            'mode' => 'generate',
            'kind' => 'landing-page',
            'prompt' => 'Landing page kopi',
        ])
        ->assertForbidden();
});

test('export keeps data scripts, modules and media styles inline', function () {
    $user = User::factory()->create();
    $design = Design::factory()->for($user)->create([
        'title' => 'Mixed Blocks',
        'html' => '<!doctype html><html><head><style>body{color:red}</style>'
            .'<style media="print">nav{display:none}</style>'
            .'<script type="application/ld+json">{"@type":"Organization"}</script></head>'
            .'<body><h1>Hi</h1><script type="module">import "./x.js"</script>'
            .'<script type="text/javascript">console.log(1)</script><script>console.log(2)</script></body></html>',
    ]);

    $response = $this->actingAs($user)->get(route('designs.export', $design));

    $zip = new ZipArchive;
    $zip->open($response->getFile()->getPathname());
    $html = $zip->getFromName('index.html');
    $css = $zip->getFromName('style.css');
    $js = $zip->getFromName('script.js');
    $zip->close();

    expect($html)
        ->toContain('<style media="print">nav{display:none}</style>')
        ->toContain('<script type="application/ld+json">{"@type":"Organization"}</script>')
        ->toContain('<script type="module">import "./x.js"</script>')
        ->and($css)->toBe('body{color:red}')
        ->and($js)->toBe("console.log(1)\nconsole.log(2)");
});
