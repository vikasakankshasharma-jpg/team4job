"use client";

import Link from "next/link";
import {
    PanelLeft,
    Search,
    Home,
    Briefcase,
    PlusCircle,
    Settings,
    Users as UsersIcon,
    User as UserIcon,
    HelpCircle,
    FileText,
    AlertOctagon,
    UserCog,
    IndianRupee,
    Crown,
    LogOut,
} from "lucide-react";
import * as React from "react";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { UserNav } from "@/components/user-nav";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "../theme-toggle";
import { LanguageToggle } from "../layout/language-toggle";
import { HelpDialog } from "../help-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useSearch } from "@/hooks/use-search";
import { Badge } from "../ui/badge";
import { toDate } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useTranslations } from "next-intl";

export function HeaderClient() {
    const pathname = usePathname();
    const { user, role, logout } = useUser();
    const { searchQuery, setSearchQuery } = useSearch();
    const [isSheetOpen, setIsSheetOpen] = React.useState(false);
    const t = useTranslations('nav');
    const dashT = useTranslations('dashboard');

    const getNavItems = () => {
        const ProfessionalNavItems = [
            { href: "/dashboard", icon: Home, label: t('dashboard') },
            { href: "/dashboard/jobs", icon: Search, label: t('browseJobs') },
            { href: "/dashboard/my-bids", icon: Briefcase, label: t('myBids') },
            { href: "/dashboard/disputes", icon: AlertOctagon, label: t('disputes') },
        ];

        const clientNavItems = [
            { href: "/dashboard", icon: Home, label: t('dashboard') },
            { href: "/wizard", icon: PlusCircle, label: t('postJob') },
            { href: "/dashboard/posted-jobs", icon: Briefcase, label: t('myJobs') },
            { href: "/dashboard/disputes", icon: AlertOctagon, label: t('disputes') },
        ];

        const adminNavItems = [
            { href: "/dashboard", icon: Home, label: t('dashboard') },
            { href: "/dashboard/reports", icon: FileText, label: t('reports') },
            { href: "/dashboard/users", icon: UsersIcon, label: t('users') },
            { href: "/dashboard/team", icon: UserCog, label: t('team') },
            { href: "/dashboard/all-jobs", icon: Briefcase, label: t('allJobs') },
            { href: "/dashboard/transactions", icon: IndianRupee, label: t('transactions') },
            { href: "/dashboard/disputes", icon: AlertOctagon, label: t('disputes') },
        ];

        const supportTeamNavItems = [
            { href: "/dashboard", icon: Home, label: t('dashboard') },
            { href: "/dashboard/disputes", icon: AlertOctagon, label: t('disputes') },
        ];

        switch (role) {
            case "Admin":
                return adminNavItems;
            case "Support Team":
                return supportTeamNavItems;
            case "Professional":
                return ProfessionalNavItems;
            case "Client":
                return clientNavItems;
            default:
                return [];
        }
    };

    const navItems = getNavItems();
    const breadcrumbSegments = pathname.split('/').filter(Boolean);

    const handleLogout = () => {
        setIsSheetOpen(false);
        logout();
    };

    const renderBreadcrumbs = () => {
        // This logic can become complex. For now, a simplified version.
        return breadcrumbSegments.slice(1).map((segment, index) => {
            // Stop rendering after a dynamic ID segment for cleaner breadcrumbs
            if (breadcrumbSegments.length > 2 && index > 0) {
                if (index === 1 && segment.length > 20) return null; // Likely a firestore ID
                if (index > 1) return null;
            }
            return (
                <React.Fragment key={segment}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        {index === breadcrumbSegments.length - 2 ? (
                            <BreadcrumbPage className="capitalize">{segment.replace('-', ' ')}</BreadcrumbPage>
                        ) : (
                            <BreadcrumbLink asChild>
                                <Link href={`/${breadcrumbSegments.slice(0, index + 2).join('/')}`} className="capitalize">{segment.replace('-', ' ')}</Link>
                            </BreadcrumbLink>
                        )}
                    </BreadcrumbItem>
                </React.Fragment>
            )
        })
    }

    const renderContextualActions = () => {
        if (role === 'Client') {
            return (
                <Button size="sm" className="h-8 gap-1 rounded-full shadow-sm" asChild data-testid="dashboard-post-job-btn">
                    <Link href="/wizard">
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                            {t('postJob')}
                        </span>
                    </Link>
                </Button>
            );
        }
        if (role === 'Professional') {
            return (
                <Button size="sm" className="h-8 gap-1 rounded-full shadow-sm" asChild>
                    <Link href="/dashboard/jobs">
                        <Search className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                            {t('browseJobs')}
                        </span>
                    </Link>
                </Button>
            );
        }
        return null;
    }

    const daysLeft = user?.subscription?.expiresAt ? differenceInDays(toDate(user.subscription.expiresAt), new Date()) : 0;
    const isTeamMember = role === 'Admin' || role === 'Support Team';

    return (
        <>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    <Button size="icon" variant="outline" className="sm:hidden" suppressHydrationWarning>
                        <PanelLeft className="h-5 w-5" />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="sm:max-w-xs">
                    <SheetTitle>
                        <VisuallyHidden>Mobile Navigation Menu</VisuallyHidden>
                    </SheetTitle>
                    <nav className="grid gap-6 text-lg font-medium">
                        <Link
                            href="#"
                            className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
                            onClick={() => setIsSheetOpen(false)}
                        >
                            <Briefcase className="h-5 w-5 transition-all group-hover:scale-110" />
                            <span className="sr-only">Team4Job</span>
                        </Link>
                        {navItems.map(item => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn("flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground",
                                    pathname === item.href && "text-foreground"
                                )}
                                onClick={() => setIsSheetOpen(false)}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        ))}
                        <Link
                            href="/dashboard/profile"
                            className={cn("flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground",
                                pathname === '/dashboard/profile' && "text-foreground"
                            )}
                            onClick={() => setIsSheetOpen(false)}
                        >
                            <UserIcon className="h-5 w-5" />
                            {t('profile')}
                        </Link>
                        <Link
                            href="/dashboard/settings"
                            className={cn("flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground",
                                pathname.startsWith('/dashboard/settings') && "text-foreground"
                            )}
                            onClick={() => setIsSheetOpen(false)}
                        >
                            <Settings className="h-5 w-5" />
                            {t('settings')}
                        </Link>
                        {/* Utilities moved here from header for mobile */}
                        <div className="border-t pt-4 mt-2 flex flex-col gap-4">
                            <div className="flex items-center gap-4 px-2.5">
                                <LanguageToggle />
                            </div>
                            <div className="flex items-center gap-4 px-2.5">
                                <ThemeToggle />
                                <span className="text-muted-foreground">Theme</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-5 w-5" />
                            {t('logout')}
                        </button>
                    </nav>
                </SheetContent>
            </Sheet>
            <Breadcrumb className="hidden md:flex">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="/dashboard">{t('dashboard')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    {renderBreadcrumbs()}
                </BreadcrumbList>
            </Breadcrumb>
            <div className="flex w-full flex-1 items-center justify-end gap-2 overflow-hidden md:ml-auto md:w-auto md:flex-grow-0 md:gap-4 md:overflow-visible">
                {/* Subscription Status Indicator - Systematic Design */}
                {user?.subscription?.planId === 'trial' && daysLeft > 0 && !isTeamMember && (
                    <Link href="/dashboard/billing">
                        <Badge variant="outline" className="gap-2 h-8 px-3 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer">
                            <Crown className="h-3.5 w-3.5" />
                            <span className="font-medium">Trial: {daysLeft} Days Left</span>
                        </Badge>
                    </Link>
                )}
                {pathname.startsWith('/dashboard/users') || pathname.startsWith('/dashboard/jobs') || pathname.startsWith('/dashboard/all-jobs') ? (
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search..."
                            className="w-full rounded-full bg-muted/50 border-transparent focus:bg-background transition-all duration-300 pl-8 md:w-[200px] lg:w-[336px]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            data-testid="search-input"
                        />
                    </div>
                ) : <div className="hidden md:block md:flex-grow"></div>}

                <div className="hidden md:flex items-center mr-2">
                    {role === 'Client' ? (
                        <Badge variant="outline" className="gap-1 border-primary/20 bg-primary/5 text-primary">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            {dashT('roleHiring')}
                        </Badge>
                    ) : role === 'Professional' ? (
                        <Badge variant="outline" className="gap-1 border-blue-500/20 bg-blue-500/5 text-blue-600">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            {dashT('roleService')}
                        </Badge>
                    ) : role === 'Admin' ? (
                        <Badge variant="destructive" className="gap-1">
                            {dashT('roleAdmin')}
                        </Badge>
                    ) : null}
                </div>
                {/* Only show contextual action when search input is not visible (avoids redundancy on Browse Jobs page) */}
                {!(pathname.startsWith('/dashboard/users') || pathname.startsWith('/dashboard/jobs') || pathname.startsWith('/dashboard/all-jobs')) && renderContextualActions()}
                <HelpDialog>
                    <Button
                        variant="ghost"
                        size="icon"
                        suppressHydrationWarning
                        className="hidden md:inline-flex rounded-full h-9 w-9 bg-background/60 backdrop-blur-sm border border-border/40 shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                    >
                        <HelpCircle className="h-5 w-5" />
                        <span className="sr-only">Help</span>
                    </Button>
                </HelpDialog>
                <div className="hidden md:block">
                    <LanguageToggle />
                </div>
                <div className="hidden md:block">
                    <ThemeToggle />
                </div>
                <NotificationBell />
                <UserNav />
            </div>
        </>
    );
}
