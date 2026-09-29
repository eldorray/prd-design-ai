import { Link, usePage } from '@inertiajs/react';
import { FileText, LayoutTemplate, Settings, Shield } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'PRD Generator',
        href: dashboard(),
        icon: FileText,
    },
    {
        title: 'Design Studio',
        href: '/design',
        icon: LayoutTemplate,
    },
];

const adminNavItems: NavItem[] = [
    {
        title: 'Admin Dashboard',
        href: '/admin/dashboard',
        icon: Shield,
    },
    {
        title: 'Pengaturan AI',
        href: '/admin/ai',
        icon: Settings,
    },
];

export function AppSidebar() {
    const { auth } = usePage().props;
    const userRole = (auth as any).user?.role;

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader className="px-3 pt-5 pb-3 group-data-[collapsible=icon]:px-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="hover:bg-transparent active:bg-transparent"
                        >
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
                {userRole === 'admin' && (
                    <NavMain items={adminNavItems} label="Admin" />
                )}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border px-3 py-3 group-data-[collapsible=icon]:px-2">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
