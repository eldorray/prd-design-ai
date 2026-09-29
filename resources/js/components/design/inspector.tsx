import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import { useId } from 'react';

import { cn } from '@/lib/utils';
import type { SelectedElement } from '@/types';

const FONT_WEIGHTS: { value: number; label: string }[] = [
    { value: 400, label: 'Normal' },
    { value: 500, label: 'Medium' },
    { value: 600, label: 'Semibold' },
    { value: 700, label: 'Bold' },
    { value: 800, label: 'Extra bold' },
];

const TEXT_ALIGNS = [
    { value: 'left', icon: AlignLeft },
    { value: 'center', icon: AlignCenter },
    { value: 'right', icon: AlignRight },
] as const;

const INPUT_CLASS =
    'border-input bg-card focus-visible:border-ring focus-visible:ring-ring/30 w-full rounded-lg border text-sm outline-none transition-[color,box-shadow] focus-visible:ring-[3px]';

const SEGMENT_CLASS =
    'focus-visible:ring-ring/50 flex min-h-8 items-center justify-center gap-1.5 rounded-[5px] px-0.5 py-1 text-center leading-tight outline-none transition-colors focus-visible:ring-[3px]';

export function Inspector({
    selected,
    onUpdate,
}: {
    selected: SelectedElement | null;
    onUpdate: (patch: Partial<SelectedElement>) => void;
}) {
    const id = useId();

    return (
        <div className="flex flex-col gap-5">
            <h2 className="font-serif text-2xl leading-none">
                Editor komponen
            </h2>

            {!selected ? (
                <p className="rounded-lg border border-dashed border-input p-4 text-sm leading-6 text-muted-foreground">
                    Klik elemen apa pun di preview untuk mengeditnya. Teks,
                    warna, dan font bisa diubah di sini.
                </p>
            ) : (
                <>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                        <span className="label-mono">Elemen terpilih</span>
                        <span className="font-mono text-xs">
                            {selected.tag}
                        </span>
                    </div>

                    {selected.text !== null ? (
                        <Field label="Teks" htmlFor={`${id}-text`}>
                            <textarea
                                id={`${id}-text`}
                                value={selected.text}
                                onChange={(event) =>
                                    onUpdate({ text: event.target.value })
                                }
                                className={cn(
                                    INPUT_CLASS,
                                    'min-h-20 resize-none p-2.5 leading-6',
                                )}
                            />
                        </Field>
                    ) : null}

                    <ColorField
                        id={`${id}-color`}
                        label="Warna teks"
                        value={selected.color}
                        onChange={(value) => onUpdate({ color: value })}
                    />

                    <ColorField
                        id={`${id}-background`}
                        label="Warna latar"
                        value={selected.backgroundColor}
                        onChange={(value) =>
                            onUpdate({ backgroundColor: value })
                        }
                    />

                    <Field
                        label="Ukuran font"
                        htmlFor={`${id}-size`}
                        meta={`${selected.fontSize}px`}
                    >
                        <input
                            id={`${id}-size`}
                            type="range"
                            min={10}
                            max={80}
                            value={selected.fontSize}
                            onChange={(event) =>
                                onUpdate({
                                    fontSize: Number(event.target.value),
                                })
                            }
                            className="w-full accent-foreground"
                        />
                    </Field>

                    <Field label="Ketebalan font" labelId={`${id}-weight`}>
                        <div
                            role="group"
                            aria-labelledby={`${id}-weight`}
                            className="grid grid-cols-5 gap-0.5 rounded-lg border border-input bg-card p-[3px]"
                        >
                            {FONT_WEIGHTS.map((weight) => {
                                const isActive =
                                    Number(selected.fontWeight) ===
                                    weight.value;

                                return (
                                    <button
                                        key={weight.value}
                                        type="button"
                                        onClick={() =>
                                            onUpdate({
                                                fontWeight: weight.value,
                                            })
                                        }
                                        aria-pressed={isActive}
                                        className={cn(
                                            SEGMENT_CLASS,
                                            'text-[11px]',
                                            isActive
                                                ? 'bg-foreground text-background'
                                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                        )}
                                    >
                                        {weight.label}
                                    </button>
                                );
                            })}
                        </div>
                    </Field>

                    <Field label="Rata teks" labelId={`${id}-align`}>
                        <div
                            role="group"
                            aria-labelledby={`${id}-align`}
                            className="grid grid-cols-3 gap-0.5 rounded-lg border border-input bg-card p-[3px]"
                        >
                            {TEXT_ALIGNS.map((align) => {
                                const isActive =
                                    selected.textAlign === align.value;

                                return (
                                    <button
                                        key={align.value}
                                        type="button"
                                        onClick={() =>
                                            onUpdate({ textAlign: align.value })
                                        }
                                        aria-pressed={isActive}
                                        className={cn(
                                            SEGMENT_CLASS,
                                            'text-xs capitalize',
                                            isActive
                                                ? 'bg-foreground text-background'
                                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                        )}
                                    >
                                        <align.icon
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        {align.value}
                                    </button>
                                );
                            })}
                        </div>
                    </Field>
                </>
            )}
        </div>
    );
}

function Field({
    label,
    htmlFor,
    labelId,
    meta,
    children,
}: {
    label: string;
    htmlFor?: string;
    labelId?: string;
    meta?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
                {htmlFor ? (
                    <label htmlFor={htmlFor} className="label-mono">
                        {label}
                    </label>
                ) : (
                    <span id={labelId} className="label-mono">
                        {label}
                    </span>
                )}
                {meta ? (
                    <span className="font-mono text-xs tabular-nums">
                        {meta}
                    </span>
                ) : null}
            </div>
            {children}
        </div>
    );
}

function ColorField({
    id,
    label,
    value,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <Field label={label} htmlFor={id}>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="size-10 shrink-0 cursor-pointer rounded-lg border border-input bg-card p-1"
                    aria-label={label}
                />
                <input
                    id={id}
                    type="text"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className={cn(INPUT_CLASS, 'h-10 px-3 font-mono')}
                />
            </div>
        </Field>
    );
}
