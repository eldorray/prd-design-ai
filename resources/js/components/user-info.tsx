import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
    nameClassName,
}: {
    user: User;
    showEmail?: boolean;
    nameClassName?: string;
}) {
    const getInitials = useInitials();

    return (
        <>
            <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-full bg-foreground text-xs font-semibold text-background">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div
                className={cn(
                    'grid flex-1 text-left leading-tight',
                    nameClassName,
                )}
            >
                <span className="truncate text-[13px] font-medium">
                    {user.name}
                </span>
                {showEmail && (
                    <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                    </span>
                )}
            </div>
        </>
    );
}
