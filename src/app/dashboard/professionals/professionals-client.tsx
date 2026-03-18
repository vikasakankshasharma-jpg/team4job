
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
import { ProfessionalProfileModal } from '@/components/professionals/professional-profile-modal';
import { SmartSearch } from '@/components/ui/smart-search';
import Fuse from 'fuse.js';
import { useTranslations } from 'next-intl';

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

const ProfessionalCard = ({ Professional, currentUser, onUpdate, onClick }: { Professional: User, currentUser: User, onUpdate: (professionalId: string, action: 'favorite' | 'unfavorite' | 'block' | 'unblock') => void, onClick: (Professional: User) => void }) => {
  const t = useTranslations('Professionals');
  const isFavorite = currentUser.favoriteProfessionalIds?.includes(Professional.id);
  const isBlocked = currentUser.blockedProfessionalIds?.includes(Professional.id);

  const lastActive = Professional.lastActiveAt || Professional.lastLoginAt || Professional.memberSince;
  const daysSinceActive = (new Date().getTime() - toDate(lastActive).getTime()) / (1000 * 3600 * 24);
  const isGhost = daysSinceActive > 30;

  return (
    <Card className={`cursor-pointer transition-shadow hover:shadow-md ${isGhost ? "border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20" : ""}`} onClick={() => onClick(Professional)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AnimatedAvatar svg={Professional.realAvatarUrl} />
            <AvatarFallback>{Professional.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex justify-between items-center">
              <span className="hover:underline text-primary truncate pr-2">{Professional.name}</span>
              {isGhost && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span onClick={(e) => e.stopPropagation()} className="flex items-center text-xs font-normal text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 cursor-help flex-shrink-0">
                      <Zap className="h-3 w-3 mr-1" />
                      {t('inactive')}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('inactiveTooltip', { days: Math.floor(daysSinceActive) })}
                  </TooltipContent>
                </Tooltip>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {Professional.professionalProfile && tierIcons[Professional.professionalProfile.tier]}
              <span>{t('tier', { tier: t(`tier${Professional.professionalProfile?.tier || 'Bronze'}`) })}</span>
              {Professional.professionalProfile?.verified && <ShieldCheck className="h-4 w-4 text-green-600" />}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm pb-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1"><Star className="h-4 w-4" /> {t('rating')}</span>
          <span className="font-semibold">{Professional.professionalProfile?.rating.toFixed(1)} ({Professional.professionalProfile?.reviews} {t('reviews')})</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1"><Briefcase className="h-4 w-4" /> {t('jobsCompleted')}</span>
          <span className="font-semibold">{Professional.professionalProfile?.reviews || 0}</span>
        </div>
        <div className="pt-2">
          <p className="text-xs font-semibold text-muted-foreground mb-1">{t('topSkills')}</p>
          <div className="flex flex-wrap gap-1">
            {(Professional.professionalProfile?.skills || []).slice(0, 3).map(skill => (
              <Badge key={skill} variant="secondary" className="capitalize">{skill}</Badge>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
          <Button variant={isFavorite ? 'default' : 'outline'} size="sm" className="flex-1 min-h-[44px]" onClick={() => onUpdate(Professional.id, isFavorite ? 'unfavorite' : 'favorite')}>
            <Heart className="mr-2 h-4 w-4" /> {isFavorite ? t('favorited') : t('favorite')}
          </Button>
          <Button variant={isBlocked ? 'destructive' : 'outline'} size="sm" className="flex-1 min-h-[44px]" onClick={() => onUpdate(Professional.id, isBlocked ? 'unblock' : 'block')}>
            <UserX className="mr-2 h-4 w-4" /> {isBlocked ? t('blocked') : t('block')}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default function ProfessionalsClient() {
  const t = useTranslations('Professionals');
  const tCommon = useTranslations('common');
  const { user, setUser, role, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [Professionals, setProfessionals] = useState<User[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedProfessional, setSelectedProfessional] = useState<User | null>(null);

  // Phase 11 Enhancement #6: Build suggestions for SmartSearch
  const searchSuggestions = useMemo(() => {
    const names = Professionals.map(p => p.name);
    const skills = Array.from(new Set(Professionals.flatMap(p => p.professionalProfile?.skills || [])));
    const specialties = Array.from(new Set(Professionals.flatMap(p => p.professionalProfile?.specialties || [])));
    return [...names, ...skills, ...specialties].filter(Boolean);
  }, [Professionals]);
  const { setHelp } = useHelp();
  const router = useRouter();

  const isSubscribed = user?.subscription && toDate(user.subscription.expiresAt) > new Date();

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
            <li><span className="font-semibold">{t('guide.premiumLabel')}</span> {t('guide.premiumDesc')}</li>
            <li><span className="font-semibold">{t('guide.searchLabel')}</span> {t('guide.searchDesc')}</li>
            <li><span className="font-semibold">{t('guide.reviewLabel')}</span> {t('guide.reviewDesc')}</li>
            <li><span className="font-semibold">{t('guide.actionLabel')}</span> {t('guide.actionDesc')}</li>
          </ul>
        </div>
      ),
    });
  }, [setHelp, t]);

  // Keep Professionals in a ref to avoid fetchProfessionals dependency on state
  const ProfessionalsRef = React.useRef<User[]>(Professionals);
  useEffect(() => {
    ProfessionalsRef.current = Professionals;
  }, [Professionals]);

  const fetchProfessionals = React.useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadMoreLoading(true);
    } else {
      setLoading(true);
    }

    try {
      const { listProfessionalsAction } = await import('@/app/actions/user.actions');

      let lastMemberSince: string | undefined = undefined;
      const currentProfessionals = ProfessionalsRef.current;
      if (isLoadMore && currentProfessionals.length > 0) {
        const lastProfessional = currentProfessionals[currentProfessionals.length - 1];
        const date = toDate(lastProfessional.memberSince);
        if (!isNaN(date.getTime())) {
          lastMemberSince = date.toISOString();
        }
      }

      const res = await listProfessionalsAction(50, lastMemberSince, true);

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to fetch Professionals');
      }

      const newProfessionals = res.data;

      if (isLoadMore) {
        setProfessionals(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const unique = newProfessionals.filter((i: User) => !existingIds.has(i.id));
          return [...prev, ...unique];
        });
      } else {
        setProfessionals(newProfessionals);
      }

      if (newProfessionals.length < 50) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (error) {
        // Failed to fetch Professionals
    } finally {
      if (isLoadMore) {
        setLoadMoreLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, []); // Stable dependencies

  useEffect(() => {
    if (!userLoading) {
      fetchProfessionals(false);
    }
  }, [userLoading, fetchProfessionals]);

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

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  // Phase 11 Enhancement #6: Fuzzy search with Fuse.js
  const filteredProfessionals = useMemo(() => {
    let result = Professionals;

    // Apply fuzzy search if query exists
    if (filters.search) {
      const fuse = new Fuse(Professionals, {
        keys: ['name', 'professionalProfile.skills', 'professionalProfile.specialties', 'professionalProfile.bio'],
        threshold: 0.3,
        ignoreLocation: true,
      });
      result = fuse.search(filters.search).map(r => r.item);
    }

    // Apply other filters
    result = result.filter(Professional => {
      if (filters.pincode && !Professional.pincodes?.residential?.includes(filters.pincode) && !Professional.pincodes?.office?.includes(filters.pincode)) return false;
      if (filters.tier !== "all" && Professional.professionalProfile?.tier !== filters.tier) return false;
      if (filters.skills.length > 0) {
        const hasSkill = filters.skills.some(skill => Professional.professionalProfile?.skills?.includes(skill));
        if (!hasSkill) return false;
      }
      return true;
    }).sort((a, b) => (b.professionalProfile?.points || 0) - (a.professionalProfile?.points || 0));

    return result;
  }, [Professionals, filters]);

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
        <CardTitle className="text-2xl">{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
        <div className="pt-4 flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Phase 11 Enhancement #6: SmartSearch with fuzzy matching */}
          <SmartSearch
            placeholder={t('searchPlaceholder')}
            onSearch={(query) => handleFilterChange('search', query)}
            suggestions={searchSuggestions}
            enableHistory
            storageKey="smartSearch_professionals"
            className="h-11"
          />
          <Input
            placeholder={t('pincodePlaceholder')}
            value={filters.pincode}
            onChange={(e) => handleFilterChange('pincode', e.target.value)}
            className="h-11"
          />
          <Select value={filters.tier} onValueChange={(v) => handleFilterChange('tier', v)}>
            <SelectTrigger className="h-11"><SelectValue placeholder={t('tierPlaceholder')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTiers')}</SelectItem>
              <SelectItem value="Platinum">{t('tierPlatinum')}</SelectItem>
              <SelectItem value="Gold">{t('tierGold')}</SelectItem>
              <SelectItem value="Silver">{t('tierSilver')}</SelectItem>
              <SelectItem value="Bronze">{t('tierBronze')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.skills[0] || 'all'} onValueChange={(v) => handleFilterChange('skills', v === 'all' ? [] : [v])}>
            <SelectTrigger className="h-11"><SelectValue placeholder={t('skillPlaceholder')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allSkills')}</SelectItem>
              {allSkills.map(skill => <SelectItem key={skill} value={skill} className="capitalize">{skill}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          {loading ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filteredProfessionals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProfessionals.map(professional => (
                <ProfessionalCard
                  key={professional.id}
                  Professional={professional}
                  currentUser={user}
                  onUpdate={handleUpdate}
                  onClick={setSelectedProfessional}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">{t('noProfessionalsFound')}</p>
          )}
        </TooltipProvider>

        {!loading && hasMore && filteredProfessionals.length > 0 && !filters.search && (
          <div className="flex justify-center mt-6">
            <Button variant="outline" onClick={() => fetchProfessionals(true)} disabled={loadMoreLoading}>
              {loadMoreLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon('loadMore')}
            </Button>
          </div>
        )}

        {selectedProfessional && (
          <ProfessionalProfileModal
            Professional={selectedProfessional}
            isOpen={!!selectedProfessional}
            onClose={() => setSelectedProfessional(null)}
            currentUser={user}
            onUpdateAction={handleUpdate}
          />
        )}
      </CardContent>
    </Card>
  );
}


