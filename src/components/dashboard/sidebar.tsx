
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
  Ticket,
  Ban,
} from "lucide-react";
import { Logo } from "@/components/icons";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";

const installerNavItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard", tourId: "dashboard-home" },
  { href: "/dashboard/jobs", icon: Search, label: "Browse Jobs", tourId: "all-jobs" },
  { href: "/dashboard/my-bids", icon: Briefcase, label: "My Bids", tourId: "my-bids" },
  { href: "/dashboard/billing", icon: CreditCard, label: "Subscription" },
  { href: "/dashboard/disputes", icon: AlertOctagon, label: "Disputes" },
];

const jobGiverNavItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard", tourId: "dashboard-home" },
  { href: "/dashboard/post-job", icon: PlusCircle, label: "Post a Job", tourId: "post-job" },
  { href: "/dashboard/posted-jobs", icon: Briefcase, label: "My Jobs", tourId: "posted-jobs" },
  { href: "/dashboard/billing", icon: CreditCard, label: "Subscription" },
  { href: "/dashboard/disputes", icon: AlertOctagon, label: "Disputes" },
];

const adminNavItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/dashboard/reports", icon: FileText, label: "Reports" },
    { href: "/dashboard/users", icon: UsersIcon, label: "Users" },
    { href: "/dashboard/team", icon: UserCog, label: "Team Management" },
    { href: "/dashboard/all-jobs", icon: Briefcase, label: "All Jobs" },
    { href: "/dashboard/transactions", icon: IndianRupee, label: "Transactions" },
    { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

const supportTeamNavItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/dashboard/disputes", icon: AlertOctagon, label: "Disputes" },
];


export function DashboardSidebar() {
  const pathname = usePathname();
  const { role } = useUser();

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

          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                    pathname.startsWith(item.href) && item.href !== '/dashboard' && "bg-accent text-accent-foreground",
                    pathname === '/dashboard' && item.href === '/dashboard' && "bg-accent text-accent-foreground"
                  )}
                  data-tour={item.tourId}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
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
        </nav>
      </TooltipProvider>
    </aside>
  );
}
