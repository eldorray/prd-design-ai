<?php

namespace App\Concerns;

use App\Models\AiPrompt;
use App\Support\AiProvider;
use App\Support\AntiSlopPrompt;
use App\Support\PrdTemplate;

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

        $systemContent = $this->prdSystemPrompt(
            $payload['mode'],
            $payload['idea'] ?? null,
            $payload['draft'] ?? null,
            $answerCount,
            $payload['missing_sections'] ?? [],
        );

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
            // Document output stays close to the spec; chat stays conversational.
            'temperature' => in_array($payload['mode'], ['generate', 'complete'], true) ? 0.35 : 0.55,
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

    /**
     * Format rules shared by a full generation and a partial completion, so a
     * completed section looks like one generated with the rest.
     */
    protected function prdSectionRules(): string
    {
        return <<<'PROMPT'
Aturan per section khusus:

- Metrik Keberhasilan: metrik terukur (angka/target), bukan pernyataan umum.
- Scope MVP: sebut fitur berdasarkan ID (F-01, F-02, ...). Semua fitur P0 wajib masuk Scope MVP.
- Fitur Utama: tulis setiap fitur sebagai sub-section, urut dari prioritas tertinggi, dengan format persis seperti ini:
  ### F-01 · Nama fitur (P0)
  - **User story:** Sebagai <peran>, saya ingin <tindakan> agar <manfaat>.
  - **Perilaku:** langkah utama yang dilakukan sistem, berurutan.
  - **Aturan & validasi:** field wajib, format, batas nilai, perhitungan, dan aturan bisnis.
  - **State & error:** kondisi kosong, loading, gagal, akses ditolak, dan edge case beserta pesan ke user.
  - **Hak akses:** peran yang boleh memakai fitur ini.
  - **Terkait:** halaman, endpoint API, dan entitas data yang dipakai, dengan nama persis seperti di section masing-masing.
  Prioritas: P0 = wajib ada di MVP, P1 = penting tapi bisa menyusul, P2 = nanti. Detail yang belum dibahas di interview tetap diisi dengan asumsi yang wajar dan ditandai "(asumsi)" agar mudah divalidasi.
- Struktur Data: daftar entitas dengan atribut utama dan tipe datanya (daftar per entitas, atribut dalam bullet).
- Diagram ERD: diagram entitas-relasi dalam blok kode Mermaid, dibuka dengan ``` mermaid dan ditutup dengan ```. Gunakan sintaks erDiagram dengan relasi dan kardinalitas (||--o{, }o--||, dst). Entitas harus konsisten dengan section Struktur Data.
- API Endpoints: tabel Markdown dengan kolom Method | Endpoint | Deskripsi | Auth.
- Non-Functional Requirements: ringkas — performa, keamanan, skalabilitas, aksesibilitas.
- Rekomendasi Tech Stack: frontend, backend, database, dan layanan pendukung, masing-masing satu baris alasan singkat.
- Task Breakdown: pecah pekerjaan menjadi fase (Fase 1, Fase 2, ...) dengan checklist `- [ ]` per task, tiap task satu baris, sebut ID fitur terkait (mis. "[F-02]"), dan ada estimasi kasar (mis. "0.5 hari"). Fase pertama selalu fondasi (setup, autentikasi, skema database).
- Acceptance Criteria: kelompokkan per fitur dengan heading ### AC F-01 · Nama fitur. Tiap kriteria satu baris checklist `- [ ]` berformat Given <kondisi> When <aksi> Then <hasil yang bisa diuji>. Setiap fitur di Fitur Utama wajib punya grup AC.
PROMPT;
    }

    /**
     * @param  list<string>  $missingSections  Sections to write in "complete" mode.
     */
    protected function prdSystemPrompt(string $mode, ?string $idea, ?string $draft, int $answerCount = 0, array $missingSections = []): string
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
            'generate' => $base.$context.$draftContext."\n\n"
                .'Buat PRD lengkap dalam Markdown. Tulis hanya berdasarkan ide dan jawaban interview user — jangan mengarang fitur atau keputusan yang tidak dibahas; jika informasi kurang, catat di bagian Risiko dan Pertanyaan Terbuka. '
                .'Batasi dokumen maksimal sekitar '.PrdTemplate::MAX_WORDS.' kata; utamakan kedalaman spesifikasi fitur P0 dibanding section lain.'
                ."\n\nGunakan struktur lengkap ini (urutan wajib):\n\n# Nama Produk\n"
                .collect(PrdTemplate::SECTIONS)->map(fn (string $section): string => "## {$section}")->implode("\n")
                ."\n\n".$this->prdSectionRules()
                ."\n\nJangan menambahkan pembuka percakapan. Keluarkan dokumen PRD saja.",
            'complete' => $base.$context.$draftContext."\n\n"
                .'Draft PRD di atas belum lengkap: ada section yang hilang atau terpotong. Tulis HANYA section berikut, masing-masing dibuka dengan heading persis seperti tertulis, dalam urutan ini:'
                ."\n\n".collect($missingSections)->map(fn (string $section): string => "## {$section}")->implode("\n")
                ."\n\nJaga konsistensi dengan isi draft: pakai nama fitur, ID fitur (F-01, ...), halaman, entitas, dan endpoint yang sudah ada. Jangan menulis ulang section lain dan jangan menambahkan judul dokumen."
                ."\n\n".$this->prdSectionRules()
                ."\n\nKeluarkan section tersebut saja, tanpa pembuka atau penutup percakapan.",
            'refine' => $base.$context.$draftContext.<<<'PROMPT'

Perbaiki draft PRD berdasarkan pesan terbaru user. Pertahankan format Markdown, seluruh struktur section, format spesifikasi per fitur (### F-xx), tabel, dan diagram Mermaid yang sudah ada kecuali user meminta perubahan pada bagian tersebut. Rapikan detail yang kurang jelas, dan jangan hilangkan informasi penting. Keluarkan dokumen PRD saja, tanpa pembuka atau penutup percakapan.
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
