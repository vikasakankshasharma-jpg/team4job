"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, PlusCircle, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
    className?: string;
}

export function MobileBottomNav({ className }: MobileBottomNavProps) {
    const pathname = usePathname();

    const navItems = [
        {
            href: "/dashboard",
            icon: Home,
            label: "Home",
            exact: true,
        },
        {
            href: "/dashboard/posted-jobs",
            icon: Briefcase,
            label: "Jobs",
        },
        {
            href: "/dashboard/post-job",
            icon: PlusCircle,
            label: "Post",
            primary: true,
        },
        {
            href: "/dashboard/installers",
            icon: Users,
            label: "Find",
        },
        {
            href: "/dashboard/profile",
            icon: User,
            label: "Profile",
        },
    ];

    const isActive = (href: string, exact?: boolean) => {
        if (exact) {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

    return (
        <nav
            className={cn(
                "md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-inset-bottom",
                className
            )}
        >
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href, item.exact);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-0 transition-colors",
                                "active:bg-accent",
                                item.primary
                                    ? "text-primary"
                                    : active
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                            )}
                        >
                            <div
                                className={cn(
                                    "flex items-center justify-center rounded-lg transition-all",
                                    item.primary && "bg-primary text-primary-foreground p-2",
                                    !item.primary && active && "bg-accent"
                                )}
                            >
                                <Icon
                                    className={cn(
                                        "h-5 w-5",
                                        item.primary && "h-6 w-6"
                                    )}
                                />
                            </div>
                            <span
                                className={cn(
                                    "text-xs font-medium truncate",
                                    active && "font-semibold"
                                )}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
