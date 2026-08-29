<?php

namespace App\Concerns;

use App\Models\AiPrompt;
use App\Services\Context7Service;
use App\Support\AiProvider;
use App\Support\AntiSlopPrompt;
use Illuminate\Support\Str;

trait BuildsDesignPrompt
{
    /**
     * Build the system prompt for the requested design kind.
     */
    protected function systemPrompt(string $kind, string $mode = 'generate'): string
    {
        if ($mode === 'refine') {
            return <<<'PROMPT'
Kamu adalah senior front-end engineer dan UI designer.
Tugasmu adalah MEMPERBARUI dan MEMPERBAIKI dokumen HTML yang diberikan sesuai dengan instruksi revisi pengguna dengan tetap menjaga estetika desain premium dan responsif.

Aturan WAJIB:
- JANGAN menulis ulang atau mendesain ulang dari awal. Pertahankan tata letak, skema warna, gaya, font, dan komponen yang sudah ada yang tidak perlu diubah.
- Hanya ubah atau tambahkan bagian yang diminta dalam instruksi revisi secara spesifik.
- Pertahankan karakter visual yang ada. Untuk komponen baru, setiap teknik visual harus mendukung hierarki atau identitas yang sudah ada, bukan mengikuti tren secara otomatis.
- Keluarkan SATU dokumen HTML lengkap yang berdiri sendiri, mulai dari <!doctype html> sampai </html>.
- Jangan gunakan file eksternal atau CDN baru (kecuali Google Fonts untuk tipografi). Pertahankan semua inline SVG dan aset yang sudah ada.
- Beri atau pertahankan atribut data-editable="text" pada elemen teks utama agar mudah diedit secara visual.
- Tulis konten teks baru dalam Bahasa Indonesia, kecuali pengguna meminta bahasa lain secara eksplisit.
- JANGAN tulis penjelasan, komentar, blok markdown, chain-of-thought, atau tag <think>/</think>. Output HARUS diawali <!doctype html> pada karakter pertama dan diakhiri </html> — pastikan dokumen lengkap dan tidak terpotong.
PROMPT;
        }

        $kindBrief = match ($kind) {
            'dashboard' => 'Buat dashboard admin: sidebar navigasi, header, kartu statistik, tabel atau chart sederhana, dan konten utama. Tulis JavaScript interaktif sederhana di dalam tag <script> agar ketika menu di sidebar navigasi diklik, konten utama (main content) berganti secara dinamis tanpa memuat ulang halaman (simulasi halaman aktif/tab switcher).',
            'mobile-app' => 'Buat mockup aplikasi mobile multi-layar (screens). Halaman harus dibungkus dalam layout vertikal ramah layar smartphone, lengkap dengan area status bar atas (jam, sinyal, baterai) dan tab bar navigasi bawah (misal: Beranda, Cari, Transaksi, Profil). Tulis JavaScript interaktif sederhana di dalam tag <script> agar konten layar otomatis berganti ketika tab navigasi bawah diklik.',
            default => 'Buat landing page berdasarkan kebutuhan konten yang benar-benar disebutkan pengguna. Jangan menambahkan social proof, statistik, testimonial, FAQ, atau tautan navigasi tanpa sumber nyata.',
        };

        return <<<PROMPT
Kamu adalah senior front-end engineer dan UI designer. Kamu menghasilkan halaman yang fungsional, responsif, dan memiliki identitas sesuai arahan pengguna.

{$kindBrief}

Panduan implementasi:
- Pilih tipografi, warna, komposisi, efek, dan motion berdasarkan konteks produk dan arah pengguna. Jangan memaksakan gaya tertentu.
- Gunakan CSS variables untuk palet dan spacing agar sistem visual konsisten.
- Gunakan HTML semantik (<header>, <nav>, <main>, <section>, <footer>) serta atribut aksesibilitas yang sesuai.

Aturan output WAJIB:
- Keluarkan SATU dokumen HTML lengkap yang berdiri sendiri, mulai dari <!doctype html> sampai </html>.
- Tulis dokumen secara berurutan dari atas ke bawah: <head> dengan <style>, lalu <body> mulai dari navigasi/header, konten utama, hingga footer.
- Sisipkan CSS di dalam satu tag <style> di <head>. Sisipkan JavaScript di dalam satu tag <script> sebelum </body> jika perlu interaksi.
- Jangan gunakan file eksternal, CDN, atau gambar dari URL (kecuali Google Fonts untuk tipografi). Gunakan warna, gradient, dan SVG inline untuk elemen visual.
- Beri atribut data-editable="text" pada elemen teks utama (heading, paragraf, label tombol) agar mudah diedit.
- Tulis seluruh konten teks halaman dalam Bahasa Indonesia, kecuali pengguna meminta bahasa lain secara eksplisit.
- JANGAN tulis penjelasan, komentar, blok markdown, chain-of-thought, atau tag <think>/</think>. Output HARUS diawali <!doctype html> pada karakter pertama dan diakhiri </html> — pastikan dokumen lengkap dan tidak terpotong.
PROMPT;
    }

    /**
     * Build the user prompt depending on the mode.
     *
     * @param  array<string, mixed>  $payload
     */
    protected function userPrompt(array $payload): string
    {
        $basePrompt = $payload['prompt'];

        if ($payload['mode'] === 'refine' && ! empty($payload['current_html'])) {
            $htmlPrompt = "Berikut adalah kode HTML dari halaman saat ini:\n\n"
                ."```html\n".$this->extractHtml($payload['current_html'])."\n```"
                ."\n\nTugas Anda: Ubah kode HTML di atas sesuai dengan instruksi revisi berikut:\n"
                .'"'.$basePrompt."\"\n\n"
                ."Aturan penting:\n"
                ."- JANGAN membuat halaman baru dari awal.\n"
                ."- Hanya ubah atau tambahkan bagian yang diminta dalam instruksi revisi secara spesifik.\n"
                ."- Pertahankan tata letak, skema warna, tulisan, dan komponen lain yang sudah ada jika tidak diminta untuk diubah.\n"
                .'- Keluarkan kembali seluruh dokumen HTML lengkap yang sudah diperbarui.';

            if (! empty($payload['image'])) {
                return $htmlPrompt."\n\nHarap rujuk juga screenshot yang dilampirkan untuk menyesuaikan visual hasil revisi secara presisi.";
            }

            return $htmlPrompt;
        }

        if (! empty($payload['image'])) {
            return 'Buat halaman berdasarkan deskripsi ini: '.$basePrompt.' dan rujuk screenshot yang dilampirkan untuk mereplikasi tata letak, warna, dan komponen visual secara presisi.';
        }

        return 'Buat halaman berdasarkan deskripsi ini: '.$basePrompt;
    }

    /**
     * Build the request body for the chat completions endpoint.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    protected function chatBody(array $payload, bool $stream): array
    {
        $systemContent = $this->systemPrompt($payload['kind'], $payload['mode']);

        // Admin-configured prompt injections for the design scope.
        foreach (AiPrompt::activeFor('design') as $injection) {
            $systemContent .= "\n\n".$injection['content'];
        }

        try {
            $context7 = app(Context7Service::class);
            $docs = $context7->getDocsForPrompt($payload['prompt']);
            if (! empty($docs)) {
                $systemContent .= $docs;
            }
        } catch (\Exception $e) {
            // fail-silent
        }

        // Keep non-negotiable generation safeguards after every other instruction.
        $systemContent .= "\n\n".AntiSlopPrompt::forDesign($payload['mode']);

        $messages = [
            ['role' => 'system', 'content' => $systemContent],
        ];

        if (! empty($payload['image'])) {
            $messages[] = [
                'role' => 'user',
                'content' => [
                    [
                        'type' => 'text',
                        'text' => $this->userPrompt($payload),
                    ],
                    [
                        'type' => 'image_url',
                        'image_url' => [
                            'url' => $payload['image'],
                        ],
                    ],
                ],
            ];
        } else {
            $messages[] = [
                'role' => 'user',
                'content' => $this->userPrompt($payload),
            ];
        }

        $body = [
            'model' => $payload['model'],
            'messages' => $messages,
            'temperature' => 0.4,
            'stream' => $stream,
        ];

        // Only DeepSeek understands the thinking / reasoning_effort options.
        if (AiProvider::supportsThinking($payload['model'])) {
            $thinkingEnabled = AiProvider::usesThinking($payload['model']);
            $body['thinking'] = ['type' => $thinkingEnabled ? 'enabled' : 'disabled'];

            if ($thinkingEnabled) {
                $body['reasoning_effort'] = 'high';
            }
        }

        return $body;
    }

    /**
     * Strip markdown fences and return the raw HTML document.
     */
    protected function extractHtml(string $content): string
    {
        $content = trim($content);

        if (Str::startsWith($content, '```')) {
            $content = preg_replace('/^```[a-zA-Z]*\s*/', '', $content);
            $content = preg_replace('/\s*```$/', '', (string) $content);
        }

        return trim((string) $content);
    }

    /**
     * Resolve the chat completions endpoint URL for the model's provider.
     */
    protected function chatUrl(string $model): string
    {
        return AiProvider::chatUrl($model);
    }
}
