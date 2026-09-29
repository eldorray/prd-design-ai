<?php

namespace App\Http\Controllers;

use App\Concerns\BuildsPrdPrompt;
use App\Concerns\StreamsFromProvider;
use App\Http\Requests\PrdAssistantRequest;
use App\Support\AiQuota;
use App\Support\TokenUsage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Streams a generated or refined PRD as SSE, so the document appears while it
 * is written instead of after a silent wait of up to two minutes.
 */
class PrdStreamController extends Controller
{
    use BuildsPrdPrompt, StreamsFromProvider;

    public function __invoke(PrdAssistantRequest $request): StreamedResponse
    {
        if (function_exists('set_time_limit')) {
            set_time_limit(0);
        }

        $user = $request->user();
        $payload = $request->validated();
        $messages = $this->prdMessages($payload);

        $reservation = AiQuota::reserve($user, $payload['model'], $payload['mode'], TokenUsage::estimate($messages));

        if ($reservation === null) {
            abort(403, AiQuota::EXHAUSTED_MESSAGE);
        }

        return $this->sseResponse(
            fn () => $this->streamFromProvider($payload['model'], $this->prdRequestBody($payload, $messages, true), $reservation),
            $reservation,
            'Generate PRD gagal diproses server.',
        );
    }
}
