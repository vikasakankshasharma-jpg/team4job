
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
import { Loader2, UserCog, MoreHorizontal, Users, Shield, Headset, Inbox } from "lucide-react";
import { StatCard, FilterBar, ExportButton, AdminEmptyState } from "@/components/admin";
import type { Filter } from "@/components/admin";
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
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const { setHelp } = useHelp();

  React.useEffect(() => {
    setHelp({
      title: "Team Management",
      content: (
        <div className="space-y-4 text-sm">
          <p>This page is where you, as a primary admin, can manage your administrative team.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">Add Team Member:</span> Use the form to create a new Admin or Support Team user. They will be sent an email to log in with the temporary password you set.</li>
            <li><span className="font-semibold">Roles & Permissions:</span>
              <ul className="list-disc space-y-1 pl-5 mt-1">
                <li><span className="font-semibold">Admin:</span> Full platform access - can manage users, jobs, transactions, settings, team members, and resolve disputes.</li>
                <li><span className="font-semibold">Support Team:</span> Limited access - can view users, jobs, and transactions (read-only), manage disputes, and provide customer support.</li>
              </ul>
            </li>
            <li><span className="font-semibold">Security Note:</span> Support Team members cannot access platform settings, financial configurations, or team management. They focus on dispute resolution and customer service.</li>
            <li><span className="font-semibold">Manage Accounts:</span> View team member details by clicking their name. Account deletion must be handled in the Firebase Console for security reasons.</li>
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


  // Filter team members
  const filteredTeamMembers = React.useMemo(() => {
    return teamMembers.filter(member => {
      const matchesSearch = searchQuery === '' ||
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'all' || member.roles.includes(roleFilter as any);

      return matchesSearch && matchesRole;
    });
  }, [teamMembers, searchQuery, roleFilter]);

  // Stats
  const stats = React.useMemo(() => {
    const totalMembers = teamMembers.length;
    const admins = teamMembers.filter(m => m.roles.includes('Admin')).length;
    const support = teamMembers.filter(m => m.roles.includes('Support Team')).length;

    return { totalMembers, admins, support };
  }, [teamMembers]);

  // Export data
  const exportData = filteredTeamMembers.map(member => ({
    'Name': member.name,
    'Email': member.email,
    'Roles': member.roles.join(', '),
    'Date Added': format(toDate(member.memberSince), 'yyyy-MM-dd'),
  }));

  // Filter configuration
  const filterConfig: Filter[] = [
    {
      id: 'search',
      label: 'Search',
      type: 'search',
      placeholder: 'Search by name or email...',
      value: searchQuery,
      onChange: setSearchQuery,
    },
    {
      id: 'role',
      label: 'Role',
      type: 'select',
      options: [
        { label: 'All Roles', value: 'all' },
        { label: 'Admin', value: 'Admin' },
        { label: 'Support Team', value: 'Support Team' },
      ],
      value: roleFilter,
      onChange: setRoleFilter,
    },
  ];

  if (userLoading || !isAdmin) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
  };

  return (
    <div className="grid gap-6 max-w-full overflow-x-hidden px-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Members"
          value={stats.totalMembers}
          icon={Users}
          description="All team members"
        />
        <StatCard
          title="Admins"
          value={stats.admins}
          icon={Shield}
          description="Full platform access"
        />
        <StatCard
          title="Support Team"
          value={stats.support}
          icon={Headset}
          description="Customer support"
        />
      </div>

      <TeamManagementCard onTeamMemberAdded={fetchTeamMembers} />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCog />
                Current Team Members
              </CardTitle>
              <CardDescription>
                {filteredTeamMembers.length} members shown • Administrative and support staff
              </CardDescription>
            </div>
            <ExportButton
              data={exportData}
              filename={`team-members-${new Date().toISOString().split('T')[0]}`}
              formats={['csv', 'json']}
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4">
            <FilterBar filters={filterConfig} onReset={clearFilters} />
          </div>

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
              ) : filteredTeamMembers.length > 0 ? (
                filteredTeamMembers.map((teamMember) => (
                  <TableRow key={teamMember.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/users/${teamMember.id}`} className="hover:underline">{teamMember.name}</Link>
                    </TableCell>
                    <TableCell>{teamMember.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {teamMember.roles.map(r => {
                          if (r === 'Admin') {
                            return <Badge key={r} variant="default" className="bg-red-600">Admin</Badge>
                          }
                          if (r === 'Support Team') {
                            return <Badge key={r} variant="secondary" className="bg-blue-600 text-white">Support Team</Badge>
                          }
                          return null;
                        })}
                      </div>
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
                  <TableCell colSpan={5} className="h-24">
                    <AdminEmptyState
                      icon={Inbox}
                      title="No team members found"
                      description="No members match your current filters"
                      action={{
                        label: 'Reset Filters',
                        onClick: clearFilters,
                      }}
                    />
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
