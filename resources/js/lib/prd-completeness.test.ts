import { describe, expect, it } from 'vitest';

import {
    checkPrdCompleteness,
    mergePrdSections,
    restoreTruncatedTail,
    sectionsToComplete,
} from '@/lib/prd-completeness';

const REQUIRED = ['Ringkasan', 'Masalah', 'Fitur Utama', 'API Endpoints'];

describe('checkPrdCompleteness', () => {
    it('reports nothing for a complete document', () => {
        expect(
            checkPrdCompleteness(
                '# P\n## Ringkasan\na\n## Masalah\nb\n## Fitur Utama\nc\n## API Endpoints\nd',
                REQUIRED,
            ),
        ).toEqual({ missing: [], incomplete: null });
    });

    it('lists missing sections in template order', () => {
        expect(
            checkPrdCompleteness(
                '# P\n## Masalah\nb\n## API Endpoints\nd',
                REQUIRED,
            ).missing,
        ).toEqual(['Ringkasan', 'Fitur Utama']);
    });

    it('tolerates numbering, bold, case and suffixes in headings', () => {
        expect(
            checkPrdCompleteness(
                '## 1. ringkasan\na\n## **Masalah**\nb\n## Fitur Utama (MVP)\nc\n## API Endpoints:\nd',
                REQUIRED,
            ).missing,
        ).toEqual([]);
    });

    it('ignores headings inside code fences', () => {
        expect(
            checkPrdCompleteness(
                '## Ringkasan\n```md\n## Masalah\n```\n## Fitur Utama\nc\n## API Endpoints\nd',
                REQUIRED,
            ).missing,
        ).toEqual(['Masalah']);
    });

    it('treats the last section as cut off when the sections after it are missing', () => {
        // A document that stops early was almost always cut at its tail.
        expect(
            checkPrdCompleteness(
                '## Ringkasan\na\n## Masalah\nsetengah kal',
                REQUIRED,
            ),
        ).toEqual({
            missing: ['Fitur Utama', 'API Endpoints'],
            incomplete: 'Masalah',
        });
    });

    it('treats the last section as cut off when a fence is left open', () => {
        expect(
            checkPrdCompleteness(
                '## Ringkasan\na\n## Masalah\nb\n## Fitur Utama\nc\n## API Endpoints\n```mermaid\nerDiagram',
                REQUIRED,
            ),
        ).toEqual({ missing: [], incomplete: 'API Endpoints' });
    });

    it('treats the last section as cut off when the provider said so', () => {
        expect(
            checkPrdCompleteness(
                '## Ringkasan\na\n## Masalah\nb\n## Fitur Utama\nc\n## API Endpoints\nd',
                REQUIRED,
                true,
            ).incomplete,
        ).toBe('API Endpoints');
    });

    it('does not flag an empty document as cut off', () => {
        expect(checkPrdCompleteness('', REQUIRED)).toEqual({
            missing: REQUIRED,
            incomplete: null,
        });
    });
});

describe('sectionsToComplete', () => {
    it('puts the cut-off section and the missing ones in template order', () => {
        expect(
            sectionsToComplete(
                {
                    missing: ['API Endpoints', 'Fitur Utama'],
                    incomplete: 'Masalah',
                },
                REQUIRED,
            ),
        ).toEqual(['Masalah', 'Fitur Utama', 'API Endpoints']);
    });
});

describe('mergePrdSections', () => {
    it('inserts each new section at its template position', () => {
        expect(
            mergePrdSections(
                '# P\n\n## Ringkasan\na\n\n## API Endpoints\nd',
                '## Masalah\nb\n\n## Fitur Utama\nc',
                REQUIRED,
            ),
        ).toBe(
            '# P\n\n## Ringkasan\na\n\n## Masalah\nb\n\n## Fitur Utama\nc\n\n## API Endpoints\nd',
        );
    });

    it('appends sections that belong after everything present', () => {
        expect(
            mergePrdSections(
                '# P\n\n## Ringkasan\na',
                '## API Endpoints\nd',
                REQUIRED,
            ),
        ).toBe('# P\n\n## Ringkasan\na\n\n## API Endpoints\nd');
    });

    it('replaces only the sections it was told to rewrite', () => {
        expect(
            mergePrdSections(
                '## Ringkasan\na\n\n## Masalah\nsetengah',
                '## Ringkasan\nTIDAK BOLEH\n\n## Masalah\nlengkap\n\n## Fitur Utama\nc',
                REQUIRED,
                ['Masalah'],
            ),
        ).toBe('## Ringkasan\na\n\n## Masalah\nlengkap\n\n## Fitur Utama\nc');
    });

    it('drops anything the model wrote before its first section', () => {
        expect(
            mergePrdSections(
                '## Ringkasan\na',
                'Berikut section yang diminta:\n\n## Masalah\nb',
                REQUIRED,
            ),
        ).toBe('## Ringkasan\na\n\n## Masalah\nb');
    });
});

describe('restoreTruncatedTail', () => {
    it('takes the cut section and the unreached ones from the previous draft', () => {
        const previous =
            '# P\n## Ringkasan\nlama\n## Masalah\nlama\n## Fitur Utama\nlama\n## API Endpoints\nlama';
        const cut = '# P\n## Ringkasan\nbaru\n## Masalah\nbaru dan terpo';

        expect(restoreTruncatedTail(cut, previous, REQUIRED)).toBe(
            '# P\n\n## Ringkasan\nbaru\n\n## Masalah\nlama\n\n## Fitur Utama\nlama\n\n## API Endpoints\nlama',
        );
    });
});
