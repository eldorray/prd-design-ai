import { describe, expect, it } from 'vitest';

import {
    cleanHtml,
    deriveTitle,
    EDIT_BRIDGE,
    highlightHtml,
    stripEditBridge,
} from '@/lib/design-html';

/** Drop the highlighter's own <span> wrappers, leaving only escaped source. */
const withoutHighlightSpans = (html: string): string =>
    html.replace(/<span class="[^"]*">|<\/span>/g, '');

describe('stripEditBridge', () => {
    it('removes every injected bridge script and keeps other scripts', () => {
        const html = `<html><body><p>x</p>${EDIT_BRIDGE}<script>keep()</script>${EDIT_BRIDGE}</body></html>`;

        expect(stripEditBridge(html)).toBe(
            '<html><body><p>x</p><script>keep()</script></body></html>',
        );
    });

    it('matches the bridge marker among other attributes', () => {
        expect(
            stripEditBridge(
                '<script type="text/javascript" data-design-edit-bridge="1">a()</script><script>b()</script>',
            ),
        ).toBe('<script>b()</script>');
    });

    it('leaves no trace of the bridge marker', () => {
        expect(stripEditBridge(`<body>${EDIT_BRIDGE}</body>`)).not.toContain(
            'data-design-edit-bridge',
        );
    });
});

describe('highlightHtml', () => {
    it('returns an empty string for empty input', () => {
        expect(highlightHtml('')).toBe('');
    });

    it('escapes plain text', () => {
        expect(highlightHtml('1 < 2 > 0 & 3')).toBe('1 &lt; 2 &gt; 0 &amp; 3');
    });

    it('never emits a live <script> tag from text content', () => {
        const output = highlightHtml(
            '<p>Hello <script>alert(1)</script> & bye</p>',
        );

        expect(output).not.toMatch(/<\/?script/i);
        expect(withoutHighlightSpans(output)).not.toContain('<');
        expect(withoutHighlightSpans(output)).toBe(
            '&lt;p>Hello &lt;script>alert(1)&lt;/script&gt; &amp; bye&lt;/p&gt;',
        );
    });

    it('never emits a live <script> tag from attribute values', () => {
        const output = highlightHtml(
            `<a title="<script>alert(1)</script>" alt='x<y' href=x>t</a>`,
        );

        expect(output).not.toMatch(/<\/?script/i);
        expect(withoutHighlightSpans(output)).not.toContain('<');
        expect(output).toContain(
            '<span class="text-emerald-400">"&lt;script</span>',
        );
    });

    it('escapes comments and the doctype', () => {
        const output = highlightHtml(
            '<!DOCTYPE html><!-- <script>bad()</script> -->',
        );

        expect(output).toBe(
            '<span class="text-sky-400 font-semibold">&lt;!DOCTYPE html&gt;</span>' +
                '<span class="text-neutral-500 italic">&lt;!-- &lt;script&gt;bad()&lt;/script&gt; --&gt;</span>',
        );
    });

    it('highlights tag names, attribute names and attribute values', () => {
        expect(highlightHtml('<img src="a.png" />')).toBe(
            '<span class="text-pink-500">&lt;</span>' +
                '<span class="text-pink-500 font-semibold">img</span> ' +
                '<span class="text-amber-400">src</span>=' +
                '<span class="text-emerald-400">"a.png"</span> ' +
                '<span class="text-pink-500">/></span>',
        );
    });
});

describe('cleanHtml', () => {
    it('strips a fenced ```html block (and currently drops a leading DOCTYPE)', () => {
        // A DOCTYPE at index 0 is not treated as the document start, so the
        // `<html` cut below it removes the DOCTYPE line.
        expect(
            cleanHtml(
                '```html\n<!DOCTYPE html>\n<html><body>Hi</body></html>\n```',
            ),
        ).toBe('<html><body>Hi</body></html>');
    });

    it('strips a fence without a language tag', () => {
        expect(cleanHtml('```\n<div>x</div>\n```')).toBe('<div>x</div>');
    });

    it('drops leaked <think> blocks and preamble before the DOCTYPE', () => {
        expect(
            cleanHtml(
                'Sure! Here it is:\n<think>hmm</think><!doctype html><html></html>',
            ),
        ).toBe('<!doctype html><html></html>');
    });

    it('drops preamble before <html> when there is no DOCTYPE', () => {
        expect(cleanHtml('intro <html><body></body></html>')).toBe(
            '<html><body></body></html>',
        );
    });
});

describe('deriveTitle', () => {
    it('uses the prompt with collapsed whitespace, capped at 80', () => {
        expect(deriveTitle('  Landing   page\n kopi ', 'dashboard')).toBe(
            'Landing page kopi',
        );
        expect(deriveTitle('z'.repeat(100), 'landing-page')).toHaveLength(80);
    });

    it('falls back to a per-kind default title', () => {
        expect(deriveTitle('', 'dashboard')).toBe('Dashboard tanpa judul');
        expect(deriveTitle(' ', 'mobile-app')).toBe('Mobile app tanpa judul');
        expect(deriveTitle('', 'landing-page')).toBe('Landing tanpa judul');
    });
});
