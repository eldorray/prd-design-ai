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
    | {
          kind: 'diagram';
          /** Fence info string, e.g. "mermaid"; empty when none was given. */
          language: string;
          /** Body without the fence markers, indentation preserved. */
          code: string;
          /** False while the closing fence has not arrived (streaming). */
          closed: boolean;
      };

type ParsedPrdSection = {
    title: string;
    /** Ordered items — text lines and Mermaid diagrams interleaved. */
    content: PrdSectionItem[];
};

const READY_MARKER = '[SIAP_GENERATE]';

export function cleanAssistantText(content: string) {
    return content
        .replaceAll(READY_MARKER, '')
        .replace(/\*\*/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * The interview prompt ends with this marker once enough answers are in —
 * the cue to offer PRD generation instead of another question.
 */
export function isReadyToGenerate(content: string) {
    return content.includes(READY_MARKER);
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
                .trim()
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
    let fence: { language: string; lines: string[] } | null = null;

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
            if (!fence) {
                fence = {
                    language: trimmedLine.slice(3).trim().toLowerCase(),
                    lines: [],
                };

                return;
            }

            ensureSection().content.push({
                kind: 'diagram',
                language: fence.language,
                code: fence.lines.join('\n'),
                closed: true,
            });
            fence = null;

            return;
        }

        if (fence) {
            fence.lines.push(line.trimEnd());

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

    // A fence still open at the end (streaming, or output cut off at the
    // token limit) is shown as an unfinished block instead of vanishing.
    const openFence = fence as { language: string; lines: string[] } | null;

    if (openFence) {
        ensureSection().content.push({
            kind: 'diagram',
            language: openFence.language,
            code: openFence.lines.join('\n'),
            closed: false,
        });
    }

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

    const isChecklistItem = (line: string) => /^[-*]\s+\[[ xX]\]\s+/.test(line);

    // Markdown table: header row + separator row. A "|" row without its
    // separator (still streaming, or malformed) is not a table.
    const startsTable = (index: number) =>
        lines[index].startsWith('|') &&
        index + 1 < lines.length &&
        /^\|?[\s:-]+\|/.test(lines[index + 1]) &&
        /^[\s|:-]+$/.test(lines[index + 1]);

    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (startsTable(i)) {
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
        if (isChecklistItem(line)) {
            const items: string[] = [];

            while (i < lines.length && isChecklistItem(lines[i])) {
                items.push(lines[i].replace(/^[-*]\s+\[[ xX]\]\s+/, ''));
                i += 1;
            }

            blocks.push({ type: 'checklist', items });

            continue;
        }

        // Neither branch above claimed this line, so it is text — including a
        // "|" row whose separator has not streamed in yet. Taking it here is
        // what guarantees progress; without it such a row looped forever.
        const text: string[] = [line];
        i += 1;

        while (
            i < lines.length &&
            !startsTable(i) &&
            !isChecklistItem(lines[i])
        ) {
            text.push(lines[i]);
            i += 1;
        }

        blocks.push({ type: 'text', lines: text });
    }

    return blocks;
}
