

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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { Gem, Medal, ShieldCheck, X, ArrowUpDown, MoreHorizontal, UserX, UserCheck, Ban, Trash2, Loader2, Download } from "lucide-react";
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
import { collection, getDocs, query, doc, updateDoc, deleteDoc as deleteFirestoreDoc } from "firebase/firestore";
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


export default function UsersPage() {
  const router = useRouter();
  const { user, isAdmin } = useUser();
  const { db } = useFirebase();
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState(initialFilters);
  const [sortConfig, setSortConfig] = React.useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({ key: 'memberSince', direction: 'descending' });
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [deleteUser, setDeleteUser] = React.useState<User | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("");
  const { setHelp } = useHelp();

  React.useEffect(() => {
    setHelp({
        title: "User Directory",
        content: (
            <div className="space-y-4 text-sm">
                <p>This page provides a complete directory of all registered users on the platform. As an admin, you have full control to manage these accounts.</p>
                <ul className="list-disc space-y-2 pl-5">
                    <li><span className="font-semibold">Filtering & Sorting:</span> Use the various filter controls to narrow down the user list. You can search by name/email/ID, or filter by role, tier, and status. Click on table headers to sort the data.</li>
                    <li><span className="font-semibold">Export Data:</span> Click the "Export to CSV" button to download the currently filtered list of users for offline analysis or record-keeping.</li>
                    <li><span className="font-semibold">User Status:</span>
                        <ul className="list-disc space-y-1 pl-5 mt-1">
                             <li><span className="font-semibold text-green-500">Active:</span> The user can access the platform normally.</li>
                            <li><span className="font-semibold text-yellow-500">Suspended:</span> The user's account is temporarily disabled.</li>
                            <li><span className="font-semibold text-red-500">Deactivated:</span> The user's account is disabled and can be re-activated or permanently deleted.</li>
                        </ul>
                    </li>
                     <li><span className="font-semibold">Actions Menu:</span> The actions menu on each row allows you to suspend, deactivate, re-activate, or permanently delete a user account.</li>
                     <li><span className="font-semibold">View Profile:</span> Click on a user's name or use the actions menu to go to their detailed profile page.</li>
                </ul>
            </div>
        )
    })
  }, [setHelp]);

  const fetchUsers = React.useCallback(async () => {
    if (!db || !user || !isAdmin) return;
    setLoading(true);
    const usersCollection = collection(db, 'users');
    const userSnapshot = await getDocs(query(usersCollection));
    const userList = userSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as User);
    setUsers(userList);
    setLoading(false);
  }, [db, user, isAdmin]);

  React.useEffect(() => {
    if (user && !isAdmin) {
      router.push('/dashboard');
    } else if (db && user && isAdmin) {
      fetchUsers();
    }
  }, [user, isAdmin, router, db, fetchUsers]);

  const handleUserUpdate = (userId: string, data: Partial<User>) => {
    setUsers(currentUsers => currentUsers.map(u => u.id === userId ? { ...u, ...data } : u));
  };
  
  const handleDeactivate = async (targetUser: User) => {
    setActionLoading(targetUser.id);
    await updateDoc(doc(db, 'users', targetUser.id), { status: 'deactivated' });
    handleUserUpdate(targetUser.id, { status: 'deactivated' });
    toast({ title: 'User Deactivated', description: `${targetUser.name}'s account has been deactivated.`, variant: 'destructive' });
    setActionLoading(null);
  };

  const handleReactivate = async (targetUser: User) => {
    setActionLoading(targetUser.id);
    await updateDoc(doc(db, 'users', targetUser.id), { status: 'active' });
    handleUserUpdate(targetUser.id, { status: 'active' });
    toast({ title: 'User Reactivated', description: `${targetUser.name}'s account is now active.`, variant: 'success' });
    setActionLoading(null);
  };
  
  const handleSuspend = async (targetUser: User) => {
    setActionLoading(targetUser.id);
    const suspensionEndDate = new Date();
    suspensionEndDate.setDate(suspensionEndDate.getDate() + 7); // Default 7 days
    await updateDoc(doc(db, 'users', targetUser.id), { status: 'suspended', suspensionEndDate });
    handleUserUpdate(targetUser.id, { status: 'suspended', suspensionEndDate });
    toast({ title: 'User Suspended', description: `${targetUser.name} has been suspended for 7 days.` });
    setActionLoading(null);
  };

  const handleDeleteConfirm = async () => {
      if (!deleteUser) return;
      setActionLoading(deleteUser.id);
      await deleteFirestoreDoc(doc(db, 'users', deleteUser.id));
      setUsers(currentUsers => currentUsers.filter(u => u.id !== deleteUser.id));
      toast({ title: 'User Deleted', description: `${deleteUser.name} has been permanently deleted.`, variant: 'destructive' });
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

  if (!user || !isAdmin) {
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Redirecting...</p>
        </div>
    );
  }
  
  const clearFilters = () => setFilters(initialFilters);

  const activeFiltersCount = Object.values(filters).filter(value =>
    value !== "" && value !== "all"
  ).length;

  const roles = ["All", "Admin", "Installer", "Job Giver"];
  const tiers = ["All", "Bronze", "Silver", "Gold", "Platinum"];
  const verificationStatuses = [
    { value: 'all', label: 'All Verification' },
    { value: 'true', label: 'Verified' },
    { value: 'false', label: 'Not Verified' },
  ];
    const statusFilters = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'deactivated', label: 'Deactivated' },
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
      case 'suspended': return <Badge variant="warning">Suspended</Badge>;
      case 'deactivated': return <Badge variant="destructive">Deactivated</Badge>;
      default: return <Badge variant="success">Active</Badge>;
    }
  };
  
    const handleExport = () => {
    const dataToExport = sortedAndFilteredUsers.map(u => ({
      ID: u.id,
      Name: u.name,
      Email: u.email,
      Roles: u.roles.join(', '),
      Status: u.status || 'active',
      'Member Since': format(toDate(u.memberSince), 'yyyy-MM-dd'),
      'Installer Tier': u.installerProfile?.tier || 'N/A',
      'Installer Points': u.installerProfile?.points || 0,
      'Installer Rating': u.installerProfile?.rating || 0,
    }));
    exportToCsv(`cctv-users-${new Date().toISOString().split('T')[0]}.csv`, dataToExport);
  };


  return (
    <>
    <Card>
      <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
        <div>
            <CardTitle>User Directory</CardTitle>
            <CardDescription>A list of all registered users in the system. Use actions to manage users.</CardDescription>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export to CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                <Input 
                    placeholder="Filter by name, email, ID..." 
                    value={filters.search} 
                    onChange={e => handleFilterChange('search', e.target.value)} 
                    className="h-8 lg:col-span-2" 
                />
                 <Select value={filters.role} onValueChange={value => handleFilterChange('role', value)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>{roles.map(r => <SelectItem key={r} value={r === 'All' ? 'all' : r}>{r}</SelectItem>)}</SelectContent>
                </Select>
                 <Select value={filters.tier} onValueChange={value => handleFilterChange('tier', value)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tier" /></SelectTrigger>
                    <SelectContent>{tiers.map(t => <SelectItem key={t} value={t === 'All' ? 'all' : t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                 <Select value={filters.status} onValueChange={value => handleFilterChange('status', value)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>{statusFilters.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Clear Filters
                  </Button>
                )}
            </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Button variant="ghost" onClick={() => requestSort('name')}>User {getSortIcon('name')}</Button></TableHead>
              <TableHead><Button variant="ghost" onClick={() => requestSort('status')}>Status {getSortIcon('status')}</Button></TableHead>
              <TableHead className="hidden sm:table-cell"><Button variant="ghost" onClick={() => requestSort('memberSince')}>Member Since {getSortIcon('memberSince')}</Button></TableHead>
              <TableHead className="hidden sm:table-cell"><Button variant="ghost" onClick={() => requestSort('tier')}>Tier {getSortIcon('tier')}</Button></TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
            ) : sortedAndFilteredUsers.length > 0 ? (
              sortedAndFilteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AnimatedAvatar svg={u.avatarUrl} />
                        <AvatarFallback>{u.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                          <Link href={`/dashboard/users/${u.id}`} className="font-medium hover:underline">{u.name}</Link>
                          <p className="text-sm text-muted-foreground font-mono truncate max-w-[150px]">{u.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getUserStatusBadge(u.status)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{format(toDate(u.memberSince), 'MMM, yyyy')}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                      {u.installerProfile ? (
                          <div className="flex items-center gap-2">
                             {tierIcons[u.installerProfile.tier]}
                              {u.installerProfile.tier}
                              {u.installerProfile.verified && <ShieldCheck className="h-4 w-4 text-green-600" title="Verified"/>}
                          </div>
                      ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {actionLoading === u.id ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                      user.id !== u.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Actions for {u.name}</span></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild><Link href={`/dashboard/users/${u.id}`}>View Profile</Link></DropdownMenuItem>
                            <DropdownMenuSeparator />
                             {(u.status === 'active' || u.status === undefined) && (
                              <DropdownMenuItem onClick={() => handleSuspend(u)}><Ban className="mr-2 h-4 w-4"/>Suspend</DropdownMenuItem>
                            )}
                             {u.status === 'suspended' && (
                              <>
                                <DropdownMenuItem onClick={() => handleReactivate(u)}><UserCheck className="mr-2 h-4 w-4"/>Re-activate</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeactivate(u)}><UserX className="mr-2 h-4 w-4"/>Deactivate</DropdownMenuItem>
                              </>
                            )}
                            {u.status === 'deactivated' && (
                              <>
                                <DropdownMenuItem onClick={() => handleReactivate(u)}><UserCheck className="mr-2 h-4 w-4"/>Re-activate</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteUser(u)}><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
               <TableRow><TableCell colSpan={5} className="h-24 text-center">No users found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    {deleteUser && (
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user <span className="font-bold">{deleteUser.name}</span>. This action is irreversible. Please type <span className="font-bold text-foreground">DELETE</span> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input placeholder="Type DELETE to confirm" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteUser(null); setDeleteConfirmation(""); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm} disabled={deleteConfirmation !== 'DELETE'}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
    </>
  );
}
