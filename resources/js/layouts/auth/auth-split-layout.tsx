import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="relative grid h-dvh flex-col items-center justify-center bg-background px-8 text-foreground sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-foreground p-10 text-background lg:flex">
                <Link
                    href={home()}
                    className="relative z-20 flex items-center font-serif text-3xl leading-none"
                >
                    <AppLogoIcon className="mr-2 size-9 fill-current" />
                    {name}
                </Link>
            </div>
            <div className="w-full lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px]">
                    <Link
                        href={home()}
                        className="relative z-20 flex items-center justify-center text-foreground lg:hidden"
                    >
                        <AppLogoIcon className="h-10 fill-current sm:h-12" />
                    </Link>
                    <div className="flex flex-col items-start gap-2 text-left sm:items-center sm:text-center">
                        <h1 className="font-serif text-4xl leading-tight font-normal tracking-[-0.01em]">
                            {title}
                        </h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
