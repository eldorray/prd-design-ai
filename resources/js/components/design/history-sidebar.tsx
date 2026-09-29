import { PanelLeft, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DesignSummary } from '@/types';

export function HistorySidebar({
    history,
    currentId,
    open,
    onClose,
    onNew,
    onOpen,
    onDelete,
}: {
    history: DesignSummary[];
    currentId: string | null;
    open: boolean;
    onClose: () => void;
    onNew: () => void;
    onOpen: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    return (
        <>
            {open ? (
                <button
                    type="button"
                    aria-label="Tutup riwayat"
                    className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                    onClick={onClose}
                />
            ) : null}

            <aside
                className={cn(
                    'border-border bg-card fixed inset-y-0 left-0 z-40 flex flex-col border-r transition-all duration-300 ease-in-out lg:static lg:z-auto',
                    open
                        ? 'w-72 translate-x-0'
                        : 'w-72 -translate-x-full lg:w-0 lg:translate-x-0 lg:overflow-hidden lg:border-transparent',
                )}
            >
                <div className="flex h-full w-72 shrink-0 flex-col">
                    <div className="border-border flex h-16 shrink-0 items-center justify-between border-b px-4">
                        <span className="text-sm font-semibold">
                            Riwayat design
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Tutup riwayat"
                            onClick={onClose}
                        >
                            <PanelLeft className="size-4" />
                        </Button>
                    </div>

                    <div className="p-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start"
                            onClick={onNew}
                        >
                            <Plus className="size-4" />
                            Design baru
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 pb-4">
                        {history.length === 0 ? (
                            <p className="text-muted-foreground px-1 py-6 text-center text-xs">
                                Belum ada design tersimpan.
                            </p>
                        ) : (
                            <ul className="space-y-1">
                                {history.map((item) => {
                                    const isActive = item.id === currentId;

                                    return (
                                        <li
                                            key={item.id}
                                            className="group relative"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => onOpen(item.id)}
                                                className={cn(
                                                    'w-full rounded-lg border px-3 py-2 pr-9 text-left transition',
                                                    isActive
                                                        ? 'border-primary/40 bg-primary/10'
                                                        : 'hover:bg-accent border-transparent',
                                                )}
                                            >
                                                <p className="truncate text-sm font-medium">
                                                    {item.title}
                                                </p>
                                                <p className="text-muted-foreground mt-0.5 text-xs capitalize">
                                                    {item.kind.replace(
                                                        '-',
                                                        ' ',
                                                    )}
                                                </p>
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={`Hapus ${item.title}`}
                                                onClick={() =>
                                                    onDelete(item.id)
                                                }
                                                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive absolute right-2 top-2.5 rounded-md p-1 opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}
