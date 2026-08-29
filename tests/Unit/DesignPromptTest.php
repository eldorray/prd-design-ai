<?php

use App\Concerns\BuildsDesignPrompt;

function designPromptBuilder(): object
{
    return new class
    {
        use BuildsDesignPrompt;

        public function build(string $kind, string $mode = 'generate'): string
        {
            return $this->systemPrompt($kind, $mode);
        }
    };
}

test('generate system prompt requires complete html and indonesian content', function () {
    $prompt = designPromptBuilder()->build('landing');

    expect($prompt)
        ->toContain('diawali <!doctype html>')
        ->toContain('diakhiri </html>')
        ->toContain('Bahasa Indonesia')
        ->toContain('data-editable="text"')
        ->toContain('<main>');
});

test('refine system prompt forbids rewriting and requires complete html', function () {
    $prompt = designPromptBuilder()->build('landing', 'refine');

    expect($prompt)
        ->toContain('JANGAN menulis ulang')
        ->toContain('Bahasa Indonesia')
        ->toContain('diakhiri </html>')
        ->toContain('data-editable="text"');
});

test('generate system prompt does not force visual slop or fabricated social proof', function () {
    $prompt = designPromptBuilder()->build('landing');

    expect($prompt)
        ->toContain('Jangan menambahkan social proof')
        ->toContain('Jangan memaksakan gaya tertentu')
        ->not->toContain('Gunakan gradient mesh')
        ->not->toContain('Dominan warna gelap')
        ->not->toContain('Sisipkan efek visual stagger');
});
