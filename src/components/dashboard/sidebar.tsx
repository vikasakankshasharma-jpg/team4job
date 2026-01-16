
"use client";

import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
} from "lucide-react";
import { Logo } from "@/components/icons";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { toDate } from "@/lib/utils";

type NavItem = {
  href: string;
  icon: React.ForwardRefExoticComponent<any>;
  label: string;
  tourId?: string;
  premium?: boolean;
};

const installerNavItems: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "Dashboard", tourId: "dashboard-home" },
  { href: "/dashboard/jobs", icon: Briefcase, label: "Browse Jobs", tourId: "all-jobs" },
  { href: "/dashboard/my-bids", icon: FileText, label: "My Bids", tourId: "my-bids" },
  { href: "/dashboard/billing", icon: CreditCard, label: "Subscription" },
  { href: "/dashboard/disputes", icon: AlertOctagon, label: "Disputes" },
];

const jobGiverNavItems: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "Dashboard", tourId: "dashboard-home" },
  { href: "/dashboard/installers", icon: Search, label: "Find Installers", tourId: "find-installers", premium: true },
  { href: "/dashboard/post-job", icon: PlusCircle, label: "Post a Job", tourId: "post-job" },
  { href: "/dashboard/posted-jobs", icon: Briefcase, label: "My Jobs", tourId: "posted-jobs" },
  { href: "/dashboard/analytics", icon: TrendingUp, label: "Analytics", tourId: "analytics" },
  { href: "/dashboard/my-installers", icon: Heart, label: "My Installers", tourId: "my-installers" },
  { href: "/dashboard/billing", icon: CreditCard, label: "Subscription" },
  { href: "/dashboard/disputes", icon: AlertOctagon, label: "Disputes" },
];

const adminNavItems: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/dashboard/reports", icon: FileText, label: "Reports" },
  { href: "/dashboard/users", icon: UsersIcon, label: "Users" },
  { href: "/dashboard/team", icon: UserCog, label: "Team Management" },
  { href: "/dashboard/all-jobs", icon: Briefcase, label: "All Jobs" },
  { href: "/dashboard/transactions", icon: IndianRupee, label: "Transactions" },
  { href: "/dashboard/disputes", icon: AlertOctagon, label: "Disputes" },
  { href: "/dashboard/audit-logs", icon: FileText, label: "Audit Log" },
  { href: "/dashboard/pending-signups", icon: UserPlus, label: "Pending Signups" },
  { href: "/dashboard/signup-analytics", icon: TrendingUp, label: "Signup Analytics" },
];

const supportTeamNavItems: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/dashboard/disputes", icon: AlertOctagon, label: "Disputes" },
  { href: "/dashboard/users", icon: UsersIcon, label: "Users" },
  { href: "/dashboard/all-jobs", icon: Briefcase, label: "All Jobs" },
  { href: "/dashboard/transactions", icon: IndianRupee, label: "Transactions" },
];


export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, role } = useUser();

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
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex" data-tour="sidebar-header">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="/dashboard"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Logo className="h-5 w-5 transition-all group-hover:scale-110" />
            <span className="sr-only">CCTV Job Connect</span>
          </Link>

          {navItems.map((item) => {
            const linkPath = item.premium && !isSubscribed ? "/dashboard/billing" : item.href;
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
                  >
                    <item.icon className="h-5 w-5" />
                    {item.premium && !isSubscribed && (
                      <Zap className="absolute -bottom-1 -right-1 h-4 w-4 fill-amber-400 text-amber-500" />
                    )}
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}{item.premium && !isSubscribed && " (Upgrade)"}</TooltipContent>
              </Tooltip>
            )
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
                <span className="sr-only">Profile</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Profile</TooltipContent>
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
                <span className="sr-only">Settings</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="mailto:support@cctvjobconnect.com"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
              >
                <Heart className="h-5 w-5" />
                <span className="sr-only">Support</span>
              </a>
            </TooltipTrigger>
            <TooltipContent side="right">Contact Support</TooltipContent>
          </Tooltip>
        </nav>
      </TooltipProvider>
    </aside>
  );
}
