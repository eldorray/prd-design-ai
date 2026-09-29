import type { Mermaid } from 'mermaid';

let loader: Promise<Mermaid> | null = null;
let renderCount = 0;

/**
 * Mermaid is large, so it is only fetched the first time a PRD actually
 * contains a diagram.
 */
function loadMermaid(): Promise<Mermaid> {
    loader ??= import('mermaid').then(({ default: mermaid }) => {
        mermaid.initialize({
            startOnLoad: false,
            // PRD text is model output: strict escapes HTML in labels and
            // disables click/script directives inside diagrams.
            securityLevel: 'strict',
            // Drawn on a white card in both themes, so it also prints cleanly.
            theme: 'default',
        });

        return mermaid;
    });

    return loader;
}

/**
 * Render Mermaid source to an SVG string. Rejects when the source is invalid.
 */
export async function renderMermaid(code: string): Promise<string> {
    const mermaid = await loadMermaid();

    // Parse first: it throws on invalid input without touching the DOM,
    // whereas a failed render can leave an error diagram behind.
    await mermaid.parse(code);

    renderCount += 1;
    const { svg } = await mermaid.render(`prd-mermaid-${renderCount}`, code);

    return svg;
}
