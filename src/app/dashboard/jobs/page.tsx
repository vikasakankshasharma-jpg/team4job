

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
import { jobs } from "@/lib/data";
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

// Get unique skills from jobs data for filter
const allSkills = Array.from(new Set(jobs.flatMap(job => job.description.toLowerCase().match(/ip camera|nvr setup|cabling|troubleshooting|ptz|vms|access control/g) || [])));


export default function BrowseJobsPage() {
  const [searchPincode, setSearchPincode] = React.useState("");
  const [budget, setBudget] = React.useState([0, 150000]);
  const [selectedSkills, setSelectedSkills] = React.useState<string[]>([]);
  
  const openJobs = jobs.filter((job) => job.status === "Open for Bidding");

  const filteredJobs = openJobs.filter((job) => {
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
        const jobSkills = job.description.toLowerCase();
        if (!selectedSkills.every(skill => jobSkills.includes(skill))) {
            return false;
        }
    }
    return true;
  });

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


  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <Tabs defaultValue="all">
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="recommended">Recommended</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
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
                Showing <strong>1-{filteredJobs.length}</strong> of <strong>{openJobs.length}</strong> jobs
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
