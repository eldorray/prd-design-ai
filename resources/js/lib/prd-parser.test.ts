import { describe, expect, it } from 'vitest';

import {
    cleanAssistantText,
    cleanPrdText,
    deriveTitle,
    hydrateMessages,
    isPrdContent,
    parseAssistantQuestion,
    parsePrdBlocks,
    parsePrdSections,
} from '@/lib/prd-parser';

describe('parseAssistantQuestion', () => {
    it('parses the structured PERTANYAAN / CONTOH / KENAPA format', () => {
        const parsed = parseAssistantQuestion(
            [
                'PERTANYAAN: Siapa target pengguna utama produk ini?',
                'CONTOH: Solo founder | UMKM | Pelajar | Tim internal perusahaan',
                'KENAPA: Target menentukan prioritas fitur MVP dan halaman.',
            ].join('\n'),
        );

        expect(parsed).toEqual({
            question: 'Siapa target pengguna utama produk ini?',
            examples: [
                'Solo founder',
                'UMKM',
                'Pelajar',
                'Tim internal perusahaan',
            ],
            note: 'Target menentukan prioritas fitur MVP dan halaman.',
        });
    });

    it('strips markdown bold and tolerates a missing CONTOH line', () => {
        expect(
            parseAssistantQuestion(
                '**PERTANYAAN:** Siapa target?\n**KENAPA:** Menentukan fitur.',
            ),
        ).toEqual({
            question: 'Siapa target?',
            examples: [],
            note: 'Menentukan fitur.',
        });
    });

    it('returns no examples and an empty note for a bare PERTANYAAN', () => {
        expect(
            parseAssistantQuestion('PERTANYAAN: Siapa target user?'),
        ).toEqual({
            question: 'Siapa target user?',
            examples: [],
            note: '',
        });
    });

    it('caps the example options at six', () => {
        expect(
            parseAssistantQuestion(
                'PERTANYAAN: Q? CONTOH: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8',
            ).examples,
        ).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('only strips "atau" and trailing punctuation from unpadded options', () => {
        // Options are cleaned before they are trimmed, so the space around
        // each "|" keeps the "atau " prefix and trailing "?"/"." in place for
        // every option except the last one.
        expect(
            parseAssistantQuestion(
                'PERTANYAAN: Q? CONTOH: satu | atau dua | tiga. | empat? KENAPA: alasan',
            ).examples,
        ).toEqual(['satu', 'atau dua', 'tiga.', 'empat']);
    });

    it('does not special-case the [SIAP_GENERATE] marker', () => {
        // The interview prompt asks the model to emit this marker once enough
        // answers are in; the parser treats it as ordinary text.
        expect(
            parseAssistantQuestion(
                '[SIAP_GENERATE]\nSudah cukup informasi. Mau saya buatkan PRD sekarang?',
            ),
        ).toEqual({
            question: 'Mau saya buatkan PRD sekarang?',
            examples: [],
            note: '[SIAP_GENERATE] Sudah cukup informasi.',
        });

        expect(
            parseAssistantQuestion(
                '[SIAP_GENERATE] Sudah cukup, mau saya buatkan PRD sekarang?',
            ).question,
        ).toBe('[SIAP_GENERATE] Sudah cukup, mau saya buatkan PRD sekarang?');
    });

    it('falls back to free-form parsing with inline (contoh: ...) options', () => {
        expect(
            parseAssistantQuestion(
                'Pertanyaan berikutnya: Apa masalah utama yang ingin diselesaikan? Ini membantu fokus MVP. (contoh: onboarding lambat, atau biaya tinggi.)',
            ),
        ).toEqual({
            question: 'Apa masalah utama yang ingin diselesaikan?',
            examples: ['onboarding lambat', 'atau biaya tinggi'],
            note: 'Ini membantu fokus MVP.',
        });
    });
});

describe('parsePrdSections', () => {
    const prd = [
        '# Aplikasi Kasir',
        '',
        'Ringkasan singkat.',
        '',
        '---',
        '',
        '## Tujuan',
        '- Mempercepat transaksi',
        '**Penting:** tetap offline.',
        '',
        '## Data',
        '| Kolom | Tipe |',
        '| --- | --- |',
        '| id | uuid |',
        '',
        '### Checklist',
        '- [ ] Login',
        '- [x] Checkout',
        '',
        '## ERD',
        '```mermaid',
        'erDiagram',
        '    USER ||--o{ ORDER : places',
        '```',
        'Setelah diagram.',
    ].join('\n');

    it('starts a section at every # / ## heading and drops rules and blank lines', () => {
        const sections = parsePrdSections(prd);

        expect(sections.map((section) => section.title)).toEqual([
            'Aplikasi Kasir',
            'Tujuan',
            'Data',
            'ERD',
        ]);
        expect(sections[0].content).toEqual([
            { kind: 'line', text: 'Ringkasan singkat.' },
        ]);
        expect(sections[1].content).toEqual([
            { kind: 'line', text: '- Mempercepat transaksi' },
            { kind: 'line', text: '**Penting:** tetap offline.' },
        ]);
    });

    it('keeps table, ### and checklist lines verbatim as line items', () => {
        expect(parsePrdSections(prd)[2].content).toEqual([
            { kind: 'line', text: '| Kolom | Tipe |' },
            { kind: 'line', text: '| --- | --- |' },
            { kind: 'line', text: '| id | uuid |' },
            { kind: 'line', text: '### Checklist' },
            { kind: 'line', text: '- [ ] Login' },
            { kind: 'line', text: '- [x] Checkout' },
        ]);
    });

    it('captures a fenced mermaid block as one diagram item in place', () => {
        // The fence markers are kept and every line is trimmed.
        expect(parsePrdSections(prd)[3].content).toEqual([
            {
                kind: 'diagram',
                code: '```mermaid\nerDiagram\nUSER ||--o{ ORDER : places\n```',
            },
            { kind: 'line', text: 'Setelah diagram.' },
        ]);
    });

    it('puts content before the first heading into a Ringkasan section', () => {
        expect(parsePrdSections('Preamble\n\n## Satu\nisi')).toEqual([
            {
                title: 'Ringkasan',
                content: [{ kind: 'line', text: 'Preamble' }],
            },
            { title: 'Satu', content: [{ kind: 'line', text: 'isi' }] },
        ]);
    });

    it('drops everything after a fence that is never closed', () => {
        expect(
            parsePrdSections(
                '## A\nsebelum\n```mermaid\ngraph TD\nA-->B\n## B\nsetelah',
            ),
        ).toEqual([
            { title: 'A', content: [{ kind: 'line', text: 'sebelum' }] },
        ]);
    });
});

describe('parsePrdBlocks', () => {
    it('groups lines into table, checklist and text blocks', () => {
        expect(
            parsePrdBlocks([
                '| Kolom | Tipe |',
                '| --- | --- |',
                '| id | uuid |',
                '| nama | `string` |',
                '### Checklist',
                '- [ ] Login',
                '- [x] Checkout',
                'teks',
            ]),
        ).toEqual([
            {
                type: 'table',
                rows: [
                    ['Kolom', 'Tipe'],
                    ['id', 'uuid'],
                    ['nama', '`string`'],
                ],
            },
            { type: 'text', lines: ['### Checklist'] },
            { type: 'checklist', items: ['Login', 'Checkout'] },
            { type: 'text', lines: ['teks'] },
        ]);
    });
});

describe('deriveTitle', () => {
    it('uses the first "# " heading of the content', () => {
        expect(deriveTitle('# Judul PRD\n\n## A', 'ide')).toBe('Judul PRD');
    });

    it('caps a heading title at 120 characters', () => {
        expect(deriveTitle(`# ${'x'.repeat(200)}`, '')).toHaveLength(120);
    });

    it('falls back to the idea with collapsed whitespace, capped at 80', () => {
        expect(deriveTitle('## Bukan H1', '  ide   produk\n  baru ')).toBe(
            'ide produk baru',
        );
        expect(deriveTitle('', 'y'.repeat(200))).toHaveLength(80);
    });

    it('ignores headings without a space or with indentation', () => {
        expect(deriveTitle('#Tanpa spasi', '')).toBe('PRD tanpa judul');
        expect(deriveTitle('  # Indented', 'ide')).toBe('ide');
    });

    it('returns the default title when content and idea are empty', () => {
        expect(deriveTitle('', '   ')).toBe('PRD tanpa judul');
    });
});

describe('isPrdContent', () => {
    it('detects a # / ## heading anywhere in the document', () => {
        expect(isPrdContent('## Tujuan\nisi')).toBe(true);
        expect(isPrdContent('```mermaid\nx\n```\n\n# Judul')).toBe(true);
    });

    it('rejects interview questions and non-section headings', () => {
        expect(isPrdContent('PERTANYAAN: Siapa?')).toBe(false);
        expect(isPrdContent('### Sub saja')).toBe(false);
        expect(isPrdContent('##Tanpa spasi')).toBe(false);
        expect(isPrdContent('## ')).toBe(false);
        expect(isPrdContent('Intro\n  ## Indented heading')).toBe(false);
    });
});

describe('text cleanup helpers', () => {
    it('cleanPrdText strips bold markers and inline code ticks', () => {
        expect(cleanPrdText('**Bold** dan `code` ok ')).toBe(
            'Bold dan code ok',
        );
    });

    it('cleanAssistantText strips bold and collapses whitespace', () => {
        expect(cleanAssistantText('**A**\n\n  b  ')).toBe('A b');
    });
});

describe('hydrateMessages', () => {
    it('keeps role and content and assigns a unique id to each message', () => {
        const messages = hydrateMessages([
            { role: 'user', content: 'hi' },
            { role: 'assistant', content: 'yo' },
        ]);

        expect(
            messages.map(({ role, content }) => ({ role, content })),
        ).toEqual([
            { role: 'user', content: 'hi' },
            { role: 'assistant', content: 'yo' },
        ]);
        expect(messages[0].id).toEqual(expect.any(String));
        expect(messages[0].id).not.toBe(messages[1].id);
    });
});
