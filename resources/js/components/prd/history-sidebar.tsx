import { Link } from '@inertiajs/react';
import {
    FileText,
    LayoutTemplate,
    PanelLeft,
    Plus,
    Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/workspace/user-menu';
import { cn } from '@/lib/utils';
import { dashboard, home } from '@/routes';
import { index as designIndex } from '@/routes/design';
import type { PrdSummary, User } from '@/types';

/**
 * The workspace's left rail: always visible from lg up, an overlay drawer
 * below it (toggled from the top bar).
 */
export function HistorySidebar({
    user,
    history,
    currentPrdId,
    open,
    onClose,
    onNew,
    onOpen,
    onDelete,
}: {
    user: User;
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
                    className="fixed inset-0 z-30 bg-foreground/40 lg:hidden print:hidden"
                    onClick={onClose}
                />
            ) : null}

            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-40 flex w-72 flex-col gap-6 border-r bg-background px-4 py-5 transition-transform duration-300 ease-in-out lg:w-[248px] lg:translate-x-0 print:hidden',
                    open ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <div className="flex items-center justify-between gap-2">
                    <Link
                        href={home()}
                        className="px-2.5 pt-1 font-serif text-[28px] leading-none"
                    >
                        PRD<span className="text-brand italic">.ai</span>
                    </Link>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        aria-label="Tutup riwayat"
                        onClick={onClose}
                    >
                        <PanelLeft className="size-4" />
                    </Button>
                </div>

                <nav
                    aria-label="Navigasi utama"
                    className="flex flex-col gap-0.5"
                >
                    <Link
                        href={dashboard()}
                        aria-current="page"
                        className="flex h-10 items-center gap-2.5 rounded-lg bg-secondary px-2.5 text-sm font-medium"
                    >
                        <FileText className="size-[18px]" strokeWidth={1.75} />
                        PRD Generator
                    </Link>
                    <Link
                        href={designIndex()}
                        className="flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                    >
                        <LayoutTemplate
                            className="size-[18px]"
                            strokeWidth={1.75}
                        />
                        Design Studio
                    </Link>
                </nav>

                <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full bg-card"
                    onClick={onNew}
                >
                    <Plus className="size-4" />
                    PRD baru
                </Button>

                <div className="flex min-h-0 flex-1 flex-col">
                    <span
                        id="prd-history-label"
                        className="px-2.5 pb-2 label-mono"
                    >
                        Riwayat PRD
                    </span>
                    <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
                        {history.length === 0 ? (
                            <p className="px-2.5 py-2 text-[13px] leading-normal text-muted-foreground">
                                Belum ada PRD tersimpan. Buat yang pertama.
                            </p>
                        ) : (
                            <ul
                                aria-labelledby="prd-history-label"
                                className="flex flex-col gap-0.5"
                            >
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
                                                aria-current={
                                                    isActive
                                                        ? 'true'
                                                        : undefined
                                                }
                                                className={cn(
                                                    'flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 pr-12 text-left transition-colors lg:pr-10',
                                                    isActive
                                                        ? 'bg-secondary'
                                                        : 'hover:bg-secondary/60',
                                                )}
                                            >
                                                <span className="truncate text-sm leading-snug">
                                                    {item.title}
                                                </span>
                                                <span className="font-mono text-[11px] text-muted-foreground">
                                                    {formatTimestamp(
                                                        item.updated_at,
                                                    )}
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={`Hapus ${item.title}`}
                                                onClick={() =>
                                                    onDelete(item.id)
                                                }
                                                className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 lg:size-8"
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

                <div className="-mx-1 border-t pt-3">
                    <UserMenu
                        user={user}
                        variant="rail"
                        showChevron
                        dataTest="user-menu-button"
                    />
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
