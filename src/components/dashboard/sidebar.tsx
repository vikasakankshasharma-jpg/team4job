
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
} from "lucide-react";
import { Logo } from "@/components/icons";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";

const installerNavItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/dashboard/jobs", icon: Search, label: "Browse Jobs" },
  { href: "/dashboard/my-bids", icon: Briefcase, label: "My Bids" },
  { href: "/dashboard/profile", icon: UserIcon, label: "Profile" },
];

const jobGiverNavItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/dashboard/post-job", icon: PlusCircle, label: "Post a Job" },
  { href: "/dashboard/posted-jobs", icon: Briefcase, label: "My Jobs" },
  { href: "/dashboard/profile", icon: UserIcon, label: "Profile" },
];

const adminNavItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/dashboard/users", icon: UsersIcon, label: "Users" },
    { href: "/dashboard/profile", icon: UserIcon, label: "Profile" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { role } = useUser();

  const getNavItems = () => {
    switch (role) {
      case "Admin":
        return adminNavItems;
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
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
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
                href="/dashboard/settings"
                className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                pathname === '/dashboard/settings' && 'bg-accent text-accent-foreground'
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
