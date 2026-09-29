import { Link } from '@inertiajs/react';
import { FileText, History, PanelsTopLeft } from 'lucide-react';
import type { ReactNode } from 'react';

import DesignController from '@/actions/App/Http/Controllers/DesignController';
import { HISTORY_DRAWER_ID } from '@/components/design/history-sidebar';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserMenu } from '@/components/workspace/user-menu';
import { cn } from '@/lib/utils';
import { dashboard, home } from '@/routes';
import type { User } from '@/types';

const RAIL_ITEM_CLASS =
    'text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring/50 flex size-11 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-[3px]';

/** 64px icon rail shown on lg+: home, app switch, history, account. */
export function StudioRail({
    user,
    historyOpen,
    onToggleHistory,
}: {
    user: User;
    historyOpen: boolean;
    onToggleHistory: () => void;
}) {
    return (
        <nav
            aria-label="Navigasi utama"
            className="relative z-50 hidden flex-col items-center gap-1.5 border-r border-border bg-background py-[18px] lg:flex"
        >
            <Link
                href={home()}
                aria-label="PRD.ai beranda"
                className="mb-[18px] rounded-md px-1 font-serif text-[28px] leading-none outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
                P<span className="text-brand italic">.</span>
            </Link>

            <RailTooltip label="PRD Generator">
                <Link
                    href={dashboard()}
                    aria-label="PRD Generator"
                    className={RAIL_ITEM_CLASS}
                >
                    <FileText className="size-5" strokeWidth={1.75} />
                </Link>
            </RailTooltip>

            <RailTooltip label="Design Studio">
                <Link
                    href={DesignController.index()}
                    aria-label="Design Studio"
                    aria-current="page"
                    className={cn(
                        RAIL_ITEM_CLASS,
                        'bg-secondary text-foreground hover:bg-secondary',
                    )}
                >
                    <PanelsTopLeft className="size-5" strokeWidth={1.75} />
                </Link>
            </RailTooltip>

            <RailTooltip label="Riwayat design">
                <button
                    type="button"
                    aria-label="Riwayat design"
                    aria-expanded={historyOpen}
                    aria-controls={HISTORY_DRAWER_ID}
                    onClick={onToggleHistory}
                    className={cn(
                        RAIL_ITEM_CLASS,
                        historyOpen && 'bg-accent text-foreground',
                    )}
                >
                    <History className="size-5" strokeWidth={1.75} />
                </button>
            </RailTooltip>

            <div className="flex-1" />

            <UserMenu user={user} nameClassName="hidden" />
        </nav>
    );
}

function RailTooltip({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
                {label}
            </TooltipContent>
        </Tooltip>
    );
}
