<?php

namespace App\Support;

/**
 * The shape every generated PRD must have. The prompt is built from this list
 * and the workspace checks finished documents against it, so the two cannot
 * drift apart.
 */
final class PrdTemplate
{
    /**
     * Required `##` sections, in order (the `#` product name comes first).
     *
     * @var list<string>
     */
    public const SECTIONS = [
        'Ringkasan',
        'Masalah',
        'Target User',
        'Tujuan Produk',
        'Metrik Keberhasilan',
        'Scope MVP',
        'Non-Scope MVP',
        'Fitur Utama',
        'Halaman dan Navigasi',
        'User Flow',
        'Struktur Data',
        'Diagram ERD',
        'API Endpoints',
        'Non-Functional Requirements',
        'Rekomendasi Tech Stack',
        'Task Breakdown',
        'Acceptance Criteria',
        'Risiko dan Pertanyaan Terbuka',
    ];

    /**
     * Rough length cap. Per-feature specs need room; a provider's output limit
     * can still cut a document short, which "Lengkapi" then repairs.
     */
    public const MAX_WORDS = 4500;
}
