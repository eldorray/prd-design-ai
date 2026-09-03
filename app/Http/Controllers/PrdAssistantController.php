<?php

namespace App\Http\Controllers;

use App\Http\Requests\PrdAssistantRequest;
use App\Models\AiPrompt;
use App\Support\AiProvider;
use App\Support\AiQuota;
use App\Support\AntiSlopPrompt;
use App\Support\TokenUsage;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Throwable;

class PrdAssistantController extends Controller
{
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

        // Debit an estimate before the provider call so parallel requests
        // cannot all clear the same balance. Settled with the real usage below.
        $reservation = null;

        if ($user) {
            $reservation = AiQuota::reserve($user, $payload['model'], $payload['mode']);

            if ($reservation === null) {
                return response()->json([
                    'message' => 'Kuota token AI Anda sudah habis. Silakan hubungi administrator.',
                ], 403);
            }
        }

        $messages = collect($payload['messages'])
            ->take(-18)
            ->map(fn (array $message): array => [
                'role' => $message['role'],
                'content' => $message['content'],
            ])
            ->values()
            ->all();

        $answerCount = collect($messages)->where('role', 'user')->count();

        array_unshift($messages, [
            'role' => 'system',
            'content' => $this->systemPrompt($payload['mode'], $payload['idea'] ?? null, $payload['draft'] ?? null, $answerCount)
                ."\n\n".AntiSlopPrompt::forPrd(),
        ]);

        // Admin-configured prompt injections for the PRD scope.
        foreach (AiPrompt::activeFor('prd') as $injection) {
            array_unshift($messages, [
                'role' => 'system',
                'content' => $injection['content'],
            ]);
        }

        $requestBody = [
            'model' => $payload['model'],
            'messages' => $messages,
            'temperature' => $payload['mode'] === 'generate' ? 0.35 : 0.55,
            'stream' => false,
        ];

        // Only DeepSeek understands the thinking / reasoning_effort options.
        if (AiProvider::supportsThinking($payload['model'])) {
            $thinkingEnabled = AiProvider::usesThinking($payload['model']);
            $requestBody['thinking'] = ['type' => $thinkingEnabled ? 'enabled' : 'disabled'];

            if ($thinkingEnabled) {
                $requestBody['reasoning_effort'] = 'high';
            }
        }

        try {
            $response = $this->callProvider($payload['model'], $apiKey, $requestBody);
        } catch (ConnectionException $exception) {
            report($exception);
            AiQuota::release($reservation);

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
     * (connection errors and 5xx). A generate call can legitimately take up to
     * 110 seconds; one retry absorbs flaky gateway hiccups without the user
     * having to resend manually.
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
            // One silent retry on connection-level failures (DNS blip, reset,
            // timeout). If the retry also fails, the exception bubbles up.
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

    private function systemPrompt(string $mode, ?string $idea, ?string $draft, int $answerCount = 0): string
    {
        $base = <<<'PROMPT'
Kamu adalah product manager senior untuk AI PRD Generator. Jawab dalam bahasa Indonesia yang jelas, praktis, dan langsung bisa dipakai founder atau developer.

Tujuan produk:
- Mengubah ide mentah menjadi PRD lengkap.
- Menentukan MVP dengan jelas.
- Menyusun fitur utama, halaman, user flow, dan struktur data.
- Menghasilkan dokumen Markdown yang bisa diberikan ke developer atau AI coding tool.
PROMPT;

        $context = trim((string) $idea) !== ''
            ? "\n\nIde produk user:\n".$idea
            : '';

        $draftContext = trim((string) $draft) !== ''
            ? "\n\nDraft PRD saat ini:\n".$draft
            : '';

        return match ($mode) {
            'generate' => $base.$context.$draftContext.<<<'PROMPT'

Buat PRD lengkap dalam Markdown. Tulis hanya berdasarkan ide dan jawaban interview user — jangan mengarang fitur atau keputusan yang tidak dibahas; jika informasi kurang, catat di bagian Risiko dan Pertanyaan Terbuka. Batasi dokumen maksimal sekitar 2500 kata.

Gunakan struktur lengkap ini (urutan wajib):

# Nama Produk
## Ringkasan
## Masalah
## Target User
## Tujuan Produk
## Metrik Keberhasilan
## Scope MVP
## Non-Scope MVP
## Fitur Utama
## Halaman dan Navigasi
## User Flow
## Struktur Data
## Diagram ERD
## API Endpoints
## Non-Functional Requirements
## Rekomendasi Tech Stack
## Task Breakdown
## Acceptance Criteria
## Risiko dan Pertanyaan Terbuka

Aturan per section khusus:

- Metrik Keberhasilan: metrik terukur (angka/target), bukan pernyataan umum.
- Struktur Data: daftar entitas dengan atribut utama dan tipe datanya (daftar per entitas, atribut dalam bullet).
- Diagram ERD: diagram entitas-relasi dalam blok kode Mermaid, dibuka dengan ``` mermaid dan ditutup dengan ```. Gunakan sintaks erDiagram dengan relasi dan kardinalitas (||--o{, }o--||, dst). Entitas harus konsisten dengan section Struktur Data.
- API Endpoints: tabel Markdown dengan kolom Method | Endpoint | Deskripsi | Auth.
- Non-Functional Requirements: ringkas — performa, keamanan, skalabilitas, aksesibilitas.
- Rekomendasi Tech Stack: frontend, backend, database, dan layanan pendukung, masing-masing satu baris alasan singkat.
- Task Breakdown: pecah pekerjaan menjadi fase (Fase 1, Fase 2, ...) dengan checklist `- [ ]` per task, tiap task satu baris dan ada estimasi kasar (mis. "0.5 hari"). Fase pertama selalu fondasi (setup, autentikasi, skema database).

Jangan menambahkan pembuka percakapan. Keluarkan dokumen PRD saja.
PROMPT,
            'refine' => $base.$context.$draftContext.<<<'PROMPT'

Perbaiki draft PRD berdasarkan pesan terbaru user. Pertahankan format Markdown, seluruh struktur section, tabel, dan diagram Mermaid yang sudah ada kecuali user meminta perubahan pada bagian tersebut. Rapikan detail yang kurang jelas, dan jangan hilangkan informasi penting. Keluarkan dokumen PRD saja, tanpa pembuka atau penutup percakapan.
PROMPT,
            default => $base.$context.<<<PROMPT

Mode interview: tanyakan tepat satu pertanyaan lanjutan yang paling penting untuk memperjelas PRD.

Aturan:
- Jangan mengulang pertanyaan yang sudah dijawab user dalam percakapan ini.
- Tetap fokus pada ide produk user; jika user menyimpang dari topik, arahkan kembali dengan sopan.
- User sudah menjawab {$answerCount} kali. Jika sudah ada 5-7 jawaban substansial, berhenti bertanya: keluarkan tepat satu baris [SIAP_GENERATE] diikuti satu kalimat singkat yang menawarkan pembuatan PRD.

Gunakan format singkat ini saja:
PERTANYAAN: <satu pertanyaan pendek, maksimal 16 kata>
CONTOH: <3-6 opsi pendek dipisahkan dengan tanda | jika relevan>
KENAPA: <alasan singkat, maksimal 14 kata>

Contoh output:
PERTANYAAN: Siapa target pengguna utama produk ini?
CONTOH: Solo founder | UMKM | Pelajar | Tim internal perusahaan
KENAPA: Target menentukan prioritas fitur MVP dan halaman.

Jangan pakai markdown tebal, jangan paragraf panjang, dan jangan menanyakan banyak hal sekaligus.
PROMPT,
        };
    }
}
