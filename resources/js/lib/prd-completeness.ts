export type PrdCompleteness = {
    /** Required sections absent from the document, in template order. */
    missing: string[];
    /** The document's last section when it looks cut off, else null. */
    incomplete: string | null;
};

type Chunk = {
    /** Canonical template name, or null for a section outside the template. */
    section: string | null;
    text: string;
};

function normalizeHeading(heading: string): string {
    return heading
        .replace(/\*\*/g, '')
        .replace(/^\d+[.)]\s*/, '')
        .replace(/[:\s]+$/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

/** Match a `##` heading to a template section, tolerating suffixes. */
function canonicalSection(heading: string, required: string[]): string | null {
    const normalized = normalizeHeading(heading);

    return (
        required.find((section) => {
            const name = section.toLowerCase();

            return normalized === name || normalized.startsWith(`${name} `);
        }) ?? null
    );
}

/**
 * Split a Markdown document into its `##` sections (fences respected). The
 * text before the first section comes back separately as the preamble.
 */
function splitSections(
    content: string,
    required: string[],
): { preamble: string; chunks: Chunk[]; openFence: boolean } {
    const chunks: Chunk[] = [];
    const preamble: string[] = [];
    let current: string[] | null = null;
    let inFence = false;

    for (const line of content.split('\n')) {
        if (line.trim().startsWith('```')) {
            inFence = !inFence;
        }

        const heading = !inFence && line.match(/^##\s+(.+)$/);

        if (heading) {
            current = [line];
            chunks.push({
                section: canonicalSection(heading[1], required),
                text: '',
            });
        } else if (current) {
            current.push(line);
        } else {
            preamble.push(line);
        }

        if (current) {
            chunks[chunks.length - 1].text = current.join('\n');
        }
    }

    return { preamble: preamble.join('\n'), chunks, openFence: inFence };
}

/**
 * Which required sections a PRD lacks, and whether its tail was cut off —
 * by the provider's output limit (`truncated`), by an unclosed fence, or by
 * stopping before the sections that should follow its last one.
 */
export function checkPrdCompleteness(
    content: string,
    required: string[],
    truncated = false,
): PrdCompleteness {
    const { chunks, openFence } = splitSections(content, required);
    const present = new Set(chunks.map((chunk) => chunk.section));
    const missing = required.filter((section) => !present.has(section));
    const last = chunks[chunks.length - 1]?.section ?? null;

    if (last === null) {
        return { missing, incomplete: null };
    }

    const lastIndex = required.indexOf(last);
    const stoppedEarly = missing.some(
        (section) => required.indexOf(section) > lastIndex,
    );

    return {
        missing,
        incomplete: truncated || openFence || stoppedEarly ? last : null,
    };
}

/** The sections to request from the "complete" mode, in template order. */
export function sectionsToComplete(
    completeness: PrdCompleteness,
    required: string[],
): string[] {
    const wanted = new Set([
        ...completeness.missing,
        ...(completeness.incomplete ? [completeness.incomplete] : []),
    ]);

    return required.filter((section) => wanted.has(section));
}

/**
 * Put newly written sections into the draft at their template positions.
 * Sections already in the draft are kept unless listed in `replace` (a
 * cut-off tail being rewritten). Anything the model wrote before its first
 * heading is dropped.
 */
export function mergePrdSections(
    draft: string,
    addition: string,
    required: string[],
    replace: string[] = [],
): string {
    const { preamble, chunks } = splitSections(draft, required);
    const added = splitSections(addition, required).chunks.filter(
        (chunk) => chunk.section !== null,
    );

    for (const chunk of added) {
        const existing = chunks.findIndex(
            (candidate) => candidate.section === chunk.section,
        );

        if (existing !== -1) {
            if (replace.includes(chunk.section as string)) {
                chunks[existing] = chunk;
            }

            continue;
        }

        const order = required.indexOf(chunk.section as string);
        const before = chunks.findIndex(
            (candidate) =>
                candidate.section !== null &&
                required.indexOf(candidate.section) > order,
        );

        chunks.splice(before === -1 ? chunks.length : before, 0, chunk);
    }

    return [preamble, ...chunks.map((chunk) => chunk.text)]
        .map((part) => part.trim())
        .filter(Boolean)
        .join('\n\n');
}

/**
 * A rewrite the output limit cut off keeps the previous draft's tail: the cut
 * section, and every section the rewrite never reached, come back from
 * `previous`. Costs no tokens, unlike asking the model to write them again.
 */
export function restoreTruncatedTail(
    next: string,
    previous: string,
    required: string[],
): string {
    const { incomplete } = checkPrdCompleteness(next, required, true);

    return mergePrdSections(
        next,
        previous,
        required,
        incomplete ? [incomplete] : [],
    );
}
