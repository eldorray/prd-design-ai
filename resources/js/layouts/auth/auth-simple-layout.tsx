import { Link } from '@inertiajs/react';
import AppLogo from '@/components/app-logo';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 text-foreground md:p-10">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-6">
                        <Link
                            href={home()}
                            className="flex items-center gap-1.5 text-foreground"
                        >
                            <AppLogo />
                            <span className="sr-only">{title}</span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="font-serif text-4xl leading-tight font-normal tracking-[-0.01em] text-balance text-foreground">
                                {title}
                            </h1>
                            <p className="text-center text-sm text-balance text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
