import { Plus, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DesignSummary } from '@/types';

export const HISTORY_DRAWER_ID = 'design-history';

/**
 * Drawer listing saved designs. It overlays the workspace at every size: on
 * lg it slides out beside the 64px icon rail (which stays clickable above
 * it); below lg it covers the page from the left edge.
 */
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
                    className="fixed inset-0 z-30 bg-foreground/25 lg:left-16"
                    onClick={onClose}
                />
            ) : null}

            <aside
                id={HISTORY_DRAWER_ID}
                aria-label="Riwayat design"
                className={cn(
                    'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-background shadow-[24px_0_48px_-32px_rgb(0_0_0/0.35)] transition-[translate,visibility] duration-200 ease-out lg:left-16',
                    open
                        ? 'visible translate-x-0'
                        : 'invisible -translate-x-full',
                )}
            >
                <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-border pr-3 pl-5">
                    <h2 className="label-mono">Riwayat design</h2>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Tutup riwayat"
                        onClick={onClose}
                    >
                        <X className="size-4" />
                    </Button>
                </div>

                <div className="px-4 pt-4 pb-3">
                    <Button
                        type="button"
                        variant="outline"
                        className="h-10 w-full bg-card"
                        onClick={onNew}
                    >
                        <Plus className="size-4" />
                        Design baru
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 pb-4">
                    {history.length === 0 ? (
                        <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">
                            Belum ada design tersimpan.
                        </p>
                    ) : (
                        <ul className="flex flex-col gap-0.5">
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
                                            aria-current={
                                                isActive ? 'true' : undefined
                                            }
                                            className={cn(
                                                'flex w-full flex-col gap-0.5 rounded-lg py-2 pr-10 pl-2.5 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                                isActive
                                                    ? 'bg-secondary'
                                                    : 'hover:bg-accent',
                                            )}
                                        >
                                            <span className="truncate text-sm leading-snug">
                                                {item.title}
                                            </span>
                                            <span className="font-mono text-[11px] text-muted-foreground capitalize">
                                                {item.kind.replace('-', ' ')}
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`Hapus ${item.title}`}
                                            onClick={() => onDelete(item.id)}
                                            className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition outline-none group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </aside>
        </>
    );
}
