import type { PrdMessage } from '@/types';

export type ChatMessage = {
    id: string;
    role: 'assistant' | 'user';
    content: string;
};

export type ParsedAssistantQuestion = {
    question: string;
    examples: string[];
    note: string;
};

export type PrdSectionItem =
    | { kind: 'line'; text: string }
    | { kind: 'diagram'; code: string };

type ParsedPrdSection = {
    title: string;
    /** Ordered items — text lines and Mermaid diagrams interleaved. */
    content: PrdSectionItem[];
};

export function cleanAssistantText(content: string) {
    return content.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

export function parseAssistantQuestion(
    content: string,
): ParsedAssistantQuestion {
    const cleanedContent = cleanAssistantText(content);
    const structuredQuestion = cleanedContent.match(
        /PERTANYAAN:\s*(.*?)(?=\s+CONTOH:|\s+KENAPA:|$)/i,
    );
    const structuredExamples = cleanedContent.match(
        /CONTOH:\s*(.*?)(?=\s+KENAPA:|$)/i,
    );
    const structuredNote = cleanedContent.match(/KENAPA:\s*(.*)$/i);

    if (structuredQuestion) {
        return {
            question: structuredQuestion[1].trim(),
            examples: parseExampleOptions(structuredExamples?.[1] ?? ''),
            note: structuredNote?.[1]?.trim() ?? '',
        };
    }

    const exampleMatch = cleanedContent.match(
        /\((?:contoh|misalnya)\s*:?\s*([^)]+)\)/i,
    );
    const textWithoutExamples = exampleMatch
        ? cleanedContent.replace(exampleMatch[0], '').trim()
        : cleanedContent;
    const question =
        textWithoutExamples.match(/:\s*([^?]+\?)/)?.[1]?.trim() ??
        textWithoutExamples.match(/([^.!?]*\?)/)?.[1]?.trim() ??
        textWithoutExamples.split(/[.!]/)[0]?.trim() ??
        textWithoutExamples;
    const note = textWithoutExamples
        .replace(/^.*?:\s*/, '')
        .replace(question, '')
        .replace(/^[\s.]+/, '')
        .trim();

    return {
        question,
        examples: parseExampleOptions(exampleMatch?.[1] ?? ''),
        note,
    };
}

function parseExampleOptions(rawExamples: string) {
    return rawExamples
        .split(/\||,/)
        .map((example) =>
            example
                .replace(/^atau\s+/i, '')
                .replace(/[?.]+$/g, '')
                .trim(),
        )
        .filter(Boolean)
        .slice(0, 6);
}

export function parsePrdSections(content: string): ParsedPrdSection[] {
    const sections: ParsedPrdSection[] = [];
    const lines = content.split('\n');
    let currentSection: ParsedPrdSection | null = null;
    let inFence = false;
    let fenceBuffer: string[] = [];

    const ensureSection = () => {
        if (!currentSection) {
            currentSection = {
                title: 'Ringkasan',
                content: [],
            };
            sections.push(currentSection);
        }

        return currentSection;
    };

    lines.forEach((line) => {
        const trimmedLine = line.trim();

        // Fenced code blocks (e.g. Mermaid ERD) are captured verbatim —
        // including their content — instead of being dropped, so diagrams
        // survive into the section view at their original position.
        if (trimmedLine.startsWith('```')) {
            if (!inFence) {
                inFence = true;
                fenceBuffer = [trimmedLine];

                return;
            }

            inFence = false;
            fenceBuffer.push(trimmedLine);
            ensureSection().content.push({
                kind: 'diagram',
                code: fenceBuffer.join('\n'),
            });

            return;
        }

        if (inFence) {
            fenceBuffer.push(trimmedLine);

            return;
        }

        if (!trimmedLine) {
            return;
        }

        if (/^---+$/.test(trimmedLine)) {
            return;
        }

        if (/^#{1,2}\s+/.test(trimmedLine)) {
            currentSection = {
                title: trimmedLine.replace(/^#+\s*/, ''),
                content: [],
            };
            sections.push(currentSection);

            return;
        }

        ensureSection().content.push({ kind: 'line', text: trimmedLine });
    });

    return sections;
}

export function cleanPrdText(content: string) {
    return content
        .replace(/\*\*/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .trim();
}

export function isPrdContent(content: string) {
    // A PRD always carries at least one section heading (## ...) somewhere in
    // the document; checking the first character misses documents that open
    // with a code fence or a short preamble.
    return /^#{1,2}\s+\S/m.test(content.trim());
}

export function deriveTitle(content: string, idea: string) {
    const fromContent = content
        .split('\n')
        .find((line) => line.startsWith('# '))
        ?.replace('# ', '')
        .trim();

    if (fromContent) {
        return fromContent.slice(0, 120);
    }

    const fromIdea = idea.replace(/\s+/g, ' ').trim();

    return fromIdea ? fromIdea.slice(0, 80) : 'PRD tanpa judul';
}

export function hydrateMessages(messages: PrdMessage[]): ChatMessage[] {
    return messages.map((message) => ({
        id: newId(),
        role: message.role,
        content: message.content,
    }));
}

/**
 * crypto.randomUUID() only exists in secure contexts (HTTPS / localhost);
 * fall back for LAN dev over plain http:// where the workspace would
 * otherwise crash on load.
 */
export function newId(): string {
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return crypto.randomUUID();
    }

    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Group consecutive lines into renderable blocks: markdown tables, task
 * checklists, or plain text runs. Diagrams are handled separately.
 */
export function parsePrdBlocks(
    lines: string[],
): Array<
    | { type: 'table'; rows: string[][] }
    | { type: 'checklist'; items: string[] }
    | { type: 'text'; lines: string[] }
> {
    const blocks: Array<
        | { type: 'table'; rows: string[][] }
        | { type: 'checklist'; items: string[] }
        | { type: 'text'; lines: string[] }
    > = [];

    const splitRow = (row: string): string[] =>
        row
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((cell) => cell.trim());

    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Markdown table: header row + separator row.
        if (
            line.startsWith('|') &&
            i + 1 < lines.length &&
            /^\|?[\s:-]+\|/.test(lines[i + 1]) &&
            /^[\s|:-]+$/.test(lines[i + 1])
        ) {
            const rows: string[][] = [splitRow(line)];
            i += 2; // skip separator

            while (i < lines.length && lines[i].startsWith('|')) {
                rows.push(splitRow(lines[i]));
                i += 1;
            }

            blocks.push({ type: 'table', rows });

            continue;
        }

        // Task checklist item (- [ ] ... / - [x] ...).
        if (/^[-*]\s+\[[ xX]\]\s+/.test(line)) {
            const items: string[] = [];

            while (i < lines.length && /^[-*]\s+\[[ xX]\]\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^[-*]\s+\[[ xX]\]\s+/, ''));
                i += 1;
            }

            blocks.push({ type: 'checklist', items });

            continue;
        }

        const text: string[] = [];

        while (
            i < lines.length &&
            !lines[i].startsWith('|') &&
            !/^[-*]\s+\[[ xX]\]\s+/.test(lines[i])
        ) {
            text.push(lines[i]);
            i += 1;
        }

        blocks.push({ type: 'text', lines: text });
    }

    return blocks;
}
