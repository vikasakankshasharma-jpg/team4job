"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, PlusCircle, Users, User, FileText, Search, TrendingUp, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";

interface MobileBottomNavProps {
    className?: string;
}

interface NavItem {
    href: string;
    icon: any;
    label: string;
    exact?: boolean;
    primary?: boolean;
}

export function MobileBottomNav({ className }: MobileBottomNavProps) {
    const pathname = usePathname();
    const { role } = useUser();

    const getNavItems = (): NavItem[] => {
        const commonItems: NavItem[] = [
            { href: "/dashboard", icon: Home, label: "Home", exact: true },
        ];

        if (role === 'Professional') {
            return [
                ...commonItems,
                { href: "/dashboard/jobs", icon: Search, label: "Browse" },
                { href: "/dashboard/my-bids", icon: FileText, label: "Bids" },
                { href: "/dashboard/profile", icon: User, label: "Profile" },
            ];
        }

        if (role === 'Client') {
            return [
                ...commonItems,
                { href: "/wizard", icon: PlusCircle, label: "Post", primary: true },
                { href: "/dashboard/posted-jobs", icon: Briefcase, label: "Jobs" },
                { href: "/dashboard/analytics", icon: TrendingUp, label: "Stats" },
            ];
        }

        if (role === 'Admin') {
            return [
                ...commonItems,
                { href: "/dashboard/users", icon: Users, label: "Users" },
                { href: "/dashboard/all-jobs", icon: Briefcase, label: "All Jobs" },
                { href: "/dashboard/reports", icon: FileText, label: "Reports" },
            ];
        }

        return [
            ...commonItems,
            { href: "/dashboard/profile", icon: User, label: "Profile" },
        ];
    };

    const navItems = getNavItems();

    const isActive = (href: string, exact?: boolean) => {
        if (exact) {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

    return (
        <nav
            className={cn(
                "sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]",
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
                                "active:bg-primary/5",
                                item.primary
                                    ? "text-primary"
                                    : active
                                        ? "text-primary"
                                        : "text-muted-foreground"
                            )}
                        >
                            <div
                                className={cn(
                                    "flex items-center justify-center rounded-xl transition-all",
                                    item.primary && "bg-primary text-primary-foreground p-2",
                                    !item.primary && active && "bg-primary/10 px-3 py-1"
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
