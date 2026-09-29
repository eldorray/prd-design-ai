import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
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
        <div className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
            {/* Header */}
            <header className="flex h-14 items-center justify-between border-b border-border px-6 md:px-16 lg:px-24">
                <Link
                    href={dashboard()}
                    className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft
                        className="size-4"
                        strokeWidth={1.75}
                        aria-hidden="true"
                    />
                    <span>Kembali</span>
                </Link>
                <h2 className="label-mono">Pengaturan</h2>
                <div className="w-16" />
            </header>

            {/* Main Content */}
            <main className="flex w-full flex-1 flex-col gap-10 px-6 py-10 md:flex-row md:px-16 lg:px-24">
                {/* Sidebar */}
                <aside className="w-full shrink-0 md:w-48">
                    <nav
                        className="flex flex-col gap-0.5"
                        aria-label="Settings"
                    >
                        {sidebarNavItems.map((item, index) => (
                            <Link
                                key={`${toUrl(item.href)}-${index}`}
                                href={item.href}
                                className={cn(
                                    'flex h-10 items-center rounded-lg px-2.5 text-sm transition-colors',
                                    isCurrentOrParentUrl(item.href)
                                        ? 'bg-secondary font-medium text-foreground'
                                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
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
