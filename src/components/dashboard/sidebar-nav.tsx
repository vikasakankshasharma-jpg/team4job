"use client";

import Link from "next/link";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { buttonVariants } from "@/components/ui/button";
import { SupportDialog } from "./support-dialog";
import {
    Home,
    Briefcase,
    Search,
    PlusCircle,
    Settings,
    User as UserIcon,
    Users as UsersIcon,
    FileText,
    AlertOctagon,
    IndianRupee,
    UserCog,
    CreditCard,
    Heart,
    Zap,
    UserPlus,
    TrendingUp,
    Activity,
} from "lucide-react";
import { Logo } from "@/components/icons";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { toDate } from "@/lib/utils";
import { useTranslations } from 'next-intl';

type NavItem = {
    href: string;
    icon: React.ForwardRefExoticComponent<any>;
    labelKey: string; // Changed from 'label' to 'labelKey'
    tourId?: string;
    premium?: boolean;
};

const installerNavItems: NavItem[] = [
    { href: "/dashboard", icon: Home, labelKey: "dashboard", tourId: "dashboard-home" },
    { href: "/dashboard/jobs", icon: Briefcase, labelKey: "browseJobs", tourId: "all-jobs" },
    { href: "/dashboard/my-bids", icon: FileText, labelKey: "myBids", tourId: "my-bids" },
    { href: "/dashboard/billing", icon: CreditCard, labelKey: "billing" },
    { href: "/dashboard/disputes", icon: AlertOctagon, labelKey: "disputes" },
];

const jobGiverNavItems: NavItem[] = [
    { href: "/dashboard", icon: Home, labelKey: "dashboard", tourId: "dashboard-home" },
    { href: "/dashboard/installers", icon: Search, labelKey: "findInstallers", tourId: "find-installers", premium: true },
    { href: "/dashboard/post-job", icon: PlusCircle, labelKey: "postJob", tourId: "post-job" },
    { href: "/dashboard/posted-jobs", icon: Briefcase, labelKey: "myJobs", tourId: "posted-jobs" },
    { href: "/dashboard/analytics", icon: TrendingUp, labelKey: "analytics", tourId: "analytics" },
    { href: "/dashboard/my-installers", icon: Heart, labelKey: "myInstallers", tourId: "my-installers" },
    { href: "/dashboard/billing", icon: CreditCard, labelKey: "billing" },
    { href: "/dashboard/disputes", icon: AlertOctagon, labelKey: "disputes" },
];

const adminNavItems: NavItem[] = [
    { href: "/dashboard", icon: Home, labelKey: "dashboard" },
    { href: "/dashboard/reports", icon: FileText, labelKey: "reports" },
    { href: "/dashboard/users", icon: UsersIcon, labelKey: "users" },
    { href: "/dashboard/team", icon: UserCog, labelKey: "teamManagement" },
    { href: "/dashboard/all-jobs", icon: Briefcase, labelKey: "allJobs" },
    { href: "/dashboard/transactions", icon: IndianRupee, labelKey: "transactions" },
    { href: "/dashboard/disputes", icon: AlertOctagon, labelKey: "disputes" },
    { href: "/dashboard/audit-logs", icon: FileText, labelKey: "auditLog" },
    { href: "/dashboard/pending-signups", icon: UserPlus, labelKey: "pendingSignups" },
    { href: "/dashboard/signup-analytics", icon: TrendingUp, labelKey: "signupAnalytics" },
    { href: "/dashboard/admin/system-health", icon: Activity, labelKey: "systemHealth" },
];

const supportTeamNavItems: NavItem[] = [
    { href: "/dashboard", icon: Home, labelKey: "dashboard" },
    { href: "/dashboard/disputes", icon: AlertOctagon, labelKey: "disputes" },
    { href: "/dashboard/users", icon: UsersIcon, labelKey: "users" },
    { href: "/dashboard/all-jobs", icon: Briefcase, labelKey: "allJobs" },
    { href: "/dashboard/transactions", icon: IndianRupee, labelKey: "transactions" },
];


export function SidebarNav() {
    const pathname = usePathname();
    const { user, role } = useUser();
    const tNav = useTranslations('nav');
    const tCommon = useTranslations('common');

    const isSubscribed = user?.subscription && toDate(user.subscription.expiresAt) > new Date();

    const getNavItems = () => {
        switch (role) {
            case "Admin":
                return adminNavItems;
            case "Support Team":
                return supportTeamNavItems;
            case "Installer":
                return installerNavItems;
            case "Job Giver":
                return jobGiverNavItems;
            default:
                return [];
        }
    };

    const navItems = getNavItems();

    return (
        <TooltipProvider>
            <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
                <Link
                    href="/dashboard"
                    className="group flex flex-col items-center justify-center gap-0.5"
                >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base">
                        <Logo className="h-5 w-5 transition-all group-hover:scale-110" />
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Beta</span>
                    <span className="sr-only">CCTV Job Connect</span>
                </Link>

                {navItems.map((item) => {
                    const linkPath = item.premium && !isSubscribed ? "/dashboard/billing" : item.href;
                    const label = tNav(item.labelKey as any);

                    return (
                        <Tooltip key={item.href}>
                            <TooltipTrigger asChild>
                                <Link
                                    href={linkPath}
                                    className={cn(
                                        "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8 relative",
                                        pathname.startsWith(item.href) && item.href !== '/dashboard' && "bg-accent text-accent-foreground",
                                        pathname === '/dashboard' && item.href === '/dashboard' && "bg-accent text-accent-foreground"
                                    )}
                                    data-tour={item.tourId}
                                    data-testid={`nav-link-${item.labelKey}`}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.premium && !isSubscribed && (
                                        <Zap className="absolute -bottom-1 -right-1 h-4 w-4 fill-amber-400 text-amber-500" />
                                    )}
                                    <span className="sr-only">{label}</span>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right">{label}{item.premium && !isSubscribed && " (Upgrade)"}</TooltipContent>
                        </Tooltip>
                    );
                })}
            </nav>
            <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link
                            href="/dashboard/profile"
                            className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                                pathname.startsWith('/dashboard/profile') && "bg-accent text-accent-foreground"
                            )}
                        >
                            <UserIcon className="h-5 w-5" />
                            <span className="sr-only">{tNav('profile')}</span>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{tNav('profile')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link
                            href="/dashboard/settings"
                            className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                                pathname.startsWith('/dashboard/settings') && 'bg-accent text-accent-foreground'
                            )}
                        >
                            <Settings className="h-5 w-5" />
                            <span className="sr-only">{tNav('settings')}</span>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{tNav('settings')}</TooltipContent>
                </Tooltip>

                <SupportDialog />
            </nav>
        </TooltipProvider>
    );
}
