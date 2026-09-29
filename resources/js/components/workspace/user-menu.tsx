import { ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import type { User } from '@/types';

/**
 * Avatar trigger + account dropdown shared by the PRD workspace and the
 * design studio. The PRD workspace additionally shows a chevron and exposes
 * a test hook; the design studio renders the bare trigger.
 */
export function UserMenu({
    user,
    showChevron = false,
    dataTest,
}: {
    user: User;
    showChevron?: boolean;
    dataTest?: string;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-2 px-1.5"
                    aria-label="Menu pengguna"
                    data-test={dataTest}
                >
                    <UserInfo user={user} />
                    {showChevron ? (
                        <ChevronsUpDown className="text-muted-foreground size-4" />
                    ) : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-56 rounded-lg"
                align="end"
                sideOffset={8}
            >
                <UserMenuContent user={user} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
