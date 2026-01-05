
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AnimatedAvatar } from '@/components/ui/animated-avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, Briefcase, Medal, Gem, Award, Search, ShieldCheck, UserX, Heart, Zap } from 'lucide-react';
import { useUser, useFirebase } from '@/hooks/use-user';
import { User } from '@/lib/types';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useHelp } from '@/hooks/use-help';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { allSkills } from '@/lib/data';
import { toDate } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const tierIcons: Record<string, React.ReactNode> = {
  Bronze: <Medal className="h-5 w-5 text-yellow-700" />,
  Silver: <Medal className="h-5 w-5 text-gray-400" />,
  Gold: <Award className="h-5 w-5 text-amber-500" />,
  Platinum: <Gem className="h-5 w-5 text-cyan-400" />,
};

const initialFilters = {
  search: "",
  tier: "all",
  skills: [] as string[],
  pincode: ""
};

const InstallerCard = ({ installer, currentUser, onUpdate }: { installer: User, currentUser: User, onUpdate: (installerId: string, action: 'favorite' | 'unfavorite' | 'block' | 'unblock') => void }) => {
  const isFavorite = currentUser.favoriteInstallerIds?.includes(installer.id);
  const isBlocked = currentUser.blockedInstallerIds?.includes(installer.id);

  const lastActive = installer.lastActiveAt || installer.lastLoginAt || installer.memberSince;
  const daysSinceActive = (new Date().getTime() - toDate(lastActive).getTime()) / (1000 * 3600 * 24);
  const isGhost = daysSinceActive > 30;

  return (
    <Card className={isGhost ? "border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20" : ""}>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AnimatedAvatar svg={installer.realAvatarUrl} />
            <AvatarFallback>{installer.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg flex justify-between">
              <Link href={`/dashboard/users/${installer.id}`} className="hover:underline">{installer.name}</Link>
              {isGhost && (
                <Tooltip>
                  <TooltipTrigger>
                    <span className="flex items-center text-xs font-normal text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      <Zap className="h-3 w-3 mr-1" />
                      Inactive
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    This installer hasn&apos;t been online for {Math.floor(daysSinceActive)} days. Response may be slow.
                  </TooltipContent>
                </Tooltip>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {installer.installerProfile && tierIcons[installer.installerProfile.tier]}
              <span>{installer.installerProfile?.tier} Tier</span>
              <ShieldCheck className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1"><Star className="h-4 w-4" /> Rating</span>
          <span className="font-semibold">{installer.installerProfile?.rating.toFixed(1)} ({installer.installerProfile?.reviews} reviews)</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1"><Briefcase className="h-4 w-4" /> Jobs Completed</span>
          <span className="font-semibold">{installer.installerProfile?.reviews || 0}</span>
        </div>
        <div className="pt-2">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Top Skills</p>
          <div className="flex flex-wrap gap-1">
            {(installer.installerProfile?.skills || []).slice(0, 3).map(skill => (
              <Badge key={skill} variant="secondary" className="capitalize">{skill}</Badge>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex gap-2 w-full">
          <Button variant={isFavorite ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => onUpdate(installer.id, isFavorite ? 'unfavorite' : 'favorite')}>
            <Heart className="mr-2 h-4 w-4" /> {isFavorite ? 'Favorited' : 'Favorite'}
          </Button>
          <Button variant={isBlocked ? 'destructive' : 'outline'} size="sm" className="flex-1" onClick={() => onUpdate(installer.id, isBlocked ? 'unblock' : 'block')}>
            <UserX className="mr-2 h-4 w-4" /> {isBlocked ? 'Blocked' : 'Block'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default function InstallersClient() {
  const { user, setUser, role, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [installers, setInstallers] = useState<User[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const { setHelp } = useHelp();
  const router = useRouter();

  const isSubscribed = user?.subscription && toDate(user.subscription.expiresAt) > new Date();

  useEffect(() => {
    if (role && role !== 'Job Giver') {
      router.push('/dashboard');
    }
  }, [role, router]);

  useEffect(() => {
    setHelp({
      title: 'Find Installers',
      content: (
        <div className="space-y-4 text-sm">
          <p>This is your directory to discover and vet professional installers on the platform.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">Premium Feature:</span> Access to this directory requires an active subscription.</li>
            <li><span className="font-semibold">Search & Filter:</span> Use the filters to find installers by name, location (pincode), skill set, or reputation tier.</li>
            <li><span className="font-semibold">Review Profiles:</span> Click on any installer&apos;s name to view their detailed profile, including their full work history and reviews.</li>
            <li><span className="font-semibold">Favorite & Block:</span> Use the action buttons to add installers to your personal &quot;Favorite&quot; list for future Direct Awards, or &quot;Block&quot; them to prevent them from bidding on your jobs.</li>
          </ul>
        </div>
      ),
    });
  }, [setHelp]);

  useEffect(() => {
    if (userLoading) return;
    const fetchInstallers = async () => {
      if (!db) return;
      setLoading(true);
      const q = query(
        collection(db, 'public_profiles'),
        where('roles', 'array-contains', 'Installer'),
        where('installerProfile.verified', '==', true)
      );
      const snapshot = await getDocs(q);
      const installerList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setInstallers(installerList);
      setLoading(false);
    };
    fetchInstallers();
  }, [db, isSubscribed, userLoading, router]);

  const handleUpdate = async (installerId: string, action: 'favorite' | 'unfavorite' | 'block' | 'unblock') => {
    if (!user || !db) return;

    const userRef = doc(db, 'users', user.id);
    let updatePayload = {};

    switch (action) {
      case 'favorite': updatePayload = { favoriteInstallerIds: arrayUnion(installerId) }; break;
      case 'unfavorite': updatePayload = { favoriteInstallerIds: arrayRemove(installerId) }; break;
      case 'block': updatePayload = { blockedInstallerIds: arrayUnion(installerId) }; break;
      case 'unblock': updatePayload = { blockedInstallerIds: arrayRemove(installerId) }; break;
    }

    await updateDoc(userRef, updatePayload);

    // Optimistically update local user state
    setUser(prevUser => {
      if (!prevUser) return null;
      let newFavs = [...(prevUser.favoriteInstallerIds || [])];
      let newBlocked = [...(prevUser.blockedInstallerIds || [])];

      if (action === 'favorite') newFavs.push(installerId);
      if (action === 'unfavorite') newFavs = newFavs.filter(id => id !== installerId);
      if (action === 'block') newBlocked.push(installerId);
      if (action === 'unblock') newBlocked = newBlocked.filter(id => id !== installerId);

      return { ...prevUser, favoriteInstallerIds: newFavs, blockedInstallerIds: newBlocked };
    });
  };

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const filteredInstallers = useMemo(() => {
    return installers.filter(installer => {
      if (filters.search && !installer.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.tier !== 'all' && installer.installerProfile?.tier !== filters.tier) return false;
      if (filters.pincode && (!installer.pincodes.residential?.includes(filters.pincode) && !installer.pincodes.office?.includes(filters.pincode))) return false;
      if (filters.skills.length > 0) {
        const installerSkills = new Set(installer.installerProfile?.skills || []);
        return filters.skills.every(skill => installerSkills.has(skill));
      }
      return true;
    }).sort((a, b) => (b.installerProfile?.points || 0) - (a.installerProfile?.points || 0));
  }, [installers, filters]);

  if (userLoading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loading || !isSubscribed) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Find Installers</CardTitle>
        <CardDescription>Browse and filter through all verified installers on the platform.</CardDescription>
        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Search by name..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <Input
            placeholder="Filter by pincode..."
            value={filters.pincode}
            onChange={(e) => handleFilterChange('pincode', e.target.value)}
          />
          <Select value={filters.tier} onValueChange={(v) => handleFilterChange('tier', v)}>
            <SelectTrigger><SelectValue placeholder="Filter by tier..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="Platinum">Platinum</SelectItem>
              <SelectItem value="Gold">Gold</SelectItem>
              <SelectItem value="Silver">Silver</SelectItem>
              <SelectItem value="Bronze">Bronze</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.skills[0] || 'all'} onValueChange={(v) => handleFilterChange('skills', v === 'all' ? [] : [v])}>
            <SelectTrigger><SelectValue placeholder="Filter by skill..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skills</SelectItem>
              {allSkills.map(skill => <SelectItem key={skill} value={skill} className="capitalize">{skill}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          {loading ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filteredInstallers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInstallers.map(installer => (
                <InstallerCard key={installer.id} installer={installer} currentUser={user} onUpdate={handleUpdate} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No installers found matching your criteria.</p>
          )}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
