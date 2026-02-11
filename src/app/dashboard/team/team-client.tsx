
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


import { useTranslations } from 'next-intl';

export default function TeamClient() {
  const t = useTranslations('team');
  const tCommon = useTranslations('common');
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
      title: t('title'),
      content: (
        <div className="space-y-4 text-sm">
          <p>{t('description')}</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">{t('guide.addMember')}</span> {t('guide.addMemberDesc')}</li>
            <li><span className="font-semibold">{t('guide.rolesPermissions')}</span>
              <ul className="list-disc space-y-1 pl-5 mt-1">
                <li><span className="font-semibold">{t('guide.admin')}</span> {t('guide.adminDesc')}</li>
                <li><span className="font-semibold">{t('guide.support')}</span> {t('guide.supportDesc')}</li>
              </ul>
            </li>
            <li><span className="font-semibold">{t('guide.securityNote')}</span> {t('guide.securityNoteDesc')}</li>
            <li><span className="font-semibold">{t('guide.manageAccounts')}</span> {t('guide.manageAccountsDesc')}</li>
          </ul>
        </div>
      )
    })
  }, [setHelp, t]);

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
      label: tCommon('search'),
      type: 'search',
      placeholder: t('searchPlaceholder'),
      value: searchQuery,
      onChange: setSearchQuery,
    },
    {
      id: 'role',
      label: t('table.role'),
      type: 'select',
      options: [
        { label: t('roles.all'), value: 'all' },
        { label: t('roles.admin'), value: 'Admin' },
        { label: t('roles.support'), value: 'Support Team' },
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
          title={t('stats.totalMembers')}
          value={stats.totalMembers}
          icon={Users}
          description={t('stats.allMembers')}
        />
        <StatCard
          title={t('stats.admins')}
          value={stats.admins}
          icon={Shield}
          description={t('stats.fullAccess')}
        />
        <StatCard
          title={t('stats.supportTeam')}
          value={stats.support}
          icon={Headset}
          description={t('stats.customerSupport')}
        />
      </div>

      <TeamManagementCard onTeamMemberAdded={fetchTeamMembers} />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCog />
                {t('currentMembers')}
              </CardTitle>
              <CardDescription>
                {t('membersShown', { count: filteredTeamMembers.length })}
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
                <TableHead>{t('table.name')}</TableHead>
                <TableHead>{t('table.email')}</TableHead>
                <TableHead>{t('table.role')}</TableHead>
                <TableHead>{t('table.dateAdded')}</TableHead>
                <TableHead>
                  <span className="sr-only">{tCommon('actions')}</span>
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
                            return <Badge key={r} variant="default" className="bg-red-600">{t('roles.admin')}</Badge>
                          }
                          if (r === 'Support Team') {
                            return <Badge key={r} variant="secondary" className="bg-blue-600 text-white">{t('roles.support')}</Badge>
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
                      title={t('noMembersFound')}
                      description={t('noMembersMatch')}
                      action={{
                        label: tCommon('resetFilters'),
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
