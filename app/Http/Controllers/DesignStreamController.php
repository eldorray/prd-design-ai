<?php

namespace App\Http\Controllers;

use App\Concerns\BuildsDesignPrompt;
use App\Concerns\StreamsFromProvider;
use App\Http\Requests\DesignAssistantRequest;
use App\Support\AiQuota;
use App\Support\TokenUsage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DesignStreamController extends Controller
{
    use BuildsDesignPrompt, StreamsFromProvider;

    /**
     * Stream the generated HTML from the AI provider to the browser as SSE.
     */
    public function __invoke(DesignAssistantRequest $request): StreamedResponse
    {
        if (function_exists('set_time_limit')) {
            set_time_limit(0);
        }

        $user = $request->user();

        if ($user && $user->isBlocked()) {
            abort(403, 'Akun Anda ditangguhkan.');
        }

        $payload = $request->validated();

        // Debit an estimate before the stream opens. The studio fires one
        // request per selected canvas in parallel, and a balance check that
        // only wrote its usage at the end let every one of them through.
        $promptTokens = TokenUsage::estimate([
            ['content' => $payload['prompt']],
            ['content' => $payload['current_html'] ?? ''],
        ]);

        $reservation = $user
            ? AiQuota::reserve($user, $payload['model'], $payload['mode'], $promptTokens)
            : null;

        if ($user && $reservation === null) {
            abort(403, AiQuota::EXHAUSTED_MESSAGE);
        }

        return $this->sseResponse(
            // The body is built inside the stream: it may wait on Context7,
            // and the connection should already be open by then.
            fn () => $this->streamFromProvider($payload['model'], $this->chatBody($payload, true), $reservation),
            $reservation,
            'Generate design gagal diproses server.',
        );
    }
}
