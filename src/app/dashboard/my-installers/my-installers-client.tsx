
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
import { Loader2, Star, Heart, UserX, Briefcase, Medal, Gem, Award, Search, Users, ShieldCheck, Mail, Zap, Tag, Clock, IndianRupee, X, Plus } from 'lucide-react';
import { useUser, useFirebase } from '@/hooks/use-user';
import { User, Job } from '@/lib/types';
import { getRefId } from '@/lib/utils';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { DocumentReference } from 'firebase/firestore';
import { useHelp } from '@/hooks/use-help';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { InstallerProfileModal } from '@/components/installers/installer-profile-modal';
import { InviteToJobDialog } from '@/components/my-installers/invite-to-job-dialog';
import { TagManagementDialog } from '@/components/my-installers/tag-management-dialog';
import { calculateBatchInstallerMetrics, InstallerRelationshipMetrics } from '@/lib/services/installer-relationship-metrics';
import { getInstallerTags, getAllUniqueTags, getInstallersByTag } from '@/lib/services/installer-tags';
import { formatDistanceToNow } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SmartSearch } from '@/components/ui/smart-search';
import Fuse from 'fuse.js';

const tierIcons: Record<string, React.ReactNode> = {
  Bronze: <Medal className="h-5 w-5 text-yellow-700" />,
  Silver: <Medal className="h-5 w-5 text-gray-400" />,
  Gold: <Award className="h-5 w-5 text-amber-500" />,
  Platinum: <Gem className="h-5 w-5 text-cyan-400" />,
};



const InstallerCard = ({
  installer,
  user,
  onUpdate,
  onClick,
  metrics,
  tags,
  onInvite,
  onHireAgain,
  onManageTags
}: {
  installer: User,
  user: User,
  onUpdate: (userId: string, action: 'favorite' | 'unfavorite' | 'block' | 'unblock') => void,
  onClick: (installer: User) => void,
  metrics?: InstallerRelationshipMetrics,
  tags: string[],
  onInvite: () => void,
  onHireAgain: () => void,
  onManageTags: () => void
}) => {
  const isFavorite = user.favoriteInstallerIds?.includes(installer.id);
  const isBlocked = user.blockedInstallerIds?.includes(installer.id);

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => onClick(installer)}>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AnimatedAvatar svg={installer.realAvatarUrl} />
            <AvatarFallback>{installer.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg"><span className="hover:underline text-primary">{installer.name}</span></CardTitle>
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
          <span className="text-muted-foreground flex items-center gap-1"><Star className="h-4 w-4" /> Platform Rating</span>
          <span className="font-semibold">{installer.installerProfile?.rating.toFixed(1)} ({installer.installerProfile?.reviews})</span>
        </div>

        {/* Phase 11: Performance Metrics */}
        {metrics && metrics.jobsCompleted > 0 && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Your Relationship</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Briefcase className="h-3 w-3" />
                <span>{metrics.jobsCompleted} jobs</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <IndianRupee className="h-3 w-3" />
                <span>₹{metrics.totalSpent.toLocaleString()}</span>
              </div>
              {metrics.avgRatingFromYou > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{metrics.avgRatingFromYou.toFixed(1)} from you</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-green-600">
                <Clock className="h-3 w-3" />
                <span>{metrics.onTimePercentage}% on-time</span>
              </div>
            </div>
            {metrics.lastHiredDate && (
              <p className="text-xs text-muted-foreground">
                Last hired: {formatDistanceToNow(metrics.lastHiredDate)} ago
              </p>
            )}
          </div>
        )}

        {/* Phase 11: Tags */}
        {tags.length > 0 && (
          <div className="pt-2">
            <div className="flex flex-wrap gap-1">
              {tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Top Skills</p>
          <div className="flex flex-wrap gap-1">
            {(installer.installerProfile?.skills || []).slice(0, 3).map(skill => (
              <Badge key={skill} variant="secondary" className="capitalize text-xs">{skill}</Badge>
            ))}
          </div>
        </div>
      </CardContent>

      {/* Phase 11: Enhanced Actions */}
      <CardContent className="space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onInvite}>
            <Mail className="mr-2 h-4 w-4" /> Invite
          </Button>
          <Button size="sm" className="flex-1" onClick={onHireAgain}>
            <Zap className="mr-2 h-4 w-4" /> Hire Again
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant={isFavorite ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => onUpdate(installer.id, isFavorite ? 'unfavorite' : 'favorite')}>
            <Heart className="mr-2 h-4 w-4" /> {isFavorite ? 'Favorited' : 'Favorite'}
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onManageTags}>
            <Tag className="mr-2 h-4 w-4" /> Tags
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


export default function MyInstallersClient({ initialInstallers }: { initialInstallers?: User[] }) {
  const { user, setUser, role } = useUser();
  const { db } = useFirebase();
  const [loading, setLoading] = useState(!initialInstallers);
  const [installers, setInstallers] = useState<User[]>(initialInstallers || []);
  const [search, setSearch] = useState('');
  const { setHelp } = useHelp();
  const [selectedInstaller, setSelectedInstaller] = useState<User | null>(null);
  const router = useRouter();

  // Phase 11: New state
  const [metricsMap, setMetricsMap] = useState<Map<string, InstallerRelationshipMetrics>>(new Map());
  const [inviteDialogInstaller, setInviteDialogInstaller] = useState<User | null>(null);
  const [tagDialogInstaller, setTagDialogInstaller] = useState<User | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('all');

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
          <p>This is your personal CRM for managing installers you&apos;ve worked with on the platform.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">Previously Hired:</span> A list of all installers who have completed jobs for you. This is your primary network.</li>
            <li><span className="font-semibold">Favorites:</span> From your &quot;Previously Hired&quot; list, you can add installers to this curated list for quick access when you want to use the &quot;Direct Award&quot; feature.</li>
            <li><span className="font-semibold">Blocked:</span> Add installers from your &quot;Previously Hired&quot; list here to prevent them from seeing or bidding on your future public jobs.</li>
          </ul>
        </div>
      ),
    });
  }, [setHelp]);

  const fetchRelatedInstallers = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { getRelatedInstallersAction } = await import('@/app/actions/user.actions');
      const res = await getRelatedInstallersAction(user.id);

      if (res.success && res.installers) {
        setInstallers(res.installers);
      } else {
        console.error("Failed to fetch installers:", res.error);
      }
    } catch (err) {
      console.error("Error in fetchRelatedInstallers:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Only fetch client-side if we DO NOT have initial data
    if (!initialInstallers && user) {
      fetchRelatedInstallers();
    }
  }, [db, user, fetchRelatedInstallers, initialInstallers]);

  // Phase 11: Fetch metrics for all installers
  useEffect(() => {
    const loadMetrics = async () => {
      if (!db || !user || installers.length === 0) return;

      const installerIds = installers.map(i => i.id);
      const metrics = await calculateBatchInstallerMetrics(db, user.id, installerIds);
      setMetricsMap(metrics);
    };

    loadMetrics();
  }, [db, user, installers]);

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

  // Phase 11: Filter by tags first, then search
  const filteredByTag = useMemo(() => {
    if (!selectedTag || selectedTag === 'all') return installers;
    if (!user) return installers;
    const taggedIds = getInstallersByTag(user, selectedTag);
    return installers.filter(i => taggedIds.includes(i.id));
  }, [installers, selectedTag, user]);

  // Phase 11: Get all unique tags for filter
  const allTags = useMemo(() => {
    if (!user) return [];
    return getAllUniqueTags(user);
  }, [user]);

  // Phase 11 Enhancement #6: Build suggestions for SmartSearch
  const searchSuggestions = useMemo(() => {
    const names = filteredByTag.map(i => i.name);
    const skills = Array.from(new Set(filteredByTag.flatMap(i => i.installerProfile?.skills || [])));
    const tags = allTags;
    return [...names, ...skills, ...tags].filter(Boolean);
  }, [filteredByTag, allTags]);

  // Phase 11 Enhancement #6: Fuzzy search with Fuse.js
  const filteredInstallers = useMemo(() => {
    if (!search) return filteredByTag;
    const fuse = new Fuse(filteredByTag, {
      keys: ['name', 'installerProfile.skills'],
      threshold: 0.3,
      ignoreLocation: true,
    });
    return fuse.search(search).map(r => r.item);
  }, [filteredByTag, search]);

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
    if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (installerList.length === 0) {
      return <p className="text-muted-foreground text-center py-8">{emptyText}</p>;
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {installerList.map(installer => (
          <InstallerCard
            key={installer.id}
            installer={installer}
            user={user}
            onUpdate={handleUpdate}
            onClick={setSelectedInstaller}
            metrics={metricsMap.get(installer.id)}
            tags={getInstallerTags(user, installer.id)}
            onInvite={() => setInviteDialogInstaller(installer)}
            onHireAgain={() => router.push(`/dashboard/post-job?directAward=${installer.id}`)}
            onManageTags={() => setTagDialogInstaller(installer)}
          />
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
          <div className="flex gap-2">
            {/* Phase 11: Tag Filter */}
            {allTags.length > 0 && (
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <SmartSearch
              placeholder="Search by name or skill..."
              onSearch={(query) => setSearch(query)}
              suggestions={searchSuggestions}
              enableHistory
              storageKey="smartSearch_my_installers"
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
      {selectedInstaller && (
        <InstallerProfileModal
          installer={selectedInstaller}
          isOpen={!!selectedInstaller}
          onClose={() => setSelectedInstaller(null)}
          currentUser={user}
          onUpdateAction={handleUpdate}
        />
      )}

      {/* Phase 11: New Dialogs */}
      {inviteDialogInstaller && user && (
        <InviteToJobDialog
          isOpen={!!inviteDialogInstaller}
          onClose={() => setInviteDialogInstaller(null)}
          installer={inviteDialogInstaller}
          currentUser={user}
        />
      )}

      {tagDialogInstaller && user && (
        <TagManagementDialog
          isOpen={!!tagDialogInstaller}
          onClose={() => setTagDialogInstaller(null)}
          installer={tagDialogInstaller}
          currentUser={user}
          onTagsUpdated={fetchRelatedInstallers}
        />
      )}
    </Card >
  );
}
