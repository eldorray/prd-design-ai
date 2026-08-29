import { Link, usePage } from '@inertiajs/react';
import { useInitials } from '@/hooks/use-initials';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

export function PortfolioSidebar() {
    const { auth } = usePage<PageProps>().props;
    const getInitials = useInitials();

    return (
        <aside className="flex w-full shrink-0 flex-col gap-10 md:w-56">
            {/* User Avatar & Name */}
            <div className="flex items-center gap-3">
                <div className="bg-secondary text-foreground flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold">
                    {getInitials(auth.user?.name ?? 'U')}
                </div>
                <div>
                    <h1 className="text-foreground text-lg font-bold tracking-tight">
                        {auth.user?.name ?? 'User'}
                    </h1>
                    <p className="text-muted-foreground text-[11px]">
                        {auth.user?.email ?? ''}
                    </p>
                </div>
            </div>

            {/* Navigasi: MENU */}
            <div className="space-y-4">
                <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-[0.2em]">
                    Menu
                </span>
                <nav className="flex flex-col gap-2.5 text-sm">
                    <Link
                        href="/dashboard"
                        className="text-muted-foreground hover:text-foreground group flex items-center gap-3 transition-colors"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                        </svg>
                        <span>Dashboard</span>
                    </Link>
                    <Link
                        href="/dashboard"
                        className="text-muted-foreground hover:text-foreground group flex items-center gap-3 transition-colors"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                        </svg>
                        <span>Aboit</span>
                    </Link>
                </nav>
            </div>

            {/* Navigasi: AKUN */}
            <div className="border-border mt-auto space-y-4 border-t pt-6">
                <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-[0.2em]">
                    Akun
                </span>
                <nav className="flex flex-col gap-2.5 text-sm">
                    <Link
                        href={edit()}
                        className="text-muted-foreground hover:text-foreground group flex items-center gap-3 transition-colors"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                        <span>Pengaturan</span>
                    </Link>
                    <Link
                        href={editSecurity()}
                        className="text-muted-foreground hover:text-foreground group flex items-center gap-3 transition-colors"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                        <span>Keamanan</span>
                    </Link>
                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="text-muted-foreground hover:text-destructive-foreground group flex items-center gap-3 transition-colors"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                        </svg>
                        <span>Keluar</span>
                    </Link>
                </nav>
            </div>
        </aside>
    );
}
