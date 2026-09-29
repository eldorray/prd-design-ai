import { Check, Copy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cleanPrdText, parsePrdBlocks } from '@/lib/prd-parser';
import type { PrdSectionItem } from '@/lib/prd-parser';

function PrdTable({ rows }: { rows: string[][] }) {
    const [header, ...body] = rows;

    return (
        <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
                <thead className="bg-muted/50">
                    <tr>
                        {header.map((cell, index) => (
                            <th
                                key={index}
                                className="whitespace-nowrap px-3 py-2 font-medium"
                            >
                                {cleanPrdText(cell)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {body.map((row, rowIndex) => (
                        <tr
                            key={rowIndex}
                            className="border-border/60 border-t"
                        >
                            {row.map((cell, cellIndex) => (
                                <td
                                    key={cellIndex}
                                    className="text-muted-foreground px-3 py-2"
                                >
                                    {cleanPrdText(cell)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function PrdChecklist({ items }: { items: string[] }) {
    return (
        <ul className="space-y-1.5">
            {items.map((item, index) => (
                <li
                    key={index}
                    className="text-muted-foreground flex items-start gap-2.5 text-sm leading-6"
                >
                    <span className="border-border bg-background mt-1.5 size-3.5 shrink-0 rounded border" />
                    <span>{cleanPrdText(item)}</span>
                </li>
            ))}
        </ul>
    );
}

export function PrdDiagram({ code, index }: { code: string; index: number }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const succeeded = await navigator.clipboard.writeText(code).then(
            () => true,
            () => false,
        );

        if (succeeded) {
            setCopied(true);
            toast.success(
                'Kode diagram disalin. Tempel di mermaid.live untuk melihat visualnya.',
            );

            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="border-border bg-muted/30 rounded-lg border">
            <div className="border-border/60 flex items-center justify-between border-b px-3 py-1.5">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Diagram {index + 1} · Mermaid
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 px-2 text-xs"
                >
                    {copied ? (
                        <Check className="size-3.5" />
                    ) : (
                        <Copy className="size-3.5" />
                    )}
                    {copied ? 'Tersalin' : 'Salin'}
                </Button>
            </div>
            <pre className="text-foreground overflow-x-auto p-3 text-xs leading-5">
                <code>{code}</code>
            </pre>
        </div>
    );
}

export function PrdSectionContent({ items }: { items: PrdSectionItem[] }) {
    // Pre-compute each item's diagram ordinal so render stays pure (the
    // React compiler forbids mutating counters during render).
    const diagramOrdinals = useMemo(() => {
        const ordinals: number[] = [];
        let next = 0;

        for (const item of items) {
            if (item.kind === 'diagram') {
                ordinals.push(next);
                next += 1;
            } else {
                ordinals.push(-1);
            }
        }

        return ordinals;
    }, [items]);

    return (
        <div className="mt-3 space-y-2">
            {items.map((item, index) => {
                if (item.kind === 'diagram') {
                    return (
                        <PrdDiagram
                            key={index}
                            code={item.code}
                            index={diagramOrdinals[index]}
                        />
                    );
                }

                // Only render a text run at its first line; the run collects
                // every consecutive line item in one block group.
                if (items[index - 1]?.kind !== 'line') {
                    const run: string[] = [];
                    let cursor = index;

                    while (
                        cursor < items.length &&
                        items[cursor].kind === 'line'
                    ) {
                        run.push(
                            (items[cursor] as { kind: 'line'; text: string })
                                .text,
                        );
                        cursor += 1;
                    }

                    return <PrdTextBlock key={index} lines={run} />;
                }

                return null;
            })}
        </div>
    );
}

function PrdTextBlock({ lines }: { lines: string[] }) {
    const blocks = parsePrdBlocks(lines);

    return (
        <div className="space-y-2">
            {blocks.map((block, index) => {
                if (block.type === 'table') {
                    return <PrdTable key={index} rows={block.rows} />;
                }

                if (block.type === 'checklist') {
                    return <PrdChecklist key={index} items={block.items} />;
                }

                return (
                    <div key={index} className="space-y-2">
                        {block.lines.map((line, lineIndex) => (
                            <PrdLine key={lineIndex} line={line} />
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

function PrdLine({ line }: { line: string }) {
    const cleanLine = cleanPrdText(line);

    if (/^#{3,}\s+/.test(line)) {
        return (
            <h4 className="pt-2 text-sm font-semibold">
                {cleanPrdText(line.replace(/^#{3,}\s+/, ''))}
            </h4>
        );
    }

    if (
        !/^[-*]\s+/.test(line) &&
        !/^\d+\.\s+/.test(line) &&
        /^.{2,60}:$/.test(cleanLine)
    ) {
        return (
            <h4 className="pt-2 text-sm font-semibold">
                {cleanLine.replace(/:$/, '')}
            </h4>
        );
    }

    if (/^[-*]\s+/.test(line)) {
        return (
            <div className="text-muted-foreground flex gap-2 text-sm leading-6">
                <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" />
                <span>{cleanPrdText(line.replace(/^[-*]\s+/, ''))}</span>
            </div>
        );
    }

    if (/^\d+\.\s+/.test(line)) {
        return (
            <p className="text-muted-foreground text-sm leading-6">
                {cleanPrdText(line.replace(/^\d+\.\s+/, ''))}
            </p>
        );
    }

    return (
        <p className="text-muted-foreground text-sm leading-6">{cleanLine}</p>
    );
}
