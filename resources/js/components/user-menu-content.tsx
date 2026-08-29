import { Link, router } from '@inertiajs/react';
import {
    FileText,
    LayoutTemplate,
    LogOut,
    Settings,
    Shield,
} from 'lucide-react';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { dashboard, logout } from '@/routes';
import { index as designIndex } from '@/routes/design';
import { edit } from '@/routes/profile';
import type { User } from '@/types';

type Props = {
    user: User;
};

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full cursor-pointer"
                        href={dashboard()}
                        onClick={cleanup}
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        PRD Generator
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full cursor-pointer"
                        href={designIndex()}
                        onClick={cleanup}
                    >
                        <LayoutTemplate className="mr-2 h-4 w-4" />
                        Design Studio
                    </Link>
                </DropdownMenuItem>
                {user.role === 'admin' && (
                    <DropdownMenuItem asChild>
                        <Link
                            className="block w-full cursor-pointer"
                            href="/admin/dashboard"
                            onClick={cleanup}
                        >
                            <Shield className="mr-2 h-4 w-4 text-amber-500" />
                            Admin Dashboard
                        </Link>
                    </DropdownMenuItem>
                )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full cursor-pointer"
                        href={edit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <Settings className="mr-2" />
                        Settings
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link
                    className="block w-full cursor-pointer"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut className="mr-2" />
                    Log out
                </Link>
            </DropdownMenuItem>
        </>
    );
}
