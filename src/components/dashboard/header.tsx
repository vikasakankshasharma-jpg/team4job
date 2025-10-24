
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
import { HelpDialog } from "../help-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useSearch } from "@/hooks/use-search";

const installerNavItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/dashboard/jobs", icon: Search, label: "Browse Jobs" },
  { href: "/dashboard/my-bids", icon: Briefcase, label: "My Bids" },
  { href: "/dashboard/disputes", icon: AlertOctagon, label: "Disputes" },
];

const jobGiverNavItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/dashboard/post-job", icon: PlusCircle, label: "Post a Job" },
  { href: "/dashboard/posted-jobs", icon: Briefcase, label: "My Jobs" },
  { href: "/dashboard/disputes", icon: AlertOctagon, label: "Disputes" },
];

const adminNavItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/dashboard/reports", icon: FileText, label: "Reports" },
    { href: "/dashboard/users", icon: UsersIcon, label: "Users" },
    { href: "/dashboard/team", icon: UserCog, label: "Team Management" },
    { href: "/dashboard/all-jobs", icon: Briefcase, label: "All Jobs" },
    { href: "/dashboard/transactions", icon: IndianRupee, label: "Transactions" },
    { href: "/dashboard/disputes", icon: AlertOctagon, label: "Disputes" },
];

const supportTeamNavItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/dashboard/disputes", icon: AlertOctagon, label: "Disputes" },
];

export function Header() {
  const pathname = usePathname();
  const { role } = useUser();
  const { searchQuery, setSearchQuery } = useSearch();
  
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
  const breadcrumbSegments = pathname.split('/').filter(Boolean);

  const renderBreadcrumbs = () => {
    if (role === 'Admin') {
      if (pathname.startsWith('/dashboard/users/')) {
        return (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard/users">Users</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{breadcrumbSegments[breadcrumbSegments.length - 1]}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        );
      }
       if(pathname.startsWith('/dashboard/users')) {
         return (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Users</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        );
      }
    }

    return breadcrumbSegments.slice(1).map((segment, index) => (
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
    ))
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
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
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <Briefcase className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">CCTV Job Connect</span>
            </Link>
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn("flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground",
                  pathname === item.href && "text-foreground"
                )}
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
              >
                <UserIcon className="h-5 w-5" />
                Profile
              </Link>
             <Link
                href="/dashboard/settings"
                className={cn("flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground",
                  pathname.startsWith('/dashboard/settings') && "text-foreground"
                )}
              >
                <Settings className="h-5 w-5" />
                Settings
              </Link>
          </nav>
        </SheetContent>
      </Sheet>
      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {renderBreadcrumbs()}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="relative ml-auto flex items-center gap-2 md:grow-0">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <HelpDialog>
        <Button variant="outline" size="icon">
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help</span>
        </Button>
      </HelpDialog>
      <ThemeToggle />
      <UserNav />
    </header>
  );
}
