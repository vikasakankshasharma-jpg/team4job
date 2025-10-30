
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
import { ListFilter, Search, X } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import type { DocumentReference } from "firebase/firestore";


export default function BrowseJobsPage() {
  const { user, role } = useUser();
  const { db } = useFirebase();
  const router = useRouter();
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchPincode, setSearchPincode] = React.useState("");
  const [budget, setBudget] = React.useState([0, 150000]);
  const [selectedSkills, setSelectedSkills] = React.useState<string[]>([]);
  const [recommendedPincodeFilter, setRecommendedPincodeFilter] = React.useState("all");
  const { setHelp } = useHelp();

  React.useEffect(() => {
    if (role === 'Admin' || role === 'Job Giver') {
      router.push('/dashboard');
    }
  }, [role, router]);
  
  const fetchJobs = React.useCallback(async () => {
    if (!db) return;
    setLoading(true);
    // Fetch both "Open for Bidding" and "Unbid" jobs
    const openJobsQuery = query(collection(db, 'jobs'), where('status', 'in', ['Open for Bidding', 'Unbid']));
    const jobSnapshot = await getDocs(openJobsQuery);
    const userIds = new Set<string>();
    jobSnapshot.docs.forEach(doc => {
        const jobGiverRef = doc.data().jobGiver as DocumentReference;
        if (jobGiverRef?.id) {
            userIds.add(jobGiverRef.id);
        }
    });
    
    if (userIds.size > 0) {
        const usersQuery = query(collection(db, 'users'), where('__name__', 'in', Array.from(userIds)));
        const usersSnapshot = await getDocs(usersQuery);
        const userMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data() as User]));
        
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
    
    setLoading(false);
  }, [db]);

  React.useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  React.useEffect(() => {
    setHelp({
        title: 'Browse Jobs Guide',
        content: (
            <div className="space-y-4 text-sm">
                <p>This page is where you find new projects. Here’s how to use the tools to your advantage:</p>
                <ul className="list-disc space-y-2 pl-5">
                    <li>
                        <span className="font-semibold">Search by Pincode:</span> Use the search bar at the top right to find jobs in a specific area. This helps you find work close to home.
                    </li>
                    <li>
                        <span className="font-semibold">Filter Menu:</span> Click the "Filter" button to open a menu with more powerful options:
                        <ul className="list-disc space-y-1 pl-5 mt-1">
                            <li><span className="font-semibold">Budget Range:</span> Drag the slider to only see jobs that match your expected pay.</li>
                            <li><span className="font-semibold">Skills:</span> Select one or more skills to narrow down jobs that match your expertise (e.g., "IP Cameras", "Access Control").</li>
                        </ul>
                    </li>
                     <li>
                        <span className="font-semibold">Clear Filters:</span> If you have any filters active, a "Clear" button will appear. Click it to reset your search and see all available jobs again.
                    </li>
                    <li>
                        <span className="font-semibold">Recommended Tab:</span> This tab includes "Unbid" jobs in your area, giving you a second chance at opportunities you may have missed.
                    </li>
                </ul>
                <p>Each job card gives you a quick summary. Click "View Job & Bid" to see the full details and place your offer.</p>
            </div>
        )
    });
  }, [setHelp]);
  
  const filterJobs = (jobsToFilter: Job[]) => {
    return jobsToFilter.filter((job) => {
        // Pincode filter
        if (searchPincode !== "" && !job.location.includes(searchPincode)) {
            return false;
        }
        // Budget filter
        if (job.budget.max < budget[0] || job.budget.min > budget[1]) {
            return false;
        }
        // Skills filter
        if (selectedSkills.length > 0) {
            if (!job.skills) return false;
            const jobSkills = job.skills.map(s => s.toLowerCase());
            if (!selectedSkills.every(skill => jobSkills.includes(skill.toLowerCase()))) {
                return false;
            }
        }
        return true;
    });
  }

  // "All" tab should only show currently open jobs.
  const openForBiddingJobs = React.useMemo(() => jobs.filter(job => job.status === 'Open for Bidding'), [jobs]);
  const filteredJobs = filterJobs(openForBiddingJobs);

  const recommendedJobs = React.useMemo(() => {
    if (!user?.installerProfile) return [];
    
    const installerSkills = new Set(user.installerProfile.skills.map(s => s.toLowerCase()));

    const scoredJobs = jobs // Includes both 'Open for Bidding' and 'Unbid'
        .map(job => {
            let score = 0;
            const residentialMatch = user.pincodes.residential && job.location.includes(user.pincodes.residential);
            const officeMatch = user.pincodes.office && job.location.includes(user.pincodes.office);
            
            let locationMatch = false;
            if (recommendedPincodeFilter === "all" && (residentialMatch || officeMatch)) locationMatch = true;
            if (recommendedPincodeFilter === "residential" && residentialMatch) locationMatch = true;
            if (recommendedPincodeFilter === "office" && officeMatch) locationMatch = true;

            if (!locationMatch) return null; // Exclude jobs not in selected pincodes

            score += 10; // Base score for location match

            if (job.status === 'Unbid') {
                score += 5; // Give a slight boost to unbid jobs to surface them
            }

            if (job.skills && job.skills.length > 0) {
                const jobSkills = new Set(job.skills.map(s => s.toLowerCase()));
                const matchingSkills = [...jobSkills].filter(skill => installerSkills.has(skill));
                score += matchingSkills.length * 5; // Add points for each matching skill
            }
            
            return { ...job, score };
        })
        .filter((j): j is Job & { score: number } => j !== null);

    return scoredJobs.sort((a, b) => b.score - a.score);
  }, [user, jobs, recommendedPincodeFilter]);

  const filteredRecommendedJobs = filterJobs(recommendedJobs);

  const clearFilters = () => {
    setSearchPincode("");
    setBudget([0, 150000]);
    setSelectedSkills([]);
  }

  const handleSkillChange = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill) 
        : [...prev, skill]
    );
  };
  
  const activeFiltersCount = [
    searchPincode !== "", 
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
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <Tabs defaultValue="recommended">
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">All Jobs</TabsTrigger>
            <TabsTrigger value="recommended">Recommended</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Filter
                  </span>
                  {activeFiltersCount > 0 && <Badge variant="secondary" className="rounded-full h-5 w-5 p-0 flex items-center justify-center">{activeFiltersCount}</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-4 space-y-4">
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
                       <Button variant="outline" className="w-full justify-start font-normal">
                          {selectedSkills.length > 0 ? `${selectedSkills.length} skill(s) selected` : "Select skills"}
                       </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                        <div className="p-4 space-y-2">
                            {allSkills.map(skill => (
                                <div key={skill} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`skill-${skill}`}
                                        checked={selectedSkills.includes(skill)}
                                        onCheckedChange={() => handleSkillChange(skill)}
                                    />
                                    <Label htmlFor={`skill-${skill}`} className="capitalize font-normal">{skill}</Label>
                                </div>
                            ))}
                        </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="relative">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input 
                    type="search" 
                    placeholder="Search by Pincode..." 
                    className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] h-8"
                    value={searchPincode}
                    onChange={(e) => setSearchPincode(e.target.value)}
                 />
            </div>
             {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Available Jobs</CardTitle>
              <CardDescription>
                Find your next project. Browse open jobs and submit your bid.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredJobs.map(job => (
                        <JobCard key={job.id} job={job} />
                    ))}
                </div>
                 {filteredJobs.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No jobs found matching your criteria.</p>
                  </div>
                )}
            </CardContent>
            <CardFooter>
               <div className="text-xs text-muted-foreground">
                Showing <strong>1-{filteredJobs.length}</strong> of <strong>{openForBiddingJobs.length}</strong> jobs
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="recommended">
           <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <CardTitle>Recommended For You</CardTitle>
                        <CardDescription>
                            Jobs that match your profile pincode(s) and skills, including unbid opportunities.
                        </CardDescription>
                    </div>
                     {user && user.pincodes.office && (
                         <Select value={recommendedPincodeFilter} onValueChange={setRecommendedPincodeFilter}>
                            <SelectTrigger className="w-full sm:w-[240px]">
                                <SelectValue placeholder="Filter by pincode..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All My Pincodes</SelectItem>
                                <SelectItem value="residential">Residential: {user.pincodes.residential}</SelectItem>
                                <SelectItem value="office">Office: {user.pincodes.office}</SelectItem>
                            </SelectContent>
                        </Select>
                     )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredRecommendedJobs.map(job => (
                        <JobCard key={job.id} job={job} />
                    ))}
                </div>
                 {filteredRecommendedJobs.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No recommended jobs found for the selected filter.</p>
                  </div>
                )}
            </CardContent>
            <CardFooter>
               <div className="text-xs text-muted-foreground">
                Showing <strong>{filteredRecommendedJobs.length}</strong> of <strong>{recommendedJobs.length}</strong> recommended jobs
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    