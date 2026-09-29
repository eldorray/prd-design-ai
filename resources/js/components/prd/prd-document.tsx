import { Check, Code2, Copy, Network } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cleanPrdText, parsePrdBlocks } from '@/lib/prd-parser';
import type { PrdSectionItem } from '@/lib/prd-parser';
import { renderMermaid } from '@/lib/render-mermaid';

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

export function PrdDiagram({
    code,
    language,
    closed,
    index,
}: {
    code: string;
    language: string;
    closed: boolean;
    index: number;
}) {
    const [copied, setCopied] = useState(false);
    const [svg, setSvg] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [showCode, setShowCode] = useState(false);
    const isMermaid = language === 'mermaid';

    useEffect(() => {
        // Wait for the closing fence: a half-streamed diagram never parses.
        if (!isMermaid || !closed) {
            return;
        }

        let cancelled = false;

        renderMermaid(code).then(
            (result) => {
                if (!cancelled) {
                    setSvg(result);
                    setFailed(false);
                }
            },
            () => {
                if (!cancelled) {
                    setSvg(null);
                    setFailed(true);
                }
            },
        );

        return () => {
            cancelled = true;
        };
    }, [code, closed, isMermaid]);

    const handleCopy = async () => {
        const succeeded = await navigator.clipboard.writeText(code).then(
            () => true,
            () => false,
        );

        if (succeeded) {
            setCopied(true);
            toast.success('Kode diagram disalin.');

            setTimeout(() => setCopied(false), 2000);
        }
    };

    const showDiagram = svg !== null && !showCode;

    return (
        <div className="border-border bg-muted/30 break-inside-avoid rounded-lg border">
            <div className="border-border/60 flex items-center justify-between border-b px-3 py-1.5 print:hidden">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    {isMermaid
                        ? `Diagram ${index + 1} · Mermaid`
                        : `Kode · ${language || 'teks'}`}
                </span>
                <div className="flex items-center gap-1">
                    {svg !== null ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCode((value) => !value)}
                            className="h-7 px-2 text-xs"
                        >
                            {showCode ? (
                                <Network className="size-3.5" />
                            ) : (
                                <Code2 className="size-3.5" />
                            )}
                            {showCode ? 'Diagram' : 'Kode'}
                        </Button>
                    ) : null}
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
            </div>
            {showDiagram ? (
                // Mermaid output rendered with securityLevel "strict", which
                // sanitizes the SVG before it reaches the page.
                <div
                    className="overflow-x-auto rounded-b-lg bg-white p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
            ) : (
                <pre className="text-foreground overflow-x-auto p-3 text-xs leading-5">
                    <code>{code}</code>
                </pre>
            )}
            {isMermaid && !closed ? (
                <p className="text-muted-foreground border-border/60 border-t px-3 py-1.5 text-xs">
                    Diagram sedang ditulis...
                </p>
            ) : null}
            {failed ? (
                <p className="text-muted-foreground border-border/60 border-t px-3 py-1.5 text-xs">
                    Sintaks diagram belum valid, jadi ditampilkan sebagai kode.
                </p>
            ) : null}
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
                            language={item.language}
                            closed={item.closed}
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
