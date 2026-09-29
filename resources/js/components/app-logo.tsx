import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <AppLogoIcon className="size-6 fill-current" />
            </div>
            <span className="ml-1 truncate font-serif text-2xl leading-none">
                PRD<span className="text-brand italic">.ai</span>
            </span>
        </>
    );
}
