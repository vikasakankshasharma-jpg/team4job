
"use client";


import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { Gem, Medal, ShieldCheck, X, ArrowUpDown, MoreHorizontal, UserX, UserCheck, Ban, Trash2, Loader2, Download, List, Grid, Users, UserPlus, UserCheck2, Activity, Clock, Inbox } from "lucide-react";
import { StatCard, FilterBar, ExportButton, AdminEmptyState } from "@/components/admin";
import type { Filter } from "@/components/admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import React from "react";
import { User } from "@/lib/types";
import { toDate, cn, exportToCsv } from "@/lib/utils";
import { useUser, useFirebase } from "@/hooks/use-user";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { collection, getDocs, query, doc, updateDoc, deleteDoc as deleteFirestoreDoc, limit, startAfter, orderBy, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useHelp } from "@/hooks/use-help";
import { UserListSkeleton } from "@/components/skeletons/user-list-skeleton";
import { GlobalErrorBoundary } from "@/components/dashboard/error-boundary";


import { useTranslations } from 'next-intl';

const tierIcons: Record<string, React.ReactNode> = {
  Bronze: <Medal className="h-4 w-4 text-yellow-700" />,
  Silver: <Medal className="h-4 w-4 text-gray-400" />,
  Gold: <Gem className="h-4 w-4 text-amber-500" />,
  Platinum: <Gem className="h-4 w-4 text-cyan-400" />,
};

const initialFilters = {
  search: "",
  role: "all",
  tier: "all",
  verified: "all",
  rating: "all",
  status: "all",
};

type SortableKeys = 'name' | 'memberSince' | 'tier' | 'rating' | 'points' | 'status';

function UserCard({ u, user, actionLoading, handleUserAction, setDeleteUser }: { u: User, user: User, actionLoading: string | null, handleUserAction: (user: User, status: User['status'] | Partial<User>, days?: number) => void, setDeleteUser: (user: User) => void }) {
  const t = useTranslations('admin.users');
  const getUserStatusBadge = (status?: User['status']) => {
    switch (status) {
      case 'suspended': return <Badge variant="warning">{t('badges.suspended')}</Badge>;
      case 'deactivated': return <Badge variant="destructive">{t('badges.deactivated')}</Badge>;
      default: return <Badge variant="success">{t('badges.active')}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AnimatedAvatar svg={u.avatarUrl} />
              <AvatarFallback>{u.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base"><Link href={`/dashboard/users/${u.id}`} className="hover:underline">{u.name}</Link></CardTitle>
              <CardDescription className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Unique ID: {u.id}</CardDescription>
            </div>
          </div>
          {getUserStatusBadge(u.status)}
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Roles</span>
          <div className="flex flex-wrap gap-1 justify-end">
            {u.roles.map(r => <Badge key={r} variant="outline" className="font-normal">{r}</Badge>)}
            {u.installerProfile?.verified && <Badge variant="secondary" className="gap-1 pl-1.5 font-normal"><ShieldCheck className="h-3.5 w-3.5 text-green-600" /> {t('badges.verified')}</Badge>}
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('table.memberSince')}</span>
          <span className="font-medium">{format(toDate(u.memberSince), 'MMM, yyyy')}</span>
        </div>
        {u.installerProfile && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('table.tier')}</span>
            <div className="flex items-center gap-2 font-medium">
              {tierIcons[u.installerProfile.tier]}
              {u.installerProfile.tier}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {actionLoading === u.id ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          user.id !== u.id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-haspopup="true" variant="outline" className="w-full"><MoreHorizontal className="mr-2 h-4 w-4" />{t('table.actions')}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t('table.actions')}</DropdownMenuLabel>
                <DropdownMenuItem asChild><Link href={`/dashboard/users/${u.id}`}>{t('actions.viewProfile')}</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSeparator />
                {u.roles.includes('Installer') && !u.installerProfile?.verified && (
                  <DropdownMenuItem onClick={() => {
                    handleUserAction(u, {
                      installerProfile: {
                        ...u.installerProfile!,
                        verified: true,
                        adminNotes: `Manually verified by admin on ${new Date().toISOString()}`
                      }
                    });
                    // Reload is a bit harsh, but simple for this Admin action to reflect immediately without complex state mgmt
                    setTimeout(() => window.location.reload(), 1000);
                  }}>
                    <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                    {t('actions.markVerified')}
                  </DropdownMenuItem>
                )}
                {(u.status === 'active' || u.status === undefined) && (
                  <DropdownMenuItem onClick={() => handleUserAction(u, 'deactivated')}>
                    <UserX className="mr-2 h-4 w-4" />
                    {t('actions.deactivate')}
                  </DropdownMenuItem>
                )}
                {u.status !== 'suspended' && (
                  <DropdownMenuItem onClick={() => handleUserAction(u, 'suspended', 7)}>
                    <Ban className="mr-2 h-4 w-4" />
                    {t('actions.suspend')}
                  </DropdownMenuItem>
                )}
                {(u.status === 'deactivated' || u.status === 'suspended') && (
                  <DropdownMenuItem onClick={() => handleUserAction(u, 'active')}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    {t('actions.reactivate')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteUser(u)}><Trash2 className="mr-2 h-4 w-4" />{t('actions.delete')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        )}
      </CardFooter>
    </Card>
  );
}

export default function UsersClient() {
  const router = useRouter();
  const { user, isAdmin } = useUser();
  const { db } = useFirebase();
  const queryClient = useQueryClient();
  const [filters, setFilters] = React.useState(initialFilters);
  const [sortConfig, setSortConfig] = React.useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({ key: 'memberSince', direction: 'descending' });
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [deleteUser, setDeleteUser] = React.useState<User | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("");
  const { setHelp } = useHelp();
  const [view, setView] = React.useState<'list' | 'grid'>('list');
  const [activeTab, setActiveTab] = React.useState<string>('all');
  const t = useTranslations('admin.users');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['users', isAdmin], // Only refetch if admin status changes (or strict reload). Filters are client-side for now as per legacy code.
    queryFn: async ({ pageParam }) => {
      if (!db || !isAdmin) return { users: [], lastDoc: null };
      const usersCollection = collection(db, 'users');
      let q = query(usersCollection, orderBy('memberSince', 'desc'), limit(50));
      if (pageParam) q = query(q, startAfter(pageParam));

      const snapshot = await getDocs(q);
      const pageUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as User);
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      return { users: pageUsers, lastDoc };
    },
    initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
    getNextPageParam: (lastPage) => lastPage.lastDoc || null,
    enabled: !!db && !!isAdmin,
  });

  const users = React.useMemo(() => data?.pages.flatMap(p => p.users) || [], [data]);
  const loading = status === 'pending';
  const loadingMore = isFetchingNextPage;
  const hasMore = hasNextPage;

  React.useEffect(() => {
    setHelp({
      title: t('guide.title'),
      content: (
        <div className="space-y-4 text-sm">
          <p>{t('guide.intro')}</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">{t('guide.filteringTitle')}</span> {t('guide.filtering')}</li>
            <li><span className="font-semibold">{t('guide.exportTitle')}</span> {t('guide.export')}</li>
            <li><span className="font-semibold">{t('guide.statusTitle')}</span>
              <ul className="list-disc space-y-1 pl-5 mt-1">
                <li><span className="font-semibold text-green-500">{t('guide.activeTitle')}</span> {t('guide.active')}</li>
                <li><span className="font-semibold text-yellow-500">{t('guide.suspendedTitle')}</span> {t('guide.suspended')}</li>
                <li><span className="font-semibold text-red-500">{t('guide.deactivatedTitle')}</span> {t('guide.deactivated')}</li>
              </ul>
            </li>
            <li><span className="font-semibold">{t('guide.actionsTitle')}</span> {t('guide.actions')}</li>
            <li><span className="font-semibold">{t('guide.viewProfileTitle')}</span> {t('guide.viewProfile')}</li>
          </ul>
        </div>
      )
    })
  }, [setHelp, t]);

  React.useEffect(() => {
    if (user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, router]);

  const handleUserUpdate = (userId: string, data: Partial<User>) => {
    queryClient.setQueryData(['users', isAdmin], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          users: page.users.map((u: User) => u.id === userId ? { ...u, ...data } : u),
        })),
      };
    });
  };

  const handleUserAction = async (targetUser: User, newStatusOrUpdate: User['status'] | Partial<User>, days?: number) => {
    setActionLoading(targetUser.id);
    let updateData: Partial<User> = {};
    let toastTitle = '';
    let toastDescription = '';

    if (typeof newStatusOrUpdate === 'string') {
      // Legacy status update
      updateData = { status: newStatusOrUpdate };
      if (newStatusOrUpdate === 'suspended' && days) {
        const suspensionEndDate = new Date();
        suspensionEndDate.setDate(suspensionEndDate.getDate() + days);
        updateData.suspensionEndDate = suspensionEndDate;
        toastTitle = t('messages.userSuspended');
        toastDescription = t('messages.userSuspendedDesc', { name: targetUser.name, days });
      } else if (newStatusOrUpdate === 'active') {
        toastTitle = t('messages.userReactivated');
        toastDescription = t('messages.userReactivatedDesc', { name: targetUser.name });
      } else if (newStatusOrUpdate === 'deactivated') {
        toastTitle = t('messages.userDeactivated');
        toastDescription = t('messages.userDeactivatedDesc', { name: targetUser.name });
      }
    } else {
      // Manual arbitrary update (like verification)
      updateData = newStatusOrUpdate;
      toastTitle = t('messages.userUpdated');
      toastDescription = t('messages.userUpdatedDesc');
    }

    try {
      await updateDoc(doc(db, 'users', targetUser.id), updateData);
      handleUserUpdate(targetUser.id, updateData);
      toast({ title: toastTitle, description: toastDescription });
    } catch (e) {
      console.error(e);
      toast({ title: t('messages.error'), description: t('messages.errorDesc'), variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteUser) return;
    setActionLoading(deleteUser.id);
    await deleteFirestoreDoc(doc(db, 'users', deleteUser.id));

    queryClient.setQueryData(['users', isAdmin], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          users: page.users.filter((u: User) => u.id !== deleteUser.id),
        })),
      };
    });

    toast({ title: t('messages.userDeleted'), description: t('messages.userDeletedDesc', { name: deleteUser.name }), variant: 'destructive' });
    setDeleteUser(null);
    setDeleteConfirmation("");
    setActionLoading(null);
  };


  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredUsers = React.useMemo(() => {
    let filtered = users;

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.id.toLowerCase().includes(searchTerm) ||
        (user.mobile && user.mobile.includes(searchTerm))
      );
    }
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => user.roles.includes(filters.role as any));
    }
    if (filters.status !== 'all') {
      filtered = filtered.filter(user => (user.status || 'active') === filters.status);
    }
    if (filters.tier !== 'all') {
      filtered = filtered.filter(user => user.installerProfile?.tier === filters.tier);
    }
    if (filters.verified !== 'all') {
      const isVerified = filters.verified === 'true';
      filtered = filtered.filter(user => !!user.installerProfile?.verified === isVerified);
    }
    if (filters.rating !== 'all') {
      filtered = filtered.filter(user => {
        const rating = user.installerProfile?.rating || 0;
        if (filters.rating === '5') return rating === 5;
        if (filters.rating === '4+') return rating >= 4;
        if (filters.rating === '3+') return rating >= 3;
        if (filters.rating === 'unrated') return rating === 0;
        return true;
      });
    }

    // Exclude the current admin user from the list
    if (user) {
      filtered = filtered.filter(u => u.id !== user.id);
    }

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        const aVal = a.installerProfile;
        const bVal = b.installerProfile;
        let valA: any, valB: any;

        switch (sortConfig.key) {
          case 'name':
            valA = a.name; valB = b.name; break;
          case 'memberSince':
            valA = toDate(a.memberSince).getTime(); valB = toDate(b.memberSince).getTime(); break;
          case 'tier':
            valA = aVal?.tier || ''; valB = bVal?.tier || ''; break;
          case 'rating':
            valA = aVal?.rating || 0; valB = bVal?.rating || 0; break;
          case 'points':
            valA = aVal?.points || 0; valB = bVal?.points || 0; break;
          case 'status':
            valA = a.status || 'active'; valB = b.status || 'active'; break;
          default:
            return 0;
        }

        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [users, filters, sortConfig, user]);


  const clearFilters = () => setFilters(initialFilters);

  const activeFiltersCount = Object.values(filters).filter(value =>
    value !== "" && value !== "all"
  ).length;

  const verificationStatuses = [
    { value: 'all', label: 'All Verification' },
    { value: 'true', label: 'Verified' },
    { value: 'false', label: 'Not Verified' },
  ];
  const statusFilters = [
    { value: 'all', label: t('filters.allStatuses') },
    { value: 'active', label: t('filters.active') },
    { value: 'suspended', label: t('filters.suspended') },
    { value: 'deactivated', label: t('filters.deactivated') },
  ];
  const ratingFilters = [
    { value: 'all', label: 'All Ratings' },
    { value: '5', label: '5 Stars' },
    { value: '4+', label: '4 Stars & Up' },
    { value: '3+', label: '3 Stars & Up' },
    { value: 'unrated', label: 'Unrated' },
  ];

  const getSortIcon = (key: SortableKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  const getUserStatusBadge = (status?: User['status']) => {
    switch (status) {
      case 'suspended': return <Badge variant="warning">{t('badges.suspended')}</Badge>;
      case 'deactivated': return <Badge variant="destructive">{t('badges.deactivated')}</Badge>;
      default: return <Badge variant="success">{t('badges.active')}</Badge>;
    }
  };

  const exportData = sortedAndFilteredUsers.map(u => ({
    ID: u.id,
    Name: u.name,
    Email: u.email,
    Mobile: u.mobile || '',
    Roles: u.roles.join(', '),
    Status: u.status || 'active',
    'Member Since': format(toDate(u.memberSince), 'yyyy-MM-dd'),
    'Installer Tier': u.installerProfile?.tier || 'N/A',
    'Installer Points': u.installerProfile?.points || 0,
    'Installer Rating': u.installerProfile?.rating || 0,
    'Installer Verified': u.installerProfile?.verified ? 'Yes' : 'No',
  }));

  // Stats calculations
  const stats = React.useMemo(() => {
    const totalUsers = users.length;
    const installers = users.filter(u => u.roles.includes('Installer')).length;
    const jobGivers = users.filter(u => u.roles.includes('Job Giver')).length;
    const verifiedInstallers = users.filter(u => u.installerProfile?.verified).length;
    const activeUsers = users.filter(u => !u.status || u.status === 'active').length;
    const suspendedUsers = users.filter(u => u.status === 'suspended').length;

    // Active today (joined in last 24h)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const activeToday = users.filter(u => {
      const joinDate = toDate(u.memberSince);
      return joinDate > oneDayAgo;
    }).length;

    return {
      totalUsers,
      installers,
      jobGivers,
      verifiedInstallers,
      activeUsers,
      suspendedUsers,
      activeToday,
    };
  }, [users]);


  // Filter configuration for FilterBar
  const filterConfig: Filter[] = [
    {
      id: 'search',
      label: t('filters.search'),
      type: 'search',
      placeholder: t('filters.searchPlaceholder'),
      value: filters.search,
      onChange: (value) => handleFilterChange('search', value),
    },
    {
      id: 'role',
      label: t('filters.role'),
      type: 'select',
      options: [
        { label: t('filters.allRoles'), value: 'all' },
        { label: t('filters.installer'), value: 'Installer' },
        { label: t('filters.jobGiver'), value: 'Job Giver' },
        { label: t('filters.admin'), value: 'Admin' },
        { label: t('filters.support'), value: 'Support Team' },
      ],
      value: filters.role,
      onChange: (value) => handleFilterChange('role', value),
    },
    {
      id: 'status',
      label: t('filters.status'),
      type: 'select',
      options: statusFilters.map(s => ({ label: s.label, value: s.value })),
      value: filters.status,
      onChange: (value) => handleFilterChange('status', value),
    },
  ];

  // Tab-based filtering
  const tabFilteredUsers = React.useMemo(() => {
    switch (activeTab) {
      case 'installers':
        return sortedAndFilteredUsers.filter(u => u.roles.includes('Installer'));
      case 'jobgivers':
        return sortedAndFilteredUsers.filter(u => u.roles.includes('Job Giver'));
      case 'pending':
        return sortedAndFilteredUsers.filter(u => u.roles.includes('Installer') && !u.installerProfile?.verified);
      default:
        return sortedAndFilteredUsers;
    }
  }, [sortedAndFilteredUsers, activeTab]);

  if (!user || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <GlobalErrorBoundary>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title={t('stats.totalUsers')}
          value={stats.totalUsers}
          icon={Users}
          description={t('stats.active', { count: stats.activeUsers })}
        />
        <StatCard
          title={t('stats.installers')}
          value={stats.installers}
          icon={UserPlus}
          description={t('stats.verified', { count: stats.verifiedInstallers })}
        />
        <StatCard
          title={t('stats.jobGivers')}
          value={stats.jobGivers}
          icon={UserCheck2}
          description={t('stats.clients')}
        />
        <StatCard
          title={t('stats.newToday')}
          value={stats.activeToday}
          icon={Activity}
          trend={
            stats.activeToday > 0
              ? { value: t('stats.joined', { count: stats.activeToday }), isPositive: true }
              : undefined
          }
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>
                {t('description', { count: sortedAndFilteredUsers.length })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-md bg-secondary p-1">
                <Button
                  variant={view === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setView('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setView('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
              <ExportButton
                data={exportData}
                filename={`users-${new Date().toISOString().split('T')[0]}`}
                formats={['csv', 'json']}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <UserListSkeleton />
          ) : (
            <>
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
                <TabsList>
                  <TabsTrigger value="all">{t('tabs.all', { count: sortedAndFilteredUsers.length })}</TabsTrigger>
                  <TabsTrigger value="installers">
                    {t('tabs.installers', { count: sortedAndFilteredUsers.filter(u => u.roles.includes('Installer')).length })}
                  </TabsTrigger>
                  <TabsTrigger value="jobgivers">
                    {t('tabs.jobGivers', { count: sortedAndFilteredUsers.filter(u => u.roles.includes('Job Giver')).length })}
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    {t('tabs.pending', { count: sortedAndFilteredUsers.filter(u => u.roles.includes('Installer') && !u.installerProfile?.verified).length })}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Filters */}
              <div className="mb-4">
                <FilterBar filters={filterConfig} onReset={clearFilters} />
              </div>

              {/* List View */}
              {view === 'list' && (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button variant="ghost" onClick={() => requestSort('name')}>
                            {t('table.user')} {getSortIcon('name')}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" onClick={() => requestSort('status')}>
                            {t('table.status')} {getSortIcon('status')}
                          </Button>
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">
                          <Button variant="ghost" onClick={() => requestSort('memberSince')}>
                            {t('table.memberSince')} {getSortIcon('memberSince')}
                          </Button>
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">
                          <Button variant="ghost" onClick={() => requestSort('tier')}>
                            {t('table.tier')} {getSortIcon('tier')}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <span className="sr-only">{t('table.actions')}</span>
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
                      ) : tabFilteredUsers.length > 0 ? (
                        tabFilteredUsers.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AnimatedAvatar svg={u.avatarUrl} />
                                  <AvatarFallback>{u.name?.substring(0, 2) || 'UN'}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <Link
                                    href={`/dashboard/users/${u.id}`}
                                    className="font-medium hover:underline"
                                  >
                                    {u.name}
                                  </Link>
                                  <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px] uppercase tracking-wider">
                                    ID: {u.id}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{getUserStatusBadge(u.status)}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {format(toDate(u.memberSince), 'MMM, yyyy')}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {u.installerProfile ? (
                                <div className="flex items-center gap-2">
                                  {tierIcons[u.installerProfile.tier]}
                                  {u.installerProfile.tier}
                                  {u.installerProfile.verified && (
                                    <ShieldCheck className="h-4 w-4 text-green-600" />
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {actionLoading === u.id ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                user.id !== u.id && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button aria-haspopup="true" size="icon" variant="ghost">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">{t('a11y.actionsFor', { name: u.name })}</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>{t('table.actions')}</DropdownMenuLabel>
                                      <DropdownMenuItem asChild>
                                        <Link href={`/dashboard/users/${u.id}`}>{t('actions.viewProfile')}</Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      {(u.status === 'active' || u.status === undefined) && (
                                        <DropdownMenuItem
                                          onClick={() => handleUserAction(u, 'deactivated')}
                                        >
                                          <UserX className="mr-2 h-4 w-4" />
                                          {t('actions.deactivate')}
                                        </DropdownMenuItem>
                                      )}
                                      {u.status !== 'suspended' && (
                                        <DropdownMenuItem
                                          onClick={() => handleUserAction(u, 'suspended', 7)}
                                        >
                                          <Ban className="mr-2 h-4 w-4" />
                                          {t('actions.suspend')}
                                        </DropdownMenuItem>
                                      )}
                                      {(u.status === 'deactivated' || u.status === 'suspended') && (
                                        <DropdownMenuItem onClick={() => handleUserAction(u, 'active')}>
                                          <UserCheck className="mr-2 h-4 w-4" />
                                          {t('actions.reactivate')}
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => setDeleteUser(u)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {t('actions.delete')}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24">
                            <AdminEmptyState
                              icon={Inbox}
                              title={t('empty.title')}
                              description={t('empty.description')}
                              action={{
                                label: t('empty.reset'),
                                onClick: clearFilters,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Grid View */}
              {view === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {loading ? (
                    <div className="col-span-full">
                      <AdminEmptyState
                        icon={Clock}
                        title={t('loading.title')}
                        description={t('loading.description')}
                      />
                    </div>
                  ) : tabFilteredUsers.length > 0 ? (
                    tabFilteredUsers.map((u) => (
                      <UserCard
                        key={u.id}
                        u={u}
                        user={user}
                        actionLoading={actionLoading}
                        handleUserAction={handleUserAction}
                        setDeleteUser={setDeleteUser}
                      />
                    ))
                  ) : (
                    <div className="col-span-full">
                      <AdminEmptyState
                        icon={Inbox}
                        title={t('empty.title')}
                        description={t('empty.description')}
                        action={{
                          label: t('empty.reset'),
                          onClick: clearFilters,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Load More Button */}
              {!loading && hasMore && tabFilteredUsers.length > 0 && (
                <div className="flex justify-center mt-6">
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={loadingMore}
                    variant="outline"
                    size="lg"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('loading.more')}
                      </>
                    ) : (
                      t('loading.loadMore', { count: users.length })
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialogs.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.rich('dialogs.deleteDescription', {
                name: deleteUser?.name || '',
                bold: (chunks) => <span className="font-bold">{chunks}</span>,
                foreground: (chunks) => <span className="font-bold text-foreground">{chunks}</span>
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input placeholder={t('dialogs.deletePlaceholder')} value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteUser(null); setDeleteConfirmation(""); }}>{t('dialogs.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteConfirm} disabled={deleteConfirmation !== 'DELETE'}>{t('dialogs.confirmDelete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GlobalErrorBoundary>
  );
}
