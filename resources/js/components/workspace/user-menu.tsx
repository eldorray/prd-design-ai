import { ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

/**
 * Avatar trigger + account dropdown shared by the PRD workspace and the
 * design studio. The PRD workspace additionally shows a chevron and exposes
 * a test hook; the design studio renders the bare trigger.
 *
 * `variant="rail"` is the full-width row pinned to the bottom of a left
 * rail: it shows the email too and opens the menu upwards.
 * `nameClassName` hides the name column where only the avatar fits.
 */
export function UserMenu({
    user,
    showChevron = false,
    dataTest,
    variant = 'compact',
    className,
    nameClassName,
}: {
    user: User;
    showChevron?: boolean;
    dataTest?: string;
    variant?: 'compact' | 'rail';
    className?: string;
    nameClassName?: string;
}) {
    const isRail = variant === 'rail';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                        isRail
                            ? 'h-auto w-full justify-start gap-2.5 px-2 py-1.5'
                            : 'h-9 gap-2 px-1.5',
                        className,
                    )}
                    aria-label="Menu pengguna"
                    data-test={dataTest}
                >
                    <UserInfo
                        user={user}
                        showEmail={isRail}
                        nameClassName={nameClassName}
                    />
                    {showChevron ? (
                        <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                    ) : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-56 rounded-lg"
                align={isRail ? 'start' : 'end'}
                side={isRail ? 'top' : 'bottom'}
                sideOffset={8}
            >
                <UserMenuContent user={user} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
