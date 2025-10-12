
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
import { Gem, Medal, ShieldCheck, X, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import React from "react";
import { User } from "@/lib/types";
import { toDate } from "@/lib/utils";
import { useUser, useFirebase } from "@/hooks/use-user";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { collection, getDocs, query } from "firebase/firestore";

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
};

type SortableKeys = 'name' | 'memberSince' | 'tier' | 'rating' | 'points';


export default function UsersPage() {
  const router = useRouter();
  const { user, isAdmin } = useUser();
  const { db } = useFirebase();
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState(initialFilters);
  const [sortConfig, setSortConfig] = React.useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({ key: 'memberSince', direction: 'descending' });

  React.useEffect(() => {
    if (user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, router]);

  React.useEffect(() => {
      async function fetchUsers() {
        if (!db || !user || !isAdmin) return;
        
        setLoading(true);
        const usersCollection = collection(db, 'users');
        const userSnapshot = await getDocs(query(usersCollection));
        const userList = userSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as User);
        setUsers(userList);
        setLoading(false);
      }
      if (db && user && isAdmin) {
        fetchUsers();
      }
  }, [user, db, isAdmin]);

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

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        const aVal = a.installerProfile;
        const bVal = b.installerProfile;
        let valA, valB;
        
        switch (sortConfig.key) {
            case 'name':
                valA = a.name;
                valB = b.name;
                break;
            case 'memberSince':
                valA = toDate(a.memberSince).getTime();
                valB = toDate(b.memberSince).getTime();
                break;
            case 'tier':
                valA = aVal?.tier || '';
                valB = bVal?.tier || '';
                break;
            case 'rating':
                valA = aVal?.rating || 0;
                valB = bVal?.rating || 0;
                break;
            case 'points':
                valA = aVal?.points || 0;
                valB = bVal?.points || 0;
                break;
            default:
                return 0;
        }

        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }


    return filtered;
  }, [users, filters, sortConfig]);

  if (!user || !isAdmin) {
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Redirecting...</p>
        </div>
    );
  }

  const handleRowClick = (userId: string) => {
    router.push(`/dashboard/users/${userId}`);
  };
  
  const clearFilters = () => {
    setFilters(initialFilters);
  }

  const activeFiltersCount = Object.values(filters).filter(value =>
    value !== "" && value !== "all"
  ).length;

  const roles = ["All", "Admin", "Installer", "Job Giver"];
  const tiers = ["All", "Bronze", "Silver", "Gold", "Platinum"];
  const verificationStatuses = [
    { value: 'all', label: 'All' },
    { value: 'true', label: 'Verified' },
    { value: 'false', label: 'Not Verified' },
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Directory</CardTitle>
        <CardDescription>A list of all registered users in the system. Click on a row to view details.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters Section */}
        <div className="flex flex-col gap-2 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                <Input 
                    placeholder="Filter by name, email, ID, mobile..." 
                    value={filters.search} 
                    onChange={e => handleFilterChange('search', e.target.value)} 
                    className="h-8 lg:col-span-2" 
                />
                <Select value={filters.role} onValueChange={value => handleFilterChange('role', value)}>
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Filter by Role..." />
                    </SelectTrigger>
                    <SelectContent>
                        {roles.map(role => (
                            <SelectItem key={role} value={role === 'All' ? 'all' : role}>{role}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Select value={filters.rating} onValueChange={value => handleFilterChange('rating', value)}>
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Filter by Rating..." />
                    </SelectTrigger>
                    <SelectContent>
                        {ratingFilters.map(rating => (
                            <SelectItem key={rating.value} value={rating.value}>{rating.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={filters.tier} onValueChange={value => handleFilterChange('tier', value)}>
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Filter by Tier..." />
                    </SelectTrigger>
                    <SelectContent>
                        {tiers.map(tier => (
                            <SelectItem key={tier} value={tier === 'All' ? 'all' : tier}>{tier}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                    <Select value={filters.verified} onValueChange={value => handleFilterChange('verified', value)}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue placeholder="Filter by Verification..." />
                        </SelectTrigger>
                        <SelectContent>
                            {verificationStatuses.map(status => (
                                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {activeFiltersCount > 0 && (
                      <Button variant="ghost" size="icon" onClick={clearFilters} className="h-8 w-8 text-xs">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Clear Filters</span>
                      </Button>
                    )}
                </div>
            </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                 <Button variant="ghost" onClick={() => requestSort('name')}>
                    User
                    {getSortIcon('name')}
                  </Button>
              </TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="hidden sm:table-cell">
                <Button variant="ghost" onClick={() => requestSort('memberSince')}>
                    Member Since
                    {getSortIcon('memberSince')}
                </Button>
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <Button variant="ghost" onClick={() => requestSort('tier')}>
                    Installer Tier
                    {getSortIcon('tier')}
                </Button>
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <Button variant="ghost" onClick={() => requestSort('rating')}>
                    Rating
                    {getSortIcon('rating')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('points')}>
                    Reputation
                    {getSortIcon('points')}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : sortedAndFilteredUsers.length > 0 ? (
              sortedAndFilteredUsers.map((user) => (
                <TableRow key={user.id} onClick={() => handleRowClick(user.id)} className="cursor-pointer">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AnimatedAvatar svg={user.avatarUrl} />
                        <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium">
                          <p>{user.name}</p>
                          <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
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
                      {format(toDate(user.memberSince), 'MMM, yyyy')}
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
                      {user.installerProfile && user.installerProfile.reviews > 0 ? (
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
              ))
            ) : (
               <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No users found for your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
