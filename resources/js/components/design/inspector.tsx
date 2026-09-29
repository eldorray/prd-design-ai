import { MousePointerClick, Type } from 'lucide-react';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { SelectedElement } from '@/types';

export function Inspector({
    selected,
    onUpdate,
}: {
    selected: SelectedElement | null;
    onUpdate: (patch: Partial<SelectedElement>) => void;
}) {
    return (
        <div>
            <div className="flex items-center gap-2 text-sm font-medium">
                <MousePointerClick className="text-primary size-4" />
                Editor komponen
            </div>

            {!selected ? (
                <p className="border-border bg-background text-muted-foreground mt-4 rounded-lg border border-dashed p-4 text-sm">
                    Klik elemen apa pun di preview untuk mengeditnya. Teks,
                    warna, dan font bisa diubah di sini.
                </p>
            ) : (
                <div className="mt-4 space-y-5">
                    <div className="border-border bg-background text-muted-foreground rounded-lg border px-3 py-2 text-xs">
                        Elemen terpilih:{' '}
                        <span className="text-foreground font-medium">
                            {selected.tag}
                        </span>
                    </div>

                    {selected.text !== null ? (
                        <Field label="Teks" icon={Type}>
                            <textarea
                                value={selected.text}
                                onChange={(event) =>
                                    onUpdate({ text: event.target.value })
                                }
                                className="border-input bg-background focus:border-ring focus:ring-ring/30 min-h-20 w-full resize-none rounded-lg border p-2.5 text-sm leading-6 outline-none focus:ring-2"
                            />
                        </Field>
                    ) : null}

                    <ColorField
                        label="Warna teks"
                        value={selected.color}
                        onChange={(value) => onUpdate({ color: value })}
                    />

                    <ColorField
                        label="Warna latar"
                        value={selected.backgroundColor}
                        onChange={(value) =>
                            onUpdate({ backgroundColor: value })
                        }
                    />

                    <Field label={`Ukuran font · ${selected.fontSize}px`}>
                        <input
                            type="range"
                            min={10}
                            max={80}
                            value={selected.fontSize}
                            onChange={(event) =>
                                onUpdate({
                                    fontSize: Number(event.target.value),
                                })
                            }
                            className="accent-primary w-full"
                        />
                    </Field>

                    <Field label="Ketebalan font">
                        <Select
                            value={String(selected.fontWeight)}
                            onValueChange={(value) =>
                                onUpdate({ fontWeight: Number(value) })
                            }
                        >
                            <SelectTrigger className="h-9 w-full text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="400">Normal</SelectItem>
                                <SelectItem value="500">Medium</SelectItem>
                                <SelectItem value="600">Semibold</SelectItem>
                                <SelectItem value="700">Bold</SelectItem>
                                <SelectItem value="800">Extra bold</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field label="Rata teks">
                        <div className="grid grid-cols-3 gap-2">
                            {(['left', 'center', 'right'] as const).map(
                                (align) => (
                                    <button
                                        key={align}
                                        type="button"
                                        onClick={() =>
                                            onUpdate({ textAlign: align })
                                        }
                                        aria-pressed={
                                            selected.textAlign === align
                                        }
                                        className={cn(
                                            'rounded-lg border px-2 py-1.5 text-xs capitalize transition',
                                            selected.textAlign === align
                                                ? 'border-primary bg-primary/10 text-foreground'
                                                : 'border-border text-muted-foreground hover:bg-accent',
                                        )}
                                    >
                                        {align}
                                    </button>
                                ),
                            )}
                        </div>
                    </Field>
                </div>
            )}
        </div>
    );
}

function Field({
    label,
    icon: Icon,
    children,
}: {
    label: string;
    icon?: typeof Type;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                {Icon ? <Icon className="size-3.5" /> : null}
                {label}
            </label>
            {children}
        </div>
    );
}

function ColorField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <Field label={label}>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="border-input bg-background size-9 shrink-0 cursor-pointer rounded-md border"
                    aria-label={label}
                />
                <input
                    type="text"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="border-input bg-background focus:border-ring focus:ring-ring/30 h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus:ring-2"
                />
            </div>
        </Field>
    );
}
