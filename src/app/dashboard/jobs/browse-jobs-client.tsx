"use client";

import * as React from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ListFilter, X, Loader2, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JobCard } from "@/components/job-card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useHelp } from "@/hooks/use-help";
import { useUser } from "@/hooks/use-user";
import { allSkills } from "@/lib/data";
import type { Job, User } from "@/lib/types";
import { MapPin, Bell, Inbox, Bookmark, Navigation } from "lucide-react";
import { useSearch } from "@/hooks/use-search";
import { EmptyState, InlineEmptyState } from "@/components/ui/empty-state";
import { JobCardSkeletonGrid } from "@/components/skeletons/job-card-skeleton";
import { JobFilters } from "@/components/jobs/job-filters";
import { listOpenJobsAction } from "@/app/actions/job.actions";
import dynamic from "next/dynamic";
import { useTranslations } from 'next-intl';
import { toDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const SaveSearchDialog = dynamic(
  () => import("@/components/jobs/save-search-dialog").then((mod) => mod.SaveSearchDialog),
  { ssr: false }
);

// Helper function to extract location parts from a full address string
const getLocationParts = (
  fullAddress: string | undefined
): { city: string | null; state: string | null } => {
  if (!fullAddress) return { city: null, state: null };

  const parts = fullAddress.split(',').map(p => p.trim());

  if (parts.length >= 3) {
    const stateAndZip = parts[parts.length - 1].split(' ');
    const state = stateAndZip.length > 1 ? stateAndZip[0] : parts[parts.length - 1];
    return { city: parts[parts.length - 2], state: state };
  }

  return { city: null, state: null };
};

export default function BrowseJobsClient({ initialJobs }: { initialJobs?: Job[] }) {
  const { user, role, loading: userLoading } = useUser();
  const { setHelp } = useHelp();
  const router = useRouter();
  const tJob = useTranslations('job');
  const tCommon = useTranslations('common');
  const { searchQuery, setSearchQuery } = useSearch();
  const searchParams = useSearchParams();
  const [budget, setBudget] = React.useState([0, 150000]);
  const [selectedSkills, setSelectedSkills] = React.useState<string[]>([]);
  const [recommendedPincodeFilter, setRecommendedPincodeFilter] = React.useState("all");

  const [jobs, setJobs] = React.useState<Job[]>(initialJobs || []);
  // Pagination State
  const [loading, setLoading] = React.useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true); // Assuming initial load might have more if 50 returned

  // Keep jobs in a ref to avoid fetchJobs dependency on state
  const jobsRef = React.useRef<Job[]>(jobs);
  React.useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const fetchJobs = React.useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadMoreLoading(true);
    } else {
      setLoading(true);
    }

    try {
      // Determine cursor using ref
      let lastPostedAt: string | undefined = undefined;
      const currentJobs = jobsRef.current;
      if (isLoadMore && currentJobs.length > 0) {
        const lastJob = currentJobs[currentJobs.length - 1];
        // Handle Date/Timestamp/String conversion safely
        const dateObj = toDate(lastJob.postedAt);
        if (dateObj) {
          lastPostedAt = dateObj.toISOString();
        }
      }

      const res = await listOpenJobsAction(undefined, 50, lastPostedAt);

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to fetch jobs');
      }

      const newJobs = res.data;

      if (isLoadMore) {
        setJobs(prev => {
          // Deduplicate just in case
          const existingIds = new Set(prev.map(j => j.id));
          const uniqueNewJobs = newJobs.filter(j => !existingIds.has(j.id));
          return [...prev, ...uniqueNewJobs];
        });
      } else {
        setJobs(newJobs);
      }

      // Check if we reached end
      if (newJobs.length < 50) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

    } catch (error) {
      if (!isLoadMore) setJobs([]);
    } finally {
      if (isLoadMore) {
        setLoadMoreLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, []); // Stable dependencies

  React.useEffect(() => {
    // Only fetch initial if distinct from server-provided initialJobs or if valid to refetch
    if (!initialJobs || initialJobs.length === 0) {
      fetchJobs(false);
    } else {
      // If initialJobs provided, set hasMore based on count
      if (initialJobs.length < 50) setHasMore(false);
    }
  }, [initialJobs, fetchJobs]);

  React.useEffect(() => {
    setHelp({
      title: tJob('browseJobsGuideTitle'),
      content: (
        <div className="space-y-4 text-sm">
          <p>{tJob('browseJobsGuidePart1')}</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold">{tJob('pincodeSearch')}:</span> {tJob('pincodeSearchDesc')}
            </li>
            <li>
              <span className="font-semibold">{tJob('filterMenu')}:</span> {tJob('filterMenuDesc')}
              <ul className="list-disc space-y-1 pl-5 mt-1">
                <li>
                  <span className="font-semibold">{tJob('budgetRange')}:</span> {tJob('budgetRangeDesc')}
                </li>
                <li>
                  <span className="font-semibold">{tJob('skills')}:</span> {tJob('skillsFilterDesc')}
                </li>
              </ul>
            </li>
            <li>
              <span className="font-semibold">{tJob('clearFilters')}:</span> {tJob('clearFiltersDesc')}
            </li>
            <li>
              <span className="font-semibold">{tJob('recommendedTab')}:</span> {tJob('recommendedTabDesc')}
            </li>
          </ul>
          <p>{tJob('browseJobsGuideFooter')}</p>
        </div>
      )
    });
  }, [setHelp, tJob]);

  const filterJobs = (jobsToFilter: Job[]) => {
    return jobsToFilter.filter((job) => {
      // Search filter (Pincode or Title)
      if (searchQuery !== "") {
        const query = searchQuery.toLowerCase();
        const matchesPincode = job.location.toLowerCase().includes(query);
        const matchesTitle = job.title.toLowerCase().includes(query);
        if (!matchesPincode && !matchesTitle) {
          return false;
        }
      }

      // Budget filter
      if (job.priceEstimate && (job.priceEstimate.max < budget[0] || job.priceEstimate.min > budget[1])) {
        return false;
      }

      // Skills filter
      if (selectedSkills.length > 0) {
        const jobSkills = (job.skills || []).map(s => s.toLowerCase());
        // Use 'some' for OR logic (matches ANY skill) instead of 'every' (matches ALL skills)
        if (!selectedSkills.some(skill => jobSkills.includes(skill.toLowerCase()))) {
          return false;
        }
      }

      return true;
    });
  };


  const currentTab = searchParams.get('tab') || 'nearby';

  const handleTabChange = (value: string) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("tab", value);
    router.replace(`?${newSearchParams.toString()}`, { scroll: false });
  };

  // "All" tab should show currently open and unbid jobs.
  const openForBiddingJobs = React.useMemo(
    () => jobs.filter(job => job.status === 'Open for Bidding' || job.status === 'Unbid'),
    [jobs]
  );

  const filteredJobs = filterJobs(openForBiddingJobs);

  const recommendedJobs = React.useMemo(() => {
    if (!user?.professionalProfile) return [];

    const ProfessionalSkills = new Set(
      (user.professionalProfile.skills || []).map(s => s.toLowerCase())
    );
    const { city: ProfessionalCity, state: ProfessionalState } = getLocationParts(
      user.address?.fullAddress
    );

    const scoredJobs = jobs
      .map(job => {
        let score = 0;
        let locationMatchType: 'pincode' | 'city' | 'state' | null = null;

        // --- Tier 1 Match: Pincode ---
        const residentialMatch = user.pincodes?.residential &&
          job.location.includes(user.pincodes.residential);
        const officeMatch = user.pincodes?.office &&
          job.location.includes(user.pincodes.office);

        if (
          (recommendedPincodeFilter === "all" && (residentialMatch || officeMatch)) ||
          (recommendedPincodeFilter === "residential" && residentialMatch) ||
          (recommendedPincodeFilter === "office" && officeMatch)
        ) {
          locationMatchType = 'pincode';
          score += 20; // High score for direct pincode match
        }

        // --- Tier 2 & 3: City & State for Unbid/Promoted jobs ---
        const isPromoted = (job.travelTip || 0) > 0;
        if (job.status === 'Unbid' || isPromoted) {
          const { city: jobCity, state: jobState } = getLocationParts(
            job.fullAddress || ''
          );

          // Tier 2: City Match
          if (ProfessionalCity && jobCity &&
            jobCity.toLowerCase() === ProfessionalCity.toLowerCase()) {
            if (!locationMatchType) {
              locationMatchType = 'city';
              score += 10;
            }
          }
          // Tier 3: State Match
          else if (ProfessionalState && jobState &&
            jobState.toLowerCase() === ProfessionalState.toLowerCase()) {
            if (!locationMatchType) {
              locationMatchType = 'state';
              score += 5;
            }
          }
        }

        if (!locationMatchType) return null; // Exclude if no location match at all

        if (job.status === 'Unbid') {
          score += 5; // Boost unbid jobs to surface them
        }
        if (isPromoted) {
          score += 10; // Extra boost for promoted jobs
        }

        if (job.skills && job.skills.length > 0) {
          const jobSkills = new Set(job.skills.map(s => s.toLowerCase()));
          const matchingSkills = [...jobSkills].filter(skill =>
            ProfessionalSkills.has(skill)
          );
          score += matchingSkills.length * 5; // Add points for each matching skill
        }

        return { ...job, score, locationMatchType };
      })
      .filter((j): j is Job & {
        score: number;
        locationMatchType: 'pincode' | 'city' | 'state'
      } => j !== null);

    return scoredJobs.sort((a, b) => b.score - a.score);
  }, [user, jobs, recommendedPincodeFilter]);

  const filteredRecommendedJobs = filterJobs(recommendedJobs);

  const clearFilters = () => {
    setBudget([0, 150000]);
    setSelectedSkills([]);
  };

  const handleSkillChange = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const activeFiltersCount = [
    budget[0] !== 0 || budget[1] !== 150000,
    selectedSkills.length > 0
  ].filter(Boolean).length;

  // Auth guard: if user is loading, show skeleton
  if (userLoading) {
    return (
      <div className="space-y-10 pb-20 px-4 sm:px-6 lg:px-8">
        <JobCardSkeletonGrid count={6} />
      </div>
    );
  }

  // Not logged in: prompt to sign in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center px-4">
        <MapPin className="h-16 w-16 text-primary/40" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Browse Available Jobs</h2>
          <p className="text-muted-foreground max-w-sm">
            Sign in as a Professional to view and bid on jobs near you.
          </p>
        </div>
        <div className="flex gap-3">
          <a href="/login" className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors">
            Sign In
          </a>
          <a href="/login?tab=signup" className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-6 text-sm font-semibold transition-colors hover:bg-secondary/50">
            Create Account
          </a>
        </div>
      </div>
    );
  }

  // Wrong role: clients and admins don't browse jobs this way
  if (role === 'Admin' || role === 'Client') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center px-4">
        <MapPin className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground font-medium">
          This page is for Professionals. <a href="/dashboard" className="text-primary underline">Go to your dashboard</a>.
        </p>
      </div>
    );
  }

  return (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12 pb-20 px-4 sm:px-6 lg:px-8"
    >
        {/* Top Gradient Accent */}
        <div className="h-2 w-full bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x rounded-full opacity-50 mb-8" />

        <header className="mb-16 space-y-6">
            <Badge variant="outline" className="px-6 py-2 rounded-full border-primary/20 text-primary font-black text-[10px] uppercase tracking-[0.5em] bg-primary/10 backdrop-blur-3xl italic">
                INTELLIGENCE FEED // ACTIVE DISCOVERY
            </Badge>
            <div className="flex items-center gap-6">
                <h1 className="text-6xl sm:text-8xl md:text-[9.5rem] font-black italic tracking-tighter uppercase bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent leading-[0.85] italic">
                    {tJob('availableJobs')}
                </h1>
                <Sparkles className="h-12 w-12 text-primary animate-pulse hidden md:block opacity-40" />
            </div>
            <p className="text-xl font-medium italic opacity-40 tracking-tight underline underline-offset-8 decoration-primary/20 max-w-3xl">
                {tJob('availableJobsDesc')}
            </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-12 items-start">
            {/* DESKTOP SIDEBAR */}
            <aside className="hidden lg:block w-96 flex-shrink-0 sticky top-24">
                <Card className="border-none shadow-[0_40px_100px_rgba(0,0,0,0.1)] bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden group ring-1 ring-white/5 relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-transparent opacity-30" />
                    <CardHeader className="flex flex-row items-center justify-between p-12 pb-6">
                        <CardTitle className="text-3xl font-black italic tracking-tighter uppercase leading-none">{tCommon('filters')}</CardTitle>
                        <SaveSearchDialog
                            currentFilters={{
                                query: searchQuery,
                                minPrice: budget[0],
                                maxPrice: budget[1],
                                skills: selectedSkills
                            }}
                        />
                    </CardHeader>
                    <CardContent className="px-12 pb-12">
              <JobFilters
                budget={budget}
                setBudget={setBudget}
                selectedSkills={selectedSkills}
                onSkillChange={handleSkillChange}
                onClearFilters={clearFilters}
                activeFiltersCount={activeFiltersCount}
              />
            </CardContent>
          </Card>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 w-full min-w-0">
          <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-8">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
              <TabsList className="w-full sm:w-auto h-auto p-3 bg-foreground/[0.03] backdrop-blur-3xl rounded-[1.8rem] border border-white/5 ring-1 ring-white/5 shadow-inner">
                <TabsTrigger value="nearby" className="flex-1 sm:flex-none gap-3 h-14 px-8 rounded-[1.2rem] data-[state=active]:shadow-2xl data-[state=active]:bg-background data-[state=active]:text-primary font-black text-[10px] uppercase tracking-[0.2em] transition-all italic border border-transparent data-[state=active]:border-white/5">
                  <MapPin className="h-4 w-4" />
                  {tJob('nearYou')}
                  {filteredRecommendedJobs.length > 0 && (
                    <Badge variant="secondary" className="ml-2 rounded-full bg-primary/20 text-primary border-none font-black text-[9px] px-2">
                      {filteredRecommendedJobs.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="saved" className="flex-1 sm:flex-none gap-3 h-14 px-8 rounded-[1.2rem] data-[state=active]:shadow-2xl data-[state=active]:bg-background data-[state=active]:text-primary font-black text-[10px] uppercase tracking-[0.2em] transition-all italic border border-transparent data-[state=active]:border-white/5">
                  {tJob('saved')}
                  {user?.bookmarks && user.bookmarks.length > 0 && (
                    <Badge variant="secondary" className="ml-2 rounded-full bg-primary/20 text-primary border-none font-black text-[9px] px-2">
                      {user.bookmarks.filter(id => jobs.find(j => j.id === id)).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all" className="flex-1 sm:flex-none h-14 px-8 rounded-[1.2rem] data-[state=active]:shadow-2xl data-[state=active]:bg-background data-[state=active]:text-primary font-black text-[10px] uppercase tracking-[0.2em] transition-all italic border border-transparent data-[state=active]:border-white/5">{tJob('browseAll')}</TabsTrigger>
              </TabsList>

              <div className="ml-auto flex items-center gap-2 lg:hidden">
                <SaveSearchDialog
                  currentFilters={{
                    query: searchQuery,
                    minPrice: budget[0],
                    maxPrice: budget[1],
                    skills: selectedSkills
                  }}
                  trigger={
                    <Button variant="outline" size="default" className="h-10 min-h-[44px] w-10 p-0 flex-shrink-0">
                      <Bell className="h-4 w-4" />
                    </Button>
                  }
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="default" className="h-10 min-h-[44px] gap-2 flex-1 sm:flex-none">
                      <ListFilter className="h-4 w-4" />
                      <span className="sm:whitespace-nowrap">
                        {tCommon('filter')}
                      </span>
                      {activeFiltersCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="rounded-full h-6 w-6 p-0 flex items-center justify-center text-xs"
                        >
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 p-4">
                    <DropdownMenuLabel>{tCommon('filterBy')}</DropdownMenuLabel>
                    <DropdownMenuSeparator className="-mx-4 mb-4" />
                    <JobFilters
                      budget={budget}
                      setBudget={setBudget}
                      selectedSkills={selectedSkills}
                      onSkillChange={handleSkillChange}
                      onClearFilters={clearFilters}
                      activeFiltersCount={activeFiltersCount}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="default" onClick={clearFilters} className="min-h-[44px]">
                    <X className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">{tCommon('clear')}</span>
                  </Button>
                )}
              </div>
            </div>

            <TabsContent value="all" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <Card className="max-w-full overflow-hidden border-0 shadow-none bg-transparent">
                <CardHeader className="px-0 pb-12 pt-4 space-y-4">
                  <CardTitle className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase italic">{tJob('availableJobs')}</CardTitle>
                  <CardDescription className="text-lg font-medium italic opacity-40 leading-relaxed tracking-tight">
                    {tJob('availableJobsDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 sm:px-6">
                  {loading ? (
                    <JobCardSkeletonGrid count={6} />
                  ) : (
                    <>
                      <motion.div 
                        initial="hidden"
                        animate="visible"
                        variants={{
                            visible: { transition: { staggerChildren: 0.1 } }
                        }}
                        className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                      >
                        {filteredJobs.map(job => (
                          <motion.div key={job.id} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                            <JobCard job={job} />
                          </motion.div>
                        ))}
                      </motion.div>
                      {filteredJobs.length === 0 && (
                        <EmptyState 
                          icon={Inbox} 
                          title={tJob('noJobsFound')} 
                          description="Marketplace Feed Idle // Your current deployment criteria yielded no active mission openings."
                          className="py-20"
                        />
                      )}
                    </>
                  )}
                </CardContent>
                <CardFooter className="px-0 sm:px-6 flex flex-col gap-4">
                  <div className="text-xs text-muted-foreground overflow-wrap-anywhere w-full text-center">
                    {tJob('showingJobsOf', { count: filteredJobs.length, total: jobs.filter(job => job.status === 'Open for Bidding' || job.status === 'Unbid').length })}
                  </div>
                  {hasMore && (
                    <Button
                      variant="outline"
                      onClick={() => fetchJobs(true)}
                      disabled={loadMoreLoading}
                      className="w-full sm:w-auto min-w-[200px]"
                    >
                      {loadMoreLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {tCommon('seeMore')}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="nearby" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <Card className="max-w-full overflow-hidden border-0 shadow-none bg-transparent">
                <CardHeader className="px-0 pb-6 pt-2">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase italic flex items-center gap-4">
                        <MapPin className="h-8 w-8 text-primary opacity-40" />
                        {tJob('nearYou')}
                      </CardTitle>
                      <CardDescription className="text-base font-medium opacity-80 mt-1">
                        {tJob('unbidOppPincode').replace('{unbid}', 'Unbid')}
                      </CardDescription>
                    </div>
                    {user && user.pincodes?.office && (
                      <Select
                        value={recommendedPincodeFilter}
                        onValueChange={setRecommendedPincodeFilter}
                      >
                        <SelectTrigger className="w-full sm:w-[240px] min-h-[44px]">
                          <SelectValue placeholder={tJob('filterByPincode')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="min-h-[44px]">{tJob('allMyPincodes')}</SelectItem>
                          <SelectItem value="residential" className="min-h-[44px]">
                            {tJob('residential')}: {user?.pincodes?.residential || 'N/A'}
                          </SelectItem>
                          <SelectItem value="office" className="min-h-[44px]">
                            {tJob('office')}: {user?.pincodes?.office || 'N/A'}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-0 sm:px-6">
                  {loading ? (
                    <JobCardSkeletonGrid count={6} />
                  ) : (
                    <>
                      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                        {filteredRecommendedJobs.map(job => (
                          <JobCard key={job.id} job={job} />
                        ))}
                      </div>
                      {filteredRecommendedJobs.length === 0 && (
                        <div className="flex flex-col items-center">
                          <EmptyState 
                            icon={Navigation} 
                            title={tJob('noNearbyJobs')} 
                            description={tJob('noNearbyJobsDesc')}
                            className="w-full py-20 bg-surface-container-low/20"
                          />
                          <Button onClick={() => handleTabChange('all')} variant="outline" className="mt-8 h-12 rounded-[1.25rem] px-8 font-black uppercase text-[10px] tracking-widest italic">
                            {tJob('browseAll')} COMMAND
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
                <CardFooter className="px-0 sm:px-6">
                  <div className="text-xs text-muted-foreground overflow-wrap-anywhere">
                    {tJob('showingNearbyCount', { count: filteredRecommendedJobs.length })}
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="saved" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <Card className="max-w-full overflow-hidden border-0 shadow-none bg-transparent">
                <CardHeader className="px-0 pb-12 pt-4 space-y-4">
                  <CardTitle className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase italic">{tJob('savedJobs')}</CardTitle>
                  <CardDescription className="text-lg font-medium italic opacity-40 leading-relaxed tracking-tight">
                    {tJob('savedJobsDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 sm:px-6">
                  {loading ? (
                    <JobCardSkeletonGrid count={6} />
                  ) : (
                    <>
                      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                        {jobs.filter(job => user?.bookmarks?.includes(job.id)).map(job => (
                          <JobCard key={job.id} job={job} />
                        ))}
                      </div>
                      {jobs.filter(job => user?.bookmarks?.includes(job.id)).length === 0 && (
                        <EmptyState 
                            icon={Bookmark} 
                            title={tJob('noSavedJobs')} 
                            description="Intel Vault Empty // You have not yet archived any active mission deployments."
                            className="py-20 bg-surface-container-low/20"
                        />
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </motion.div>
  );
}
