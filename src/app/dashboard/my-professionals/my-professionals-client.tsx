
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
import { useUser } from '@/hooks/use-user';
import { useFirebase } from '@/infrastructure/firebase/client-provider';
import { User, Job } from '@/lib/types';
import { getRefId } from '@/lib/utils';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { DocumentReference } from 'firebase/firestore';
import { useHelp } from '@/hooks/use-help';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProfessionalProfileModal } from '@/components/professionals/professional-profile-modal';
import { InviteToJobDialog } from '@/components/my-professionals/invite-to-job-dialog';
import { TagManagementDialog } from '@/components/my-professionals/tag-management-dialog';
import { calculateBatchProfessionalMetrics, ProfessionalRelationshipMetrics } from '@/lib/services/professional-relationship-metrics';
import { getProfessionalTags, getAllUniqueTags, getProfessionalsByTag } from '@/lib/services/professional-tags';
import { formatDistanceToNow } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SmartSearch } from '@/components/ui/smart-search';
import Fuse from 'fuse.js';
import { useTranslations } from 'next-intl';
import { useServiceHistory } from '@/lib/hooks/use-service-history';

const tierIcons: Record<string, React.ReactNode> = {
  Bronze: <Medal className="h-5 w-5 text-yellow-700" />,
  Silver: <Medal className="h-5 w-5 text-gray-400" />,
  Gold: <Award className="h-5 w-5 text-amber-500" />,
  Platinum: <Gem className="h-5 w-5 text-cyan-400" />,
};



const ProfessionalCard = ({
  Professional,
  user,
  onUpdate,
  onClick,
  metrics,
  tags,
  onInvite,
  onHireAgain,
  onManageTags
}: {
  Professional: User,
  user: User,
  onUpdate: (userId: string, action: 'favorite' | 'unfavorite' | 'block' | 'unblock') => void,
  onClick: (Professional: User) => void,
  metrics?: ProfessionalRelationshipMetrics,
  tags: string[],
  onInvite: () => void,
  onHireAgain: () => void,
  onManageTags: () => void
}) => {
  const t = useTranslations('myProfessionals');
  const tProfessionals = useTranslations('Professionals');
  const isFavorite = user.favoriteProfessionalIds?.includes(Professional.id);
  const isBlocked = user.blockedProfessionalIds?.includes(Professional.id);

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => onClick(Professional)}>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AnimatedAvatar svg={Professional.realAvatarUrl} />
            <AvatarFallback>{Professional.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg"><span className="hover:underline text-primary">{Professional.name}</span></CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {Professional.professionalProfile && (
                <>
                  {tierIcons[Professional.professionalProfile.tier]}
                  <span>{tProfessionals('tier', { tier: Professional.professionalProfile.tier as string })}</span>
                </>
              )}
              {Professional.professionalProfile?.verified && <ShieldCheck className="h-4 w-4 text-green-600" />}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1"><Star className="h-4 w-4" /> {t('platformRating')}</span>
          <span className="font-semibold">{Professional.professionalProfile?.rating.toFixed(1)} ({Professional.professionalProfile?.reviews})</span>
        </div>

        {/* Phase 11: Performance Metrics */}
        {metrics && metrics.jobsCompleted > 0 && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">{t('yourRelationship')}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Briefcase className="h-3 w-3" />
                <span>{t('jobsCompleted', { count: metrics.jobsCompleted })}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <IndianRupee className="h-3 w-3" />
                <span>{t('spent', { amount: metrics.totalSpent.toLocaleString() })}</span>
              </div>
              {metrics.avgRatingFromYou > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{t('ratingFromYou', { rating: metrics.avgRatingFromYou.toFixed(1) })}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-green-600">
                <Clock className="h-3 w-3" />
                <span>{t('onTime', { percentage: metrics.onTimePercentage })}</span>
              </div>
            </div>
            {metrics.lastHiredDate && (
              <p className="text-xs text-muted-foreground">
                {t('lastHired', { time: formatDistanceToNow(metrics.lastHiredDate as Date) })}
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
          <p className="text-xs font-semibold text-muted-foreground mb-1">{tProfessionals('topSkills')}</p>
          <div className="flex flex-wrap gap-1">
            {(Professional.professionalProfile?.skills || []).slice(0, 3).map(skill => (
              <Badge key={skill} variant="secondary" className="capitalize text-xs">{skill}</Badge>
            ))}
          </div>
        </div>
      </CardContent>

      {/* Phase 11: Enhanced Actions */}
      <CardContent className="space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onInvite}>
            <Mail className="mr-2 h-4 w-4" /> {t('invite')}
          </Button>
          <Button size="sm" className="flex-1" onClick={onHireAgain}>
            <Zap className="mr-2 h-4 w-4" /> {t('hireAgain')}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant={isFavorite ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => onUpdate(Professional.id, isFavorite ? 'unfavorite' : 'favorite')}>
            <Heart className="mr-2 h-4 w-4" /> {isFavorite ? tProfessionals('favorited') : tProfessionals('favorite')}
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onManageTags}>
            <Tag className="mr-2 h-4 w-4" /> {t('tags')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


export default function MyProfessionalsClient({ initialProfessionals }: { initialProfessionals?: User[] }) {
  const t = useTranslations('myProfessionals');
  const tProfessionals = useTranslations('Professionals');
  const tCommon = useTranslations('common');
  const { user, setUser, role } = useUser();
  const { db } = useFirebase();
  const [loading, setLoading] = useState(!initialProfessionals);
  const [Professionals, setProfessionals] = useState<User[]>(initialProfessionals || []);
  const [search, setSearch] = useState('');
  const { setHelp } = useHelp();
  const [selectedProfessional, setSelectedProfessional] = useState<User | null>(null);
  const router = useRouter();

  const { data: serviceHistory = [] } = useServiceHistory(user?.id);

  // Phase 11: Map React Query history to metricsMap
  const metricsMap = useMemo(() => {
    const map = new Map<string, ProfessionalRelationshipMetrics>();
    serviceHistory.forEach((item: any) => {
      map.set(item.professional.id, item.metrics);
    });
    return map;
  }, [serviceHistory]);

  const [inviteDialogProfessional, setInviteDialogProfessional] = useState<User | null>(null);
  const [tagDialogProfessional, setTagDialogProfessional] = useState<User | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('all');

  useEffect(() => {
    if (role && role !== 'Client') {
      router.push('/dashboard');
    }
  }, [role, router]);

  useEffect(() => {
    setHelp({
      title: t('guide.title'),
      content: (
        <div className="space-y-4 text-sm">
          <p>{t('guide.content')}</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">{t('guide.hiredLabel')}</span> {t('guide.hiredDesc')}</li>
            <li><span className="font-semibold">{t('guide.favoritesLabel')}</span> {t('guide.favoritesDesc')}</li>
            <li><span className="font-semibold">{t('guide.blockedLabel')}</span> {t('guide.blockedDesc')}</li>
          </ul>
        </div>
      ),
    });
  }, [setHelp, t]);

  const fetchRelatedProfessionals = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { getRelatedProfessionalsAction } = await import('@/app/actions/user.actions');
      const res = await getRelatedProfessionalsAction(user.id);

      if (res.success && res.Professionals) {
        setProfessionals(res.Professionals);
      } else {
        // failed
      }
    } catch (err) {
      // error
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Only fetch client-side if we DO NOT have initial data
    if (!initialProfessionals && user) {
      queueMicrotask(() => {
        fetchRelatedProfessionals();
      });
    }
  }, [initialProfessionals, user, fetchRelatedProfessionals]);

  const handleUpdate = async (professionalId: string, action: 'favorite' | 'unfavorite' | 'block' | 'unblock') => {
    if (!user || !db) return;

    const userRef = doc(db, 'users', user.id);
    let updatePayload = {};

    switch (action) {
      case 'favorite': updatePayload = { favoriteProfessionalIds: arrayUnion(professionalId) }; break;
      case 'unfavorite': updatePayload = { favoriteProfessionalIds: arrayRemove(professionalId) }; break;
      case 'block': updatePayload = { blockedProfessionalIds: arrayUnion(professionalId) }; break;
      case 'unblock': updatePayload = { blockedProfessionalIds: arrayRemove(professionalId) }; break;
    }

    await updateDoc(userRef, updatePayload);

    // Optimistically update local user state
    setUser(prevUser => {
      if (!prevUser) return null;
      let newFavs = [...(prevUser.favoriteProfessionalIds || [])];
      let newBlocked = [...(prevUser.blockedProfessionalIds || [])];

      if (action === 'favorite') newFavs.push(professionalId);
      if (action === 'unfavorite') newFavs = newFavs.filter(id => id !== professionalId);
      if (action === 'block') newBlocked.push(professionalId);
      if (action === 'unblock') newBlocked = newBlocked.filter(id => id !== professionalId);

      return { ...prevUser, favoriteProfessionalIds: newFavs, blockedProfessionalIds: newBlocked };
    });
  };

  // Phase 11: Filter by tags first, then search
  const filteredByTag = useMemo(() => {
    if (!selectedTag || selectedTag === 'all') return Professionals;
    if (!user) return Professionals;
    const taggedIds = getProfessionalsByTag(user, selectedTag);
    return Professionals.filter(i => taggedIds.includes(i.id));
  }, [Professionals, selectedTag, user]);

  // Phase 11: Get all unique tags for filter
  const allTags = useMemo(() => {
    if (!user) return [];
    return getAllUniqueTags(user);
  }, [user]);

  // Phase 11 Enhancement #6: Build suggestions for SmartSearch
  const searchSuggestions = useMemo(() => {
    const names = filteredByTag.map(i => i.name);
    const skills = Array.from(new Set(filteredByTag.flatMap(i => i.professionalProfile?.skills || [])));
    const tags = allTags;
    return [...names, ...skills, ...tags].filter(Boolean);
  }, [filteredByTag, allTags]);

  // Phase 11 Enhancement #6: Fuzzy search with Fuse.js
  const filteredProfessionals = useMemo(() => {
    if (!search) return filteredByTag;
    const fuse = new Fuse(filteredByTag, {
      keys: ['name', 'professionalProfile.skills'],
      threshold: 0.3,
      ignoreLocation: true,
    });
    return fuse.search(search).map(r => r.item);
  }, [filteredByTag, search]);

  const { hired, favorites, blocked } = useMemo(() => {
    // hired comes directly from serviceHistory hook
    const hiredPros = serviceHistory.map((item: any) => item.professional as User);
    
    // Apply search filter to hired pros
    const filteredHired = search ? new Fuse(hiredPros, {
      keys: ['name', 'professionalProfile.skills'],
      threshold: 0.3,
      ignoreLocation: true,
    }).search(search).map(r => r.item) : hiredPros;

    return {
      hired: filteredHired,
      favorites: filteredProfessionals.filter(i => user?.favoriteProfessionalIds?.includes(i.id)),
      blocked: filteredProfessionals.filter(i => user?.blockedProfessionalIds?.includes(i.id)),
    };
  }, [filteredProfessionals, user, serviceHistory, search]);

  if (loading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderTabContent = (ProfessionalList: User[], emptyText: string) => {
    if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (ProfessionalList.length === 0) {
      return <p className="text-muted-foreground text-center py-8">{emptyText}</p>;
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {ProfessionalList.map(Professional => (
          <ProfessionalCard
            key={Professional.id}
            Professional={Professional}
            user={user}
            onUpdate={handleUpdate}
            onClick={setSelectedProfessional}
            metrics={metricsMap.get(Professional.id)}
            tags={getProfessionalTags(user, Professional.id)}
            onInvite={() => setInviteDialogProfessional(Professional)}
            onHireAgain={() => router.push(`/dashboard/post-job?directAward=${Professional.id}`)}
            onManageTags={() => setTagDialogProfessional(Professional)}
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
            <CardTitle className="text-2xl">{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <div className="flex gap-2">
            {/* Phase 11: Tag Filter */}
            {allTags.length > 0 && (
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t('filterByTag')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTags')}</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <SmartSearch
              placeholder={tProfessionals('searchPlaceholder')}
              onSearch={(query) => setSearch(query)}
              suggestions={searchSuggestions}
              enableHistory
              storageKey="smartSearch_my_professionals"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hired">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hired"><Briefcase className="mr-2 h-4 w-4" />{t('tabs.hired')}</TabsTrigger>
            <TabsTrigger value="favorites"><Heart className="mr-2 h-4 w-4" />{t('tabs.favorites')}</TabsTrigger>
            <TabsTrigger value="blocked"><UserX className="mr-2 h-4 w-4" />{t('tabs.blocked')}</TabsTrigger>
          </TabsList>
          <TabsContent value="hired" className="pt-6">
            {renderTabContent(hired, t('empty.hired'))}
          </TabsContent>
          <TabsContent value="favorites" className="pt-6">
            {renderTabContent(favorites, t('empty.favorites'))}
          </TabsContent>
          <TabsContent value="blocked" className="pt-6">
            {renderTabContent(blocked, t('empty.blocked'))}
          </TabsContent>
        </Tabs>
      </CardContent>
      {selectedProfessional && (
        <ProfessionalProfileModal
          Professional={selectedProfessional}
          isOpen={!!selectedProfessional}
          onClose={() => setSelectedProfessional(null)}
          currentUser={user}
          onUpdateAction={handleUpdate}
        />
      )}

      {/* Phase 11: New Dialogs */}
      {inviteDialogProfessional && user && (
        <InviteToJobDialog
          isOpen={!!inviteDialogProfessional}
          onClose={() => setInviteDialogProfessional(null)}
          Professional={inviteDialogProfessional}
          currentUser={user}
        />
      )}

      {tagDialogProfessional && user && (
        <TagManagementDialog
          isOpen={!!tagDialogProfessional}
          onClose={() => setTagDialogProfessional(null)}
          Professional={tagDialogProfessional}
          currentUser={user}
          onTagsUpdated={fetchRelatedProfessionals}
        />
      )}
    </Card >
  );
}


