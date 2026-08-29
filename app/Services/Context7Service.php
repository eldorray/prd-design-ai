<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class Context7Service
{
    protected ?string $apiKey;

    protected string $baseUrl = 'https://context7.com/api';

    /**
     * Upper bound on the documentation appended to a system prompt. The
     * endpoint returns whatever it likes, and every character of it is billed
     * as prompt tokens on the next generation.
     */
    private const MAX_DOC_CHARS = 12000;

    /**
     * Create a new class instance.
     */
    public function __construct()
    {
        $this->apiKey = config('services.context7.api_key');
    }

    /**
     * Fetch context documentation for a query and library.
     */
    public function fetchContext(string $query, string $libraryId): ?string
    {
        if (empty($this->apiKey)) {
            return null;
        }

        try {
            $response = Http::withToken($this->apiKey)
                ->connectTimeout(5)
                ->timeout(10)
                ->get("{$this->baseUrl}/v2/context", [
                    'query' => $query,
                    'libraryId' => $libraryId,
                ]);

            if ($response->successful()) {
                return Str::limit($response->body(), self::MAX_DOC_CHARS, ' [dipotong]');
            }
        } catch (\Exception $e) {
            Log::error('Context7 fetch failed: '.$e->getMessage());
        }

        return null;
    }

    /**
     * Get relevant documentation context based on the user prompt.
     */
    public function getDocsForPrompt(string $prompt): string
    {
        $docs = [];

        // Check if Tailwind is relevant
        if (preg_match('/tailwind|css|design|style|color|layout|border/i', $prompt)) {
            $tailwindDocs = $this->fetchContext($prompt, '/websites/tailwindcss');
            if ($tailwindDocs) {
                $docs[] = "### Tailwind CSS Documentation Context:\n".$tailwindDocs;
            }
        }

        // Check if React is relevant
        if (preg_match('/react|state|hooks?|click|event|effect/i', $prompt)) {
            $reactDocs = $this->fetchContext($prompt, '/facebook/react');
            if ($reactDocs) {
                $docs[] = "### React 19 Documentation Context:\n".$reactDocs;
            }
        }

        if (empty($docs)) {
            return '';
        }

        return Str::limit(
            "\n\n---\n## Dokumentasi Referensi Tambahan dari Upstash Context7:\n".implode("\n\n", $docs),
            self::MAX_DOC_CHARS,
            ' [dipotong]',
        );
    }
}
