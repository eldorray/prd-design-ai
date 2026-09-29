<?php

namespace App\Concerns;

use App\Models\AiPrompt;
use App\Support\AiProvider;
use App\Support\AntiSlopPrompt;

/**
 * Prompt and request body for PRD interview / generate / refine calls,
 * shared by the JSON endpoint and the streaming one.
 */
trait BuildsPrdPrompt
{
    /**
     * The chat messages sent to the provider: the latest turns, headed by one
     * system message.
     *
     * @param  array<string, mixed>  $payload
     * @return list<array{role: string, content: string}>
     */
    protected function prdMessages(array $payload): array
    {
        $messages = collect($payload['messages'])
            ->take(-18)
            ->map(fn (array $message): array => [
                'role' => $message['role'],
                'content' => $message['content'],
            ])
            ->values()
            ->all();

        $answerCount = collect($messages)->where('role', 'user')->count();

        $systemContent = $this->prdSystemPrompt($payload['mode'], $payload['idea'] ?? null, $payload['draft'] ?? null, $answerCount);

        // Admin-configured prompt injections, in creation order after the core
        // prompt — the same shape the design studio uses.
        foreach (AiPrompt::activeFor('prd') as $injection) {
            $systemContent .= "\n\n".$injection['content'];
        }

        // Keep the non-negotiable guardrails after every other instruction.
        array_unshift($messages, [
            'role' => 'system',
            'content' => $systemContent."\n\n".AntiSlopPrompt::forPrd(),
        ]);

        return $messages;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  list<array{role: string, content: string}>  $messages
     * @return array<string, mixed>
     */
    protected function prdRequestBody(array $payload, array $messages, bool $stream): array
    {
        $requestBody = [
            'model' => $payload['model'],
            'messages' => $messages,
            'temperature' => $payload['mode'] === 'generate' ? 0.35 : 0.55,
            'stream' => $stream,
        ];

        // Only DeepSeek understands the thinking / reasoning_effort options.
        if (AiProvider::supportsThinking($payload['model'])) {
            $thinkingEnabled = AiProvider::usesThinking($payload['model']);
            $requestBody['thinking'] = ['type' => $thinkingEnabled ? 'enabled' : 'disabled'];

            if ($thinkingEnabled) {
                $requestBody['reasoning_effort'] = 'high';
            }
        }

        return $requestBody;
    }

    protected function prdSystemPrompt(string $mode, ?string $idea, ?string $draft, int $answerCount = 0): string
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
