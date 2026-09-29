<?php

namespace App\Http\Controllers;

use App\Concerns\BuildsPrdPrompt;
use App\Http\Requests\PrdAssistantRequest;
use App\Support\AiProvider;
use App\Support\AiQuota;
use App\Support\TokenUsage;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Throwable;

class PrdAssistantController extends Controller
{
    use BuildsPrdPrompt;

    /**
     * Handle the incoming request.
     */
    public function __invoke(PrdAssistantRequest $request): JsonResponse
    {
        if (function_exists('set_time_limit')) {
            set_time_limit(120);
        }

        $user = $request->user();

        if ($user && $user->isBlocked()) {
            return response()->json([
                'message' => 'Akun Anda ditangguhkan.',
            ], 403);
        }

        $payload = $request->validated();
        $apiKey = AiProvider::apiKey($payload['model']);

        if ($apiKey === null) {
            return response()->json([
                'message' => 'API key untuk model ini belum dikonfigurasi di server.',
            ], 503);
        }

        $messages = $this->prdMessages($payload);

        // Debit an estimate before the provider call so parallel requests
        // cannot all clear the same balance. Settled with the real usage below.
        $reservation = null;

        if ($user) {
            $reservation = AiQuota::reserve($user, $payload['model'], $payload['mode'], TokenUsage::estimate($messages));

            if ($reservation === null) {
                return response()->json([
                    'message' => AiQuota::EXHAUSTED_MESSAGE,
                ], 403);
            }
        }

        $requestBody = $this->prdRequestBody($payload, $messages, false);

        try {
            $response = $this->callProvider($payload['model'], $apiKey, $requestBody);
        } catch (ConnectionException $exception) {
            report($exception);

            // A timeout after the prompt went out was still billed upstream,
            // so the reservation stands in for those tokens.
            if (! AiProvider::requestReachedProvider($exception)) {
                AiQuota::release($reservation);
            }

            return response()->json([
                'message' => 'Koneksi ke penyedia AI terputus atau terlalu lama (timeout). Coba kirim ulang — jika berulang, pilih model lain di dropdown.',
            ], 502);
        } catch (Throwable $exception) {
            report($exception);
            AiQuota::release($reservation);

            return response()->json([
                'message' => 'Generate PRD gagal diproses server. Coba lagi sebentar.',
            ], 500);
        }

        if ($response->failed()) {
            // The provider refused the request, so nothing was spent.
            AiQuota::release($reservation);

            // Log the provider's raw body server-side; never forward it to
            // the client — it can echo back request payloads and URLs.
            logger()->warning('AI provider error', [
                'status' => $response->status(),
                'body' => mb_substr($response->body(), 0, 500),
            ]);

            // Recognize gateway queue rejections (HTTP 403 + isQueued payload)
            // and surface them with a friendly retry hint instead of raw JSON.
            $friendly = AiProvider::friendlyProviderError($response->body());
            $isGatewayTimeout = $response->status() === 504;

            return response()->json([
                'message' => match (true) {
                    $friendly !== null => $friendly,
                    $isGatewayTimeout => 'Penyedia AI kehabisan waktu saat memproses permintaan. Coba kirim lagi atau pilih model lain.',
                    default => 'Penyedia AI mengembalikan error. Coba lagi sebentar.',
                },
                'retry_after' => $friendly !== null ? $this->queueRetrySeconds($response->body()) : null,
            ], match (true) {
                $friendly !== null => 429,
                $isGatewayTimeout => 504,
                default => 502,
            });
        }

        $content = $response->json('choices.0.message.content');

        if (! is_string($content) || trim($content) === '') {
            // Tokens were still spent producing the unusable answer, so the
            // reservation stands rather than being refunded.
            return response()->json([
                'message' => 'AI tidak mengembalikan pesan yang bisa dibaca.',
            ], 502);
        }

        AiQuota::settle($reservation, TokenUsage::total($response->json('usage'), $messages, $content));

        return response()->json([
            'message' => trim($content),
            'model' => $response->json('model', $payload['model']),
            'usage' => $response->json('usage'),
        ]);
    }

    /**
     * Call the provider with a single automatic retry on transient failures
     * (connection errors and 5xx). This is the only retry layer — the browser
     * no longer retries on top of it, which used to multiply one click into
     * several paid generations.
     *
     * @param  array<string, mixed>  $requestBody
     */
    private function callProvider(string $model, string $apiKey, array $requestBody): Response
    {
        $send = fn (): Response => Http::withToken($apiKey)
            ->acceptJson()
            ->asJson()
            ->connectTimeout(10)
            ->timeout(110)
            ->post(AiProvider::chatUrl($model), $requestBody);

        try {
            $response = $send();
        } catch (ConnectionException $exception) {
            // One silent retry, but only when the prompt never left (DNS blip,
            // refused connection). A read timeout means the provider is already
            // generating; resending would pay for the same answer twice.
            if (AiProvider::requestReachedProvider($exception)) {
                throw $exception;
            }

            report($exception);
            $response = $send();
        }

        // Retry once on server-side provider errors too (502/503/504) —
        // these are almost always transient gateway states.
        if ($response->serverError()) {
            usleep(500_000);
            $response = $send();
        }

        return $response;
    }

    /**
     * Extract retryAfterSeconds from a (possibly double-encoded) gateway
     * queue-error body. Null when absent or unparsable.
     */
    private function queueRetrySeconds(string $body): ?int
    {
        $decoded = json_decode($body, true);

        if (! is_array($decoded)) {
            return null;
        }

        if (is_string($decoded['message'] ?? null)) {
            $inner = json_decode($decoded['message'], true);

            if (is_array($inner)) {
                $decoded = array_merge($decoded, $inner);
            }
        }

        return isset($decoded['retryAfterSeconds'])
            ? max(1, (int) $decoded['retryAfterSeconds'])
            : null;
    }
}
