import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { dashboard } from '@/routes';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profil',
        href: edit(),
        icon: null,
    },
    {
        title: 'Keamanan',
        href: editSecurity(),
        icon: null,
    },
    {
        title: 'Tampilan',
        href: editAppearance(),
        icon: null,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="bg-background text-foreground flex min-h-screen flex-col font-sans antialiased">
            {/* Header */}
            <header className="border-border flex items-center justify-between border-b px-6 py-4 md:px-16 lg:px-24">
                <Link
                    href={dashboard()}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
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
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                    </svg>
                    <span>Kembali</span>
                </Link>
                <h2 className="text-foreground text-sm font-medium">
                    Pengaturan
                </h2>
                <div className="w-16" />
            </header>

            {/* Main Content */}
            <main className="flex w-full flex-1 flex-col gap-10 px-6 py-10 md:flex-row md:px-16 lg:px-24">
                {/* Sidebar */}
                <aside className="w-full shrink-0 md:w-48">
                    <nav className="flex flex-col gap-1" aria-label="Settings">
                        {sidebarNavItems.map((item, index) => (
                            <Link
                                key={`${toUrl(item.href)}-${index}`}
                                href={item.href}
                                className={cn(
                                    'rounded-lg px-3 py-2 text-sm transition-colors',
                                    isCurrentOrParentUrl(item.href)
                                        ? 'bg-secondary text-foreground font-medium'
                                        : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                                )}
                            >
                                {item.title}
                            </Link>
                        ))}
                    </nav>
                </aside>

                {/* Content */}
                <div className="flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">
                        {children}
                    </section>
                </div>
            </main>
        </div>
    );
}
