
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/hooks/use-user";
import { Switch } from "@/components/ui/switch";
import { Label } from "./ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatedAvatar } from "./ui/animated-avatar";
import { cn } from "@/lib/utils";

export function UserNav() {
  const { user, role, setRole, logout } = useUser();
  const router = useRouter();

  if (!user) {
    return null;
  }

  const handleRoleChange = (isInstaller: boolean) => {
    setRole(isInstaller ? "Installer" : "Job Giver");
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.realAvatarUrl} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
             <Avatar className="h-9 w-9">
                <AvatarImage src={user.realAvatarUrl} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                {user.email}
                </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="p-2">
            <Label htmlFor="role-switcher" className="text-xs text-muted-foreground px-2">Current Role</Label>
            <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent">
                <span className="text-sm">{role}</span>
                <div className="flex items-center space-x-2">
                    <Label htmlFor="role-switch" className={cn("text-xs font-bold", role === 'Job Giver' ? 'text-primary' : 'text-muted-foreground')}>Giver</Label>
                    <Switch 
                        id="role-switch"
                        checked={role === 'Installer'}
                        onCheckedChange={handleRoleChange}
                        disabled={user.roles.length < 2}
                        aria-label="Role switcher"
                    />
                    <Label htmlFor="role-switch" className={cn("text-xs font-bold", role === 'Installer' ? 'text-primary' : 'text-muted-foreground')}>Installer</Label>
                </div>
            </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
