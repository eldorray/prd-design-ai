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
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[15px]">
                <thead>
                    <tr>
                        {header.map((cell, index) => (
                            <th
                                key={index}
                                scope="col"
                                className="border-b border-foreground py-2 pr-4 align-bottom label-mono whitespace-nowrap last:pr-0"
                            >
                                {cleanPrdText(cell)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {body.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                                <td
                                    key={cellIndex}
                                    className="border-b py-2.5 pr-4 align-top leading-normal first:font-medium last:pr-0"
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
        <ul className="flex flex-col gap-2">
            {items.map((item, index) => (
                <li
                    key={index}
                    className="flex items-start gap-3 text-[15px] leading-relaxed"
                >
                    <span
                        aria-hidden="true"
                        className="mt-[5px] size-3.5 shrink-0 rounded-[3px] border border-input bg-background"
                    />
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
        <div className="break-inside-avoid overflow-hidden rounded-lg border bg-background">
            <div className="flex items-center justify-between gap-3 border-b py-1 pr-1 pl-3 print:hidden">
                <span className="label-mono">
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
                            className="h-7 px-2 text-xs font-normal"
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
                        className="h-7 px-2 text-xs font-normal"
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
                    className="overflow-x-auto bg-white p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
            ) : (
                <pre className="overflow-x-auto p-4 font-mono text-xs leading-5 text-foreground">
                    <code>{code}</code>
                </pre>
            )}
            {isMermaid && !closed ? (
                <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
                    Diagram belum selesai ditulis.
                </p>
            ) : null}
            {failed ? (
                <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
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
        <div className="mt-3 flex flex-col gap-4">
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
        <div className="flex flex-col gap-4">
            {blocks.map((block, index) => {
                if (block.type === 'table') {
                    return <PrdTable key={index} rows={block.rows} />;
                }

                if (block.type === 'checklist') {
                    return <PrdChecklist key={index} items={block.items} />;
                }

                return (
                    <div key={index} className="flex flex-col gap-2">
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
            <h4 className="pt-2 text-[15px] font-semibold">
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
            <h4 className="pt-2 text-[15px] font-semibold">
                {cleanLine.replace(/:$/, '')}
            </h4>
        );
    }

    if (/^[-*]\s+/.test(line)) {
        return (
            <div className="flex gap-3 text-base leading-relaxed">
                <span
                    aria-hidden="true"
                    className="mt-[11px] size-1 shrink-0 rounded-full bg-muted-foreground"
                />
                <span>{cleanPrdText(line.replace(/^[-*]\s+/, ''))}</span>
            </div>
        );
    }

    const ordinal = line.match(/^(\d+)\.\s+/);

    if (ordinal) {
        return (
            <div className="flex gap-3 text-base leading-relaxed">
                <span className="min-w-4 shrink-0 pt-[3px] font-mono text-xs text-muted-foreground">
                    {ordinal[1]}.
                </span>
                <span>{cleanPrdText(line.slice(ordinal[0].length))}</span>
            </div>
        );
    }

    return <p className="text-base leading-relaxed">{cleanLine}</p>;
}
