import { describe, expect, it } from 'vitest';

import {
    cleanAssistantText,
    cleanPrdText,
    deriveTitle,
    hydrateMessages,
    isPrdContent,
    isReadyToGenerate,
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

    it('strips "atau" and trailing punctuation from every option', () => {
        // Options used to be cleaned before being trimmed, so the spaces
        // around each "|" hid the prefix and punctuation from the cleanup.
        expect(
            parseAssistantQuestion(
                'PERTANYAAN: Q? CONTOH: satu | atau dua | tiga. | empat? KENAPA: alasan',
            ).examples,
        ).toEqual(['satu', 'dua', 'tiga', 'empat']);
    });

    it('hides the [SIAP_GENERATE] marker from the question text', () => {
        // The interview prompt asks the model to emit this marker once enough
        // answers are in; it is a signal, not something to show the user.
        expect(
            parseAssistantQuestion(
                '[SIAP_GENERATE]\nSudah cukup informasi. Mau saya buatkan PRD sekarang?',
            ),
        ).toEqual({
            question: 'Mau saya buatkan PRD sekarang?',
            examples: [],
            note: 'Sudah cukup informasi.',
        });

        expect(
            parseAssistantQuestion(
                '[SIAP_GENERATE] Sudah cukup, mau saya buatkan PRD sekarang?',
            ).question,
        ).toBe('Sudah cukup, mau saya buatkan PRD sekarang?');
    });

    it('detects the ready-to-generate signal', () => {
        expect(isReadyToGenerate('[SIAP_GENERATE] Sudah cukup.')).toBe(true);
        expect(isReadyToGenerate('PERTANYAAN: Siapa target?')).toBe(false);
    });

    it('falls back to free-form parsing with inline (contoh: ...) options', () => {
        expect(
            parseAssistantQuestion(
                'Pertanyaan berikutnya: Apa masalah utama yang ingin diselesaikan? Ini membantu fokus MVP. (contoh: onboarding lambat, atau biaya tinggi.)',
            ),
        ).toEqual({
            question: 'Apa masalah utama yang ingin diselesaikan?',
            examples: ['onboarding lambat', 'biaya tinggi'],
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

    it('captures a fenced block as one diagram item with its language, indentation intact', () => {
        // Indentation matters to some diagram types (mindmap), so lines inside
        // a fence are kept as written and the fence markers are dropped.
        expect(parsePrdSections(prd)[3].content).toEqual([
            {
                kind: 'diagram',
                language: 'mermaid',
                code: 'erDiagram\n    USER ||--o{ ORDER : places',
                closed: true,
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

    it('keeps a fence that is never closed as an open diagram', () => {
        // A streaming PRD, or one cut off at the token limit, ends inside a
        // fence. Its content used to vanish; now it stays visible as an
        // unfinished block.
        expect(
            parsePrdSections(
                '## A\nsebelum\n```mermaid\ngraph TD\nA-->B\n## B\nsetelah',
            ),
        ).toEqual([
            {
                title: 'A',
                content: [
                    { kind: 'line', text: 'sebelum' },
                    {
                        kind: 'diagram',
                        language: 'mermaid',
                        code: 'graph TD\nA-->B\n## B\nsetelah',
                        closed: false,
                    },
                ],
            },
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

describe('parsePrdBlocks with a table that is still arriving', () => {
    // While a PRD streams in, the last line is often a table header whose
    // separator row has not arrived yet. That line used to be claimed by no
    // branch, so the loop never advanced and the tab ran out of memory
    // (Chrome "Aw, Snap! Error code: 5").
    it('treats a header row without its separator as text', () => {
        expect(
            parsePrdBlocks(['Endpoint:', '| Method | Endpoint | Deskripsi |']),
        ).toEqual([
            {
                type: 'text',
                lines: ['Endpoint:', '| Method | Endpoint | Deskripsi |'],
            },
        ]);
    });

    it('treats a half-written row as text', () => {
        expect(parsePrdBlocks(['| Meth'])).toEqual([
            { type: 'text', lines: ['| Meth'] },
        ]);
    });

    it('still recognises the table once its separator arrives', () => {
        expect(
            parsePrdBlocks(['| Method | Endpoint |', '| --- | --- |']),
        ).toEqual([{ type: 'table', rows: [['Method', 'Endpoint']] }]);
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
