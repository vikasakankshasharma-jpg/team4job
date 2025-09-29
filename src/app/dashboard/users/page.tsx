
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { users } from "@/lib/data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { Gem, Medal, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

const tierIcons: Record<string, React.ReactNode> = {
  Bronze: <Medal className="h-4 w-4 text-yellow-700" />,
  Silver: <Medal className="h-4 w-4 text-gray-400" />,
  Gold: <Gem className="h-4 w-4 text-amber-500" />,
  Platinum: <Gem className="h-4 w-4 text-cyan-400" />,
};

export default function UsersPage() {
  const router = useRouter();

  const handleRowClick = (userId: string) => {
    router.push(`/dashboard/users/${userId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Directory</CardTitle>
        <CardDescription>A list of all registered users in the system. Click on a row to view details.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="hidden sm:table-cell">Member Since</TableHead>
              <TableHead className="hidden sm:table-cell">Installer Tier</TableHead>
              <TableHead className="hidden sm:table-cell">Rating</TableHead>
              <TableHead className="text-right">Reputation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} onClick={() => handleRowClick(user.id)} className="cursor-pointer">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AnimatedAvatar svg={user.avatarUrl} />
                      <AvatarFallback>{user.anonymousId.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">
                        <p>{user.anonymousId}</p>
                        <p className="text-sm text-muted-foreground">{`user-${user.id.substring(user.id.length-4)}@example.com`}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 sm:flex-row">
                    {user.roles.map(role => (
                        <Badge key={role} variant="outline">{role}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                    {format(user.memberSince, 'MMM, yyyy')}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                    {user.installerProfile ? (
                        <div className="flex items-center gap-2">
                           {tierIcons[user.installerProfile.tier]}
                            {user.installerProfile.tier}
                            {user.installerProfile.verified && <ShieldCheck className="h-4 w-4 text-green-600" title="Verified"/>}
                        </div>
                    ) : (
                        <span className="text-muted-foreground">—</span>
                    )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                    {user.installerProfile ? (
                        <span>{user.installerProfile.rating}/5 ({user.installerProfile.reviews})</span>
                    ) : (
                        <span className="text-muted-foreground">—</span>
                    )}
                </TableCell>
                <TableCell className="text-right">
                    {user.installerProfile ? (
                        <span className="font-semibold">{user.installerProfile.points.toLocaleString()} pts</span>
                     ) : (
                        <span className="text-muted-foreground">—</span>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

    