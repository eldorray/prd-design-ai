<?php

use App\Support\AntiSlopPrompt;

test('prd guardrail rejects fabricated and generic copy', function () {
    $prompt = AntiSlopPrompt::forPrd();

    expect($prompt)
        ->toContain('Jangan mengarang fitur')
        ->toContain('Jangan gunakan karakter em dash')
        ->toContain('Belum ditentukan')
        ->toContain('Pertanyaan Terbuka')
        ->toContain('bahasa promosi kosong');
});

test('design guardrail applies during generation with complete craft requirements', function () {
    $prompt = AntiSlopPrompt::forDesign();

    expect($prompt)
        ->toContain('sejak keputusan visual pertama')
        ->toContain('ENERGY n / RHYTHM n / MOTION n')
        ->toContain('draft tanpa arah')
        ->toContain('state loading, kosong, dan error')
        ->toContain('target sentuh minimal 44px')
        ->toContain('kontras WCAG AA')
        ->toContain('Semua tautan, tombol, menu, tab, dialog, dan form harus bekerja')
        ->toContain('Jangan gunakan karakter em dash');
});

test('design refinement preserves existing identity', function () {
    $prompt = AntiSlopPrompt::forDesign('refine');

    expect($prompt)
        ->toContain('Pertahankan identitas, tata letak, dan komponen')
        ->not->toContain('sejak keputusan visual pertama');
});
