
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AnimatedAvatar } from '@/components/ui/animated-avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, Heart, UserX, Briefcase, Medal, Gem, Award, Search, Users, ShieldCheck } from 'lucide-react';
import { useUser, useFirebase } from '@/hooks/use-user';
import { User, Job } from '@/lib/types';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { DocumentReference } from 'firebase/firestore';
import { useHelp } from '@/hooks/use-help';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const tierIcons: Record<string, React.ReactNode> = {
  Bronze: <Medal className="h-5 w-5 text-yellow-700" />,
  Silver: <Medal className="h-5 w-5 text-gray-400" />,
  Gold: <Award className="h-5 w-5 text-amber-500" />,
  Platinum: <Gem className="h-5 w-5 text-cyan-400" />,
};

const getRefId = (ref: any): string | null => {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return ref.id || null;
}

const InstallerCard = ({ installer, user, onUpdate }: { installer: User, user: User, onUpdate: (userId: string, action: 'favorite' | 'unfavorite' | 'block' | 'unblock') => void }) => {
  const isFavorite = user.favoriteInstallerIds?.includes(installer.id);
  const isBlocked = user.blockedInstallerIds?.includes(installer.id);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AnimatedAvatar svg={installer.realAvatarUrl} />
            <AvatarFallback>{installer.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg"><Link href={`/dashboard/users/${installer.id}`} className="hover:underline">{installer.name}</Link></CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {installer.installerProfile && tierIcons[installer.installerProfile.tier]}
              <span>{installer.installerProfile?.tier} Tier</span>
              {installer.installerProfile?.verified && <ShieldCheck className="h-4 w-4 text-green-600" />}
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
      <CardContent>
        <div className="flex gap-2">
          <Button variant={isFavorite ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => onUpdate(installer.id, isFavorite ? 'unfavorite' : 'favorite')}>
            <Heart className="mr-2 h-4 w-4" /> {isFavorite ? 'Favorited' : 'Favorite'}
          </Button>
          <Button variant={isBlocked ? 'destructive' : 'outline'} size="sm" className="flex-1" onClick={() => onUpdate(installer.id, isBlocked ? 'unblock' : 'block')}>
            <UserX className="mr-2 h-4 w-4" /> {isBlocked ? 'Blocked' : 'Block'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


export default function MyInstallersPage() {
  const { user, setUser, role } = useUser();
  const { db } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [installers, setInstallers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const { setHelp } = useHelp();
  const router = useRouter();

  useEffect(() => {
    if (role && role !== 'Job Giver') {
        router.push('/dashboard');
    }
  }, [role, router]);

  useEffect(() => {
    setHelp({
      title: 'My Installers',
      content: (
        <div className="space-y-4 text-sm">
          <p>This is your personal CRM for managing installers you've worked with on the platform.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">Previously Hired:</span> A list of all installers who have completed jobs for you. This is your primary network.</li>
            <li><span className="font-semibold">Favorites:</span> From your "Previously Hired" list, you can add installers to this curated list for quick access when you want to use the "Direct Award" feature.</li>
            <li><span className="font-semibold">Blocked:</span> Add installers from your "Previously Hired" list here to prevent them from seeing or bidding on your future public jobs.</li>
          </ul>
        </div>
      ),
    });
  }, [setHelp]);

  const fetchRelatedInstallers = useCallback(async () => {
    if (!db || !user) return;
    setLoading(true);
    
    // Get all jobs posted by the current user that are completed
    const jobsQuery = query(
        collection(db, 'jobs'), 
        where('jobGiver', '==', doc(db, 'users', user.id)),
        where('status', '==', 'Completed')
    );
    const jobsSnapshot = await getDocs(jobsQuery);
    
    const hiredInstallerIds = new Set<string>();

    jobsSnapshot.docs.forEach(jobDoc => {
      const jobData = jobDoc.data() as Job;
      const awardedId = getRefId(jobData.awardedInstaller);
      if (awardedId) hiredInstallerIds.add(awardedId);
    });

    // Also include manually favorited/blocked installers so they always appear in their respective lists
    (user.favoriteInstallerIds || []).forEach(id => hiredInstallerIds.add(id));
    (user.blockedInstallerIds || []).forEach(id => hiredInstallerIds.add(id));
    
    const installerIdArray = Array.from(hiredInstallerIds);
    const fetchedInstallers: User[] = [];

    if (installerIdArray.length > 0) {
        for (let i = 0; i < installerIdArray.length; i += 30) {
            const chunk = installerIdArray.slice(i, i + 30);
            const installersQuery = query(collection(db, 'users'), where('__name__', 'in', chunk));
            const installersSnapshot = await getDocs(installersQuery);
            installersSnapshot.forEach(doc => {
                fetchedInstallers.push({ id: doc.id, ...doc.data() } as User);
            });
        }
    }
    
    setInstallers(fetchedInstallers);
    setLoading(false);

  }, [db, user]);

  useEffect(() => {
    fetchRelatedInstallers();
  }, [fetchRelatedInstallers]);

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
  
  const filteredInstallers = useMemo(() => {
      if (!search) return installers;
      const lowercasedSearch = search.toLowerCase();
      return installers.filter(i => 
          i.name.toLowerCase().includes(lowercasedSearch) ||
          i.installerProfile?.skills?.some(s => s.toLowerCase().includes(lowercasedSearch))
      );
  }, [installers, search]);

  const { hired, favorites, blocked } = useMemo(() => {
    return {
      hired: filteredInstallers.filter(i => installers.some(inst => inst.id === i.id)),
      favorites: filteredInstallers.filter(i => user?.favoriteInstallerIds?.includes(i.id)),
      blocked: filteredInstallers.filter(i => user?.blockedInstallerIds?.includes(i.id)),
    };
  }, [filteredInstallers, user, installers]);

  if (loading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderTabContent = (installerList: User[], emptyText: string) => {
    if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>;
    if (installerList.length === 0) {
      return <p className="text-muted-foreground text-center py-8">{emptyText}</p>;
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {installerList.map(installer => (
          <InstallerCard key={installer.id} installer={installer} user={user} onUpdate={handleUpdate} />
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">My Installers</CardTitle>
            <CardDescription>Manage your network of previously hired, favorite, and blocked installers.</CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or skill..."
              className="pl-8 w-full sm:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hired">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hired"><Briefcase className="mr-2 h-4 w-4" />Hired</TabsTrigger>
            <TabsTrigger value="favorites"><Heart className="mr-2 h-4 w-4" />Favorites</TabsTrigger>
            <TabsTrigger value="blocked"><UserX className="mr-2 h-4 w-4" />Blocked</TabsTrigger>
          </TabsList>
          <TabsContent value="hired" className="pt-6">
            {renderTabContent(hired, "You haven't hired any installers yet.")}
          </TabsContent>
          <TabsContent value="favorites" className="pt-6">
            {renderTabContent(favorites, "You haven't added any installers to your favorites.")}
          </TabsContent>
          <TabsContent value="blocked" className="pt-6">
            {renderTabContent(blocked, "Your blocked list is empty.")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
