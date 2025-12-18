
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/hooks/use-user";
import { Label } from "./ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FoundingInstallerIcon } from "./icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export function UserNav() {
  const { user, role, setRole, logout, isAdmin } = useUser();
  const router = useRouter();

  if (!user) {
    return null;
  }

  const handleRoleChange = (newRole: string) => {
    setRole(newRole as any);
  };

  const handleLogout = () => {
    logout();
  }

  const availableRoles = user.roles || [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="overflow-hidden rounded-full" suppressHydrationWarning>
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
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                {user.isFoundingInstaller && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <FoundingInstallerIcon className="h-4 w-4 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Founding Installer</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
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

        {availableRoles.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <div className="py-2">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Current Mode</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={role} onValueChange={handleRoleChange}>
                {availableRoles.map((r) => (
                  <DropdownMenuRadioItem key={r} value={r} className="cursor-pointer">
                    {r === "Job Giver" ? "Job Giver (Hiring)" : r === "Installer" ? "Installer (Working)" : r}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </div>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
