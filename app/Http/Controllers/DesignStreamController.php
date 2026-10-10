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

        $payload = $request->validated();
        $body = $this->chatBody($payload, true);

        // Debit an estimate of everything sent, system prompt included, before
        // the stream opens. The studio fires one request per selected canvas
        // in parallel, and a balance check that only wrote its usage at the end
        // let every one of them through. Blocked accounts never get here:
        // EnsureUserNotBlocked runs on every web request.
        $reservation = AiQuota::reserve($request->user(), $payload['model'], $payload['mode'], TokenUsage::estimate($body['messages']));

        if ($reservation === null) {
            abort(403, AiQuota::EXHAUSTED_MESSAGE);
        }

        return $this->sseResponse(
            fn () => $this->streamFromProvider($payload['model'], $body, $reservation),
            $reservation,
            'Generate design gagal diproses server.',
        );
    }
}
