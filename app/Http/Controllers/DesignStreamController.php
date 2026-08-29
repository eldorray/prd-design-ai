<?php

namespace App\Http\Controllers;

use App\Concerns\BuildsDesignPrompt;
use App\Http\Requests\DesignAssistantRequest;
use App\Models\AiUsageLog;
use App\Support\AiProvider;
use App\Support\AiQuota;
use App\Support\TokenUsage;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Arr;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class DesignStreamController extends Controller
{
    use BuildsDesignPrompt;

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
        $reservation = $user
            ? AiQuota::reserve($user, $payload['model'], $payload['mode'])
            : null;

        if ($user && $reservation === null) {
            abort(403, 'Kuota token AI Anda sudah habis. Silakan hubungi administrator.');
        }

        // Never pass the API key through method arguments: exception stack
        // traces include argument values, which would leak the key into logs.
        $response = new StreamedResponse(function () use ($payload, $reservation): void {
            try {
                $this->streamFromProvider($payload, $reservation);
            } catch (GuzzleException $exception) {
                report($exception);

                // The provider refused before streaming, so nothing was spent.
                AiQuota::release($reservation);

                // Gateway queue rejections arrive as HTTP 403/200 with an
                // isQueued payload — translate them into a friendly message.
                $rawBody = '';

                if ($exception instanceof ClientException) {
                    $rawBody = (string) $exception->getResponse()?->getBody();
                }

                $friendly = $rawBody !== '' ? AiProvider::friendlyProviderError($rawBody) : null;

                $this->send('error', [
                    'message' => $friendly ?? 'Tidak bisa terhubung ke penyedia AI. Coba lagi sebentar.',
                ]);
            } catch (Throwable $exception) {
                report($exception);
                AiQuota::release($reservation);
                $this->send('error', ['message' => 'Generate design gagal diproses server.']);
            }
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache');
        $response->headers->set('X-Accel-Buffering', 'no');
        $response->headers->set('Connection', 'keep-alive');

        return $response;
    }

    /**
     * Open the streaming request to the provider and forward content deltas.
     *
     * @param  array<string, mixed>  $payload
     *
     * @throws GuzzleException
     */
    private function streamFromProvider(array $payload, ?AiUsageLog $reservation): void
    {
        $apiKey = AiProvider::apiKey($payload['model']);

        if ($apiKey === null) {
            AiQuota::release($reservation);
            $this->send('error', ['message' => 'API key untuk model ini belum dikonfigurasi di server.']);

            return;
        }

        $client = new Client([
            // Total timeout stays unlimited: long generations are fine. The
            // read timeout instead kills streams whose provider has stalled.
            'timeout' => 0,
            'connect_timeout' => 10,
            'read_timeout' => 90,
        ]);

        $body = $this->chatBody($payload, true);
        $body['stream_options'] = ['include_usage' => true];

        $stream = $client->post($this->chatUrl($payload['model']), [
            'headers' => [
                'Authorization' => 'Bearer '.$apiKey,
                'Accept' => 'text/event-stream',
                'Content-Type' => 'application/json',
            ],
            'json' => $body,
            'stream' => true,
        ])->getBody();

        $buffer = '';
        $accumulatedHtml = '';
        $apiUsage = null;

        while (! $stream->eof()) {
            $buffer .= $stream->read(1024);

            // SSE events are separated by a blank line.
            while (($position = strpos($buffer, "\n")) !== false) {
                $line = trim(substr($buffer, 0, $position));
                $buffer = substr($buffer, $position + 1);

                if ($line === '' || ! str_starts_with($line, 'data:')) {
                    continue;
                }

                $data = trim(substr($line, 5));

                if ($data === '[DONE]') {
                    AiQuota::settle($reservation, TokenUsage::total($apiUsage, $body['messages'], $accumulatedHtml));
                    $this->send('done', []);

                    return;
                }

                $decoded = json_decode($data, true);
                if (isset($decoded['usage'])) {
                    $apiUsage = $decoded['usage'];
                }

                $delta = Arr::get($decoded, 'choices.0.delta.content');

                if (is_string($delta) && $delta !== '') {
                    $accumulatedHtml .= $delta;
                    $this->send('chunk', ['delta' => $delta]);
                }
            }
        }

        AiQuota::settle($reservation, TokenUsage::total($apiUsage, $body['messages'], $accumulatedHtml));
        $this->send('done', []);
    }

    /**
     * Emit a single Server-Sent Event and flush it to the client.
     *
     * @param  array<string, mixed>  $data
     */
    private function send(string $event, array $data): void
    {
        echo 'event: '.$event."\n";
        echo 'data: '.json_encode($data)."\n\n";

        if (ob_get_level() > 0) {
            @ob_flush();
        }

        flush();
    }
}
