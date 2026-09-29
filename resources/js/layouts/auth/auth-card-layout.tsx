import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import AppLogo from '@/components/app-logo';
import { home } from '@/routes';

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 text-foreground md:p-10">
            <div className="flex w-full max-w-md flex-col gap-6">
                <Link
                    href={home()}
                    className="flex items-center gap-1.5 self-center text-foreground"
                >
                    <AppLogo />
                </Link>

                <div className="flex flex-col gap-8 rounded-xl border border-border bg-card px-10 py-8">
                    <div className="flex flex-col gap-2 text-center">
                        <h1 className="font-serif text-4xl leading-tight font-normal tracking-[-0.01em]">
                            {title}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    <div>{children}</div>
                </div>
            </div>
        </div>
    );
}
