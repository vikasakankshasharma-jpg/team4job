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
import { ListFilter, X } from "lucide-react";
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
import { useUser, useFirebase } from "@/hooks/use-user";
import { allSkills } from "@/lib/data";
import type { Job, User } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import type { DocumentReference } from "firebase/firestore";
import { MapPin } from "lucide-react";
import { useSearch } from "@/hooks/use-search";
import { JobCardSkeletonGrid } from "@/components/skeletons/job-card-skeleton";

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

export default function BrowseJobsClient() {
  const { user, role } = useUser();
  const { db } = useFirebase();
  const router = useRouter();
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { searchQuery } = useSearch();
  const [budget, setBudget] = React.useState([0, 150000]);
  const [selectedSkills, setSelectedSkills] = React.useState<string[]>([]);
  const [recommendedPincodeFilter, setRecommendedPincodeFilter] = React.useState("all");
  const { setHelp } = useHelp();

  React.useEffect(() => {
    if (loading) return;
    if (role === 'Admin' || role === 'Job Giver') {
      router.push('/dashboard');
    }
  }, [role, router, loading]);

  const fetchJobs = React.useCallback(async () => {
    if (!db) return;

    setLoading(true);

    try {
      // Fetch both "Open for Bidding" and "Unbid" jobs
      const openJobsQuery = query(
        collection(db, 'jobs'),
        where('status', 'in', ['Open for Bidding', 'Unbid'])
      );
      const jobSnapshot = await getDocs(openJobsQuery);

      const userIds = new Set<string>();
      jobSnapshot.docs.forEach(doc => {
        const jobGiverRef = doc.data().jobGiver as DocumentReference;
        if (jobGiverRef?.id) {
          userIds.add(jobGiverRef.id);
        }
      });

      if (userIds.size > 0) {
        const usersQuery = query(
          collection(db, 'public_profiles'),
          where('__name__', 'in', Array.from(userIds))
        );
        const usersSnapshot = await getDocs(usersQuery);
        const userMap = new Map(
          usersSnapshot.docs.map(doc => [doc.id, doc.data() as User])
        );

        const jobList = jobSnapshot.docs.map(doc => {
          const jobData = doc.data() as Job;
          const jobGiverId = (jobData.jobGiver as DocumentReference)?.id;
          return {
            ...jobData,
            jobGiver: userMap.get(jobGiverId) || jobData.jobGiver
          };
        });
        setJobs(jobList);
      } else {
        setJobs([]);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [db]);

  React.useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  React.useEffect(() => {
    setHelp({
      title: 'Browse Jobs Guide',
      content: (
        <div className="space-y-4 text-sm">
          <p>This page is where you find new projects. Here&apos;s how to use the tools to your advantage:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold">Search by Pincode:</span> Use the search bar at the top right to find jobs in a specific area. This helps you find work close to home.
            </li>
            <li>
              <span className="font-semibold">Filter Menu:</span> Click the &quot;Filter&quot; button to open a menu with more powerful options:
              <ul className="list-disc space-y-1 pl-5 mt-1">
                <li>
                  <span className="font-semibold">Budget Range:</span> Drag the slider to only see jobs that match your expected pay.
                </li>
                <li>
                  <span className="font-semibold">Skills:</span> Select one or more skills to narrow down jobs that match your expertise (e.g., &quot;IP Cameras&quot;, &quot;Access Control&quot;).
                </li>
              </ul>
            </li>
            <li>
              <span className="font-semibold">Clear Filters:</span> If you have any filters active, a &quot;Clear&quot; button will appear. Click it to reset your search and see all available jobs again.
            </li>
            <li>
              <span className="font-semibold">Recommended Tab:</span> This tab includes &quot;Unbid&quot; jobs in your area, giving you a second chance at opportunities you may have missed.
            </li>
          </ul>
          <p>Each job card gives you a quick summary. Click &quot;View Job &amp; Bid&quot; to see the full details and place your offer.</p>
        </div>
      )
    });
  }, [setHelp]);

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

  const searchParams = useSearchParams();
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
    if (!user?.installerProfile) return [];

    const installerSkills = new Set(
      (user.installerProfile.skills || []).map(s => s.toLowerCase())
    );
    const { city: installerCity, state: installerState } = getLocationParts(
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
          if (installerCity && jobCity &&
            jobCity.toLowerCase() === installerCity.toLowerCase()) {
            if (!locationMatchType) {
              locationMatchType = 'city';
              score += 10;
            }
          }
          // Tier 3: State Match
          else if (installerState && jobState &&
            jobState.toLowerCase() === installerState.toLowerCase()) {
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
            installerSkills.has(skill)
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

  if (role === 'Admin' || role === 'Job Giver') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-x-hidden px-4 sm:px-0 grid flex-1 items-start gap-4 md:gap-8">
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <TabsList className="w-full sm:w-auto h-auto p-1">
            <TabsTrigger value="nearby" className="flex-1 sm:flex-none gap-2 min-h-[44px]">
              <MapPin className="h-4 w-4" />
              Near You
              {filteredRecommendedJobs.length > 0 && (
                <Badge variant="secondary" className="ml-1 rounded-full">
                  {filteredRecommendedJobs.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1 sm:flex-none min-h-[44px]">Browse All</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="default" className="h-10 min-h-[44px] gap-2 flex-1 sm:flex-none">
                  <ListFilter className="h-4 w-4" />
                  <span className="sm:whitespace-nowrap">
                    Filter
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
              <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 p-4 space-y-4">
                <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                <DropdownMenuSeparator className="-mx-4" />

                <div className="space-y-2">
                  <Label>Budget Range</Label>
                  <Slider
                    min={0}
                    max={150000}
                    step={1000}
                    value={budget}
                    onValueChange={setBudget}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>₹{budget[0].toLocaleString()}</span>
                    <span>₹{budget[1].toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Skills</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal min-h-[44px]">
                        {selectedSkills.length > 0
                          ? `${selectedSkills.length} skill(s) selected`
                          : "Select skills"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 p-0" align="start">
                      <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                        {allSkills.map(skill => (
                          <div key={skill} className="flex items-center space-x-2 min-h-[44px]">
                            <Checkbox
                              id={`skill-${skill}`}
                              checked={selectedSkills.includes(skill)}
                              onCheckedChange={() => handleSkillChange(skill)}
                              className="h-5 w-5"
                            />
                            <Label
                              htmlFor={`skill-${skill}`}
                              className="capitalize font-normal cursor-pointer flex-1 py-2"
                            >
                              {skill}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="default" onClick={clearFilters} className="min-h-[44px]">
                <X className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="all">
          <Card className="max-w-full overflow-hidden">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="overflow-wrap-anywhere">Available Jobs</CardTitle>
              <CardDescription className="overflow-wrap-anywhere">
                Find your next project. Browse open jobs and submit your bid.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {loading ? (
                <JobCardSkeletonGrid count={6} />
              ) : (
                <>
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredJobs.map(job => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                  {filteredJobs.length === 0 && (
                    <div className="text-center py-10">
                      <p className="text-muted-foreground overflow-wrap-anywhere px-4">
                        No jobs found matching your criteria.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
            <CardFooter className="px-4 sm:px-6">
              <div className="text-xs text-muted-foreground overflow-wrap-anywhere">
                Showing <strong>{filteredJobs.length}</strong> of{" "}
                <strong>{openForBiddingJobs.length}</strong> open jobs
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="nearby">
          <Card className="max-w-full overflow-hidden">
            <CardHeader className="px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="overflow-wrap-anywhere flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Near You
                  </CardTitle>
                  <CardDescription className="overflow-wrap-anywhere">
                    Jobs in your pincodes plus <Badge variant="outline" className="mx-1 text-xs">Unbid</Badge> opportunities in your city
                  </CardDescription>
                </div>
                {user && user.pincodes?.office && (
                  <Select
                    value={recommendedPincodeFilter}
                    onValueChange={setRecommendedPincodeFilter}
                  >
                    <SelectTrigger className="w-full sm:w-[240px] min-h-[44px]">
                      <SelectValue placeholder="Filter by pincode..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="min-h-[44px]">All My Pincodes</SelectItem>
                      <SelectItem value="residential" className="min-h-[44px]">
                        Residential: {user.pincodes?.residential || 'N/A'}
                      </SelectItem>
                      <SelectItem value="office" className="min-h-[44px]">
                        Office: {user.pincodes?.office || 'N/A'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {loading ? (
                <JobCardSkeletonGrid count={6} />
              ) : (
                <>
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredRecommendedJobs.map(job => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                  {filteredRecommendedJobs.length === 0 && (
                    <div className="text-center py-10">
                      <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-semibold mb-2">No nearby jobs right now</p>
                      <p className="text-muted-foreground overflow-wrap-anywhere px-4 mb-4">
                        Check back soon, or browse all jobs to find opportunities in other areas.
                      </p>
                      <Button onClick={() => handleTabChange('all')} variant="outline">
                        Browse All Jobs
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
            <CardFooter className="px-4 sm:px-6">
              <div className="text-xs text-muted-foreground overflow-wrap-anywhere">
                Showing <strong>{filteredRecommendedJobs.length}</strong> nearby jobs
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div >
  );
}
