import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({
    items = [],
    label,
}: {
    items: NavItem[];
    label?: string;
}) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <SidebarGroup
            className={
                label
                    ? 'px-3 pt-4 pb-0 group-data-[collapsible=icon]:px-2'
                    : 'px-3 py-0 group-data-[collapsible=icon]:px-2'
            }
        >
            {label && (
                <SidebarGroupLabel className="px-2.5 label-mono text-[11px] font-normal text-muted-foreground">
                    {label}
                </SidebarGroupLabel>
            )}
            <SidebarMenu className="gap-0.5">
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={isCurrentUrl(item.href)}
                            tooltip={{ children: item.title }}
                            className="h-10 gap-2.5 px-2.5 text-muted-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground [&>svg]:size-[18px]"
                        >
                            <Link href={item.href} prefetch>
                                {item.icon && (
                                    <item.icon
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                    />
                                )}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
