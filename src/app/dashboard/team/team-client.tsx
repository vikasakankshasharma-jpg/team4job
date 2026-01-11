
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
import { Button } from "@/components/ui/button";
import { Loader2, UserCog, MoreHorizontal } from "lucide-react";
import { useUser, useFirebase } from "@/hooks/use-user";
import { User } from "@/lib/types";
import { toDate } from "@/lib/utils";
import React, { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  collection,
  getDocs,
  query,
  where,
  or
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useHelp } from "@/hooks/use-help";
import { TeamManagementCard } from "@/components/team-management-card";
import Link from "next/link";


export default function TeamClient() {
  const { user, isAdmin, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { setHelp } = useHelp();

  React.useEffect(() => {
    setHelp({
      title: "Team Management",
      content: (
        <div className="space-y-4 text-sm">
          <p>This page is where you, as a primary admin, can manage your administrative team.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">Add Team Member:</span> Use the form to create a new Admin or Support Team user. They will be sent an email to log in with the temporary password you set.</li>
            <li><span className="font-semibold">Roles:</span>
              <ul className="list-disc space-y-1 pl-5 mt-1">
                <li><span className="font-semibold">Admin:</span> Has full access to all platform features.</li>
                <li><span className="font-semibold">Support Team:</span> Has limited access, focused primarily on managing disputes.</li>
              </ul>
            </li>
            <li><span className="font-semibold">Manage Accounts:</span> You can view team member details by clicking on their name. Account deletion must be handled in the Firebase Console for security reasons.</li>
          </ul>
        </div>
      )
    })
  }, [setHelp]);

  const fetchTeamMembers = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const q = query(collection(db, "users"), or(
      where("roles", "array-contains", "Admin"),
      where("roles", "array-contains", "Support Team")
    ));
    const querySnapshot = await getDocs(q);
    const list = querySnapshot.docs.map((doc) => doc.data() as User);
    // Exclude the current admin from the list
    setTeamMembers(list.filter(s => s.id !== user?.id));
    setLoading(false);
  }, [db, user?.id]);

  useEffect(() => {
    if (!userLoading && !isAdmin) {
      router.push('/dashboard');
    } else if (user && isAdmin) {
      fetchTeamMembers();
    }
  }, [isAdmin, userLoading, user, router, fetchTeamMembers]);


  if (userLoading || !isAdmin) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 max-w-full overflow-x-hidden px-4">
      <TeamManagementCard onTeamMemberAdded={fetchTeamMembers} />
      <Card>
        <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><UserCog /> Current Team Members</CardTitle>
            <CardDescription>
              A list of all administrative and support team members.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : teamMembers.length > 0 ? (
                teamMembers.map((teamMember) => (
                  <TableRow key={teamMember.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/users/${teamMember.id}`} className="hover:underline">{teamMember.name}</Link>
                    </TableCell>
                    <TableCell>{teamMember.email}</TableCell>
                    <TableCell>
                      {teamMember.roles.map(r => {
                        if (r === 'Admin' || r === 'Support Team') {
                          return <Badge key={r} variant="secondary">{r}</Badge>
                        }
                        return null;
                      })}
                    </TableCell>
                    <TableCell>{format(toDate(teamMember.memberSince), "PP")}</TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/dashboard/users/${teamMember.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No other team members found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
