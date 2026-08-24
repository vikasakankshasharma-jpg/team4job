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
    Wallet,
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
import { motion, AnimatePresence } from "framer-motion";

type NavItem = {
    href: string;
    icon: React.ForwardRefExoticComponent<any>;
    labelKey: string; // Changed from 'label' to 'labelKey'
    tourId?: string;
    premium?: boolean;
};

const professionalNavItems: NavItem[] = [
    { href: "/dashboard", icon: Home, labelKey: "dashboard", tourId: "dashboard-home" },
    { href: "/dashboard/jobs", icon: Briefcase, labelKey: "browseJobs", tourId: "all-jobs" },
    { href: "/dashboard/my-bids", icon: FileText, labelKey: "myBids", tourId: "my-bids" },
    { href: "/dashboard/wallet", icon: Wallet, labelKey: "wallet" },
    { href: "/dashboard/billing", icon: CreditCard, labelKey: "billing" },
    { href: "/dashboard/disputes", icon: AlertOctagon, labelKey: "disputes" },
];

const clientNavItems: NavItem[] = [
    { href: "/dashboard", icon: Home, labelKey: "dashboard", tourId: "dashboard-home" },
    { href: "/dashboard/professionals", icon: Search, labelKey: "findProfessionals", tourId: "find-professionals", premium: true },
    { href: "/wizard", icon: PlusCircle, labelKey: "postJob", tourId: "post-job" },
    { href: "/dashboard/posted-jobs", icon: Briefcase, labelKey: "myJobs", tourId: "posted-jobs" },
    { href: "/dashboard/dealer-post-job", icon: PlusCircle, labelKey: "postDealerJob", tourId: "post-dealer-job" },
    { href: "/dashboard/dealer-jobs", icon: Briefcase, labelKey: "myDealerJobs", tourId: "my-dealer-jobs" },
    { href: "/dashboard/analytics", icon: TrendingUp, labelKey: "analytics", tourId: "analytics" },
    { href: "/dashboard/my-professionals", icon: Heart, labelKey: "myProfessionals", tourId: "my-professionals" },
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
    { href: "/dashboard/admin/disputes", icon: AlertOctagon, labelKey: "disputes" },
    { href: "/dashboard/audit-logs", icon: FileText, labelKey: "auditLog" },
    { href: "/dashboard/pending-signups", icon: UserPlus, labelKey: "pendingSignups" },
    { href: "/dashboard/signup-analytics", icon: TrendingUp, labelKey: "signupAnalytics" },
    { href: "/dashboard/admin/system-health", icon: Activity, labelKey: "systemHealth" },
    { href: "/dashboard/system-ops", icon: Zap, labelKey: "systemOps" },
];

const supportTeamNavItems: NavItem[] = [
    { href: "/dashboard", icon: Home, labelKey: "dashboard" },
    { href: "/dashboard/admin/disputes", icon: AlertOctagon, labelKey: "disputes" },
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
            case "Professional":
                return professionalNavItems;
            case "Client":
                return clientNavItems;
            default:
                return [];
        }
    };

    const navItems = getNavItems();

    return (
        <TooltipProvider>
            <nav className="flex flex-col items-center gap-6 px-3 sm:py-8">
                <Link
                    href="/dashboard"
                    className="group flex flex-col items-center justify-center gap-1 mb-4"
                >
                    <motion.div 
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                        className="flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-[1rem] bg-gradient-to-br from-primary to-primary/80 shadow-[0_10px_30px_rgba(var(--primary),0.3)] text-lg font-semibold text-primary-foreground md:h-10 md:w-10 ring-1 ring-white/10"
                    >
                        <Logo className="h-6 w-6" />
                    </motion.div>
                    <span className="text-[10px] font-black text-primary/70 uppercase tracking-[0.2em]">Beta</span>
                    <span className="sr-only">Team4Job</span>
                </Link>

                {navItems.map((item) => {
                    const linkPath = item.premium && !isSubscribed ? "/dashboard/billing" : item.href;
                    const label = tNav(item.labelKey as any);
                    const isActive = (pathname.startsWith(item.href) && item.href !== '/dashboard') || (pathname === '/dashboard' && item.href === '/dashboard');

                    return (
                        <Tooltip key={item.href}>
                            <TooltipTrigger asChild>
                                <Link
                                    href={linkPath}
                                    className={cn(
                                        "flex h-12 w-12 items-center justify-center rounded-[1.25rem] text-muted-foreground transition-all duration-500 hover:text-primary hover:bg-primary/5 md:h-10 md:w-10 relative group/nav",
                                        isActive && "bg-primary/15 text-primary shadow-inner ring-1 ring-primary/20"
                                    )}
                                    data-tour={item.tourId}
                                    data-testid={`nav-link-${item.labelKey}`}
                                >
                                    <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <item.icon className={cn("h-6 w-6 transition-transform", isActive && "scale-110")} />
                                    </motion.div>
                                    
                                    {isActive && (
                                        <motion.div 
                                            layoutId="activeNav"
                                            className="absolute -left-1 w-1 h-6 bg-primary rounded-full"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}

                                    {item.premium && !isSubscribed && (
                                        <Zap className="absolute -top-1 -right-1 h-4 w-4 fill-amber-400 text-amber-500 shadow-sm" />
                                    )}
                                    <span className="sr-only">{label}</span>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-black text-[10px] uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(0,0,0,0.2)] bg-surface-container-low/80 backdrop-blur-3xl text-foreground border-none ring-1 ring-white/10 rounded-[2rem] px-6 py-3 italic">{label}{item.premium && !isSubscribed && " (Upgrade)"}</TooltipContent>
                        </Tooltip>
                    );
                })}
            </nav>
            <nav className="mt-auto flex flex-col items-center gap-6 px-3 sm:py-8">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link
                            href="/dashboard/profile"
                            className={cn("flex h-12 w-12 items-center justify-center rounded-[1.25rem] text-muted-foreground transition-all duration-500 hover:text-primary hover:bg-primary/5 md:h-10 md:w-10 relative group/nav",
                                pathname.startsWith('/dashboard/profile') && "bg-primary/15 text-primary shadow-inner ring-1 ring-primary/20"
                            )}
                        >
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <UserIcon className={cn("h-6 w-6", pathname.startsWith('/dashboard/profile') && "scale-110")} />
                            </motion.div>
                            <span className="sr-only">{tNav('profile')}</span>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-black text-[10px] uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(0,0,0,0.2)] bg-surface-container-low/80 backdrop-blur-3xl text-foreground border-none ring-1 ring-white/10 rounded-[2rem] px-6 py-3 italic">{tNav('profile')}</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link
                            href="/dashboard/settings"
                            className={cn("flex h-12 w-12 items-center justify-center rounded-[1.25rem] text-muted-foreground transition-all duration-500 hover:text-primary hover:bg-primary/5 md:h-10 md:w-10 relative group/nav",
                                pathname.startsWith('/dashboard/settings') && 'bg-primary/15 text-primary shadow-inner ring-1 ring-primary/20'
                            )}
                        >
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Settings className={cn("h-6 w-6", pathname.startsWith('/dashboard/settings') && "scale-110")} />
                            </motion.div>
                            <span className="sr-only">{tNav('settings')}</span>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-black text-[10px] uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(0,0,0,0.2)] bg-surface-container-low/80 backdrop-blur-3xl text-foreground border-none ring-1 ring-white/10 rounded-[2rem] px-6 py-3 italic">{tNav('settings')}</TooltipContent>
                </Tooltip>

                <SupportDialog />
            </nav>
        </TooltipProvider>
    );
}
