<?php

namespace App\Concerns;

use App\Models\AiUsageLog;
use App\Support\AiProvider;
use App\Support\AiQuota;
use App\Support\TokenUsage;
use Closure;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Arr;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * Forwards an OpenAI-style streaming completion to the browser as SSE
 * (`chunk`, `done` and `error` events), settling the quota reservation
 * against the real usage. Shared by the PRD and design streams.
 */
trait StreamsFromProvider
{
    /**
     * Wrap a provider stream in an SSE response with the shared failure
     * handling.
     *
     * @param  Closure(): void  $stream
     */
    protected function sseResponse(Closure $stream, ?AiUsageLog $reservation, string $serverErrorMessage): StreamedResponse
    {
        // Never pass the API key through method arguments: exception stack
        // traces include argument values, which would leak the key into logs.
        $response = new StreamedResponse(function () use ($stream, $reservation, $serverErrorMessage): void {
            try {
                $stream();
            } catch (GuzzleException $exception) {
                report($exception);

                // Refund only when nothing was generated: the connection never
                // opened, or the provider refused. A prompt that went out and
                // then stalled may already be burning tokens upstream.
                if (! AiProvider::requestReachedProvider($exception)) {
                    AiQuota::release($reservation);
                }

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
                // Mid-stream failures land here, after the provider started
                // generating, so the reservation stands for the burned tokens.
                // ponytail: a rare pre-send server bug is charged the estimate too.
                report($exception);
                $this->send('error', ['message' => $serverErrorMessage]);
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
     * @param  array<string, mixed>  $body  Chat completions body; streaming is forced on.
     *
     * @throws GuzzleException
     */
    protected function streamFromProvider(string $model, array $body, ?AiUsageLog $reservation): void
    {
        $apiKey = AiProvider::apiKey($model);

        if ($apiKey === null) {
            AiQuota::release($reservation);
            $this->send('error', ['message' => 'API key untuk model ini belum dikonfigurasi di server.']);

            return;
        }

        $client = app(Client::class, ['config' => [
            // Total timeout stays unlimited: long generations are fine. The
            // read timeout instead kills streams whose provider has stalled.
            'timeout' => 0,
            'connect_timeout' => 10,
            'read_timeout' => 90,
        ]]);

        $body['stream'] = true;
        $body['stream_options'] = ['include_usage' => true];

        $stream = $client->post(AiProvider::chatUrl($model), [
            'headers' => [
                'Authorization' => 'Bearer '.$apiKey,
                'Accept' => 'text/event-stream',
                'Content-Type' => 'application/json',
            ],
            'json' => $body,
            'stream' => true,
        ])->getBody();

        $buffer = '';
        $completion = '';
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
                    AiQuota::settle($reservation, TokenUsage::total($apiUsage, $body['messages'], $completion));
                    $this->send('done', []);

                    return;
                }

                $decoded = json_decode($data, true);
                if (isset($decoded['usage'])) {
                    $apiUsage = $decoded['usage'];
                }

                $delta = Arr::get($decoded, 'choices.0.delta.content');

                if (is_string($delta) && $delta !== '') {
                    $completion .= $delta;
                    $this->send('chunk', ['delta' => $delta]);
                }
            }
        }

        AiQuota::settle($reservation, TokenUsage::total($apiUsage, $body['messages'], $completion));
        $this->send('done', []);
    }

    /**
     * Emit a single Server-Sent Event and flush it to the client.
     *
     * @param  array<string, mixed>  $data
     */
    protected function send(string $event, array $data): void
    {
        echo 'event: '.$event."\n";
        echo 'data: '.json_encode($data)."\n\n";

        if (ob_get_level() > 0) {
            @ob_flush();
        }

        flush();
    }
}
