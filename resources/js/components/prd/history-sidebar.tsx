import { PanelLeft, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PrdSummary } from '@/types';

export function HistorySidebar({
    history,
    currentPrdId,
    open,
    onClose,
    onNew,
    onOpen,
    onDelete,
}: {
    history: PrdSummary[];
    currentPrdId: string | null;
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
                    'm3-history-drawer fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out lg:static lg:z-auto',
                    open
                        ? 'w-72 translate-x-0'
                        : 'w-72 -translate-x-full lg:w-0 lg:translate-x-0 lg:overflow-hidden lg:border-transparent',
                )}
            >
                <div className="flex h-full w-72 shrink-0 flex-col">
                    <div className="flex h-16 shrink-0 items-center justify-between px-4">
                        <div>
                            <span className="text-sm font-medium">Dokumen</span>
                            <p className="text-muted-foreground text-xs">
                                Riwayat PRD
                            </p>
                        </div>
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
                            className="m3-new-document h-12 w-full justify-start"
                            onClick={onNew}
                        >
                            <Plus className="size-4" />
                            PRD baru
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 pb-4">
                        {history.length === 0 ? (
                            <p className="text-muted-foreground px-1 py-6 text-center text-xs">
                                Belum ada PRD tersimpan. Buat yang pertama.
                            </p>
                        ) : (
                            <ul className="space-y-1">
                                {history.map((item) => {
                                    const isActive = item.id === currentPrdId;

                                    return (
                                        <li
                                            key={item.id}
                                            className="group relative"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => onOpen(item.id)}
                                                className={cn(
                                                    'm3-history-item min-h-14 w-full px-3 py-2 pr-11 text-left transition',
                                                    isActive ? 'is-active' : '',
                                                )}
                                            >
                                                <p className="truncate text-sm font-medium">
                                                    {item.title}
                                                </p>
                                                <p className="text-muted-foreground mt-0.5 text-xs">
                                                    {formatTimestamp(
                                                        item.updated_at,
                                                    )}
                                                </p>
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={`Hapus ${item.title}`}
                                                onClick={() =>
                                                    onDelete(item.id)
                                                }
                                                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive absolute right-1 top-1.5 flex size-11 items-center justify-center rounded-full opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100"
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

function formatTimestamp(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}
