
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
import { ListFilter, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { jobs } from "@/lib/data";
import { JobCard } from "@/components/job-card";

export default function BrowseJobsPage() {
  const [searchPincode, setSearchPincode] = React.useState("");

  const openJobs = jobs.filter((job) => job.status === "Open for Bidding");

  const filteredJobs = openJobs.filter((job) => {
    if (searchPincode === "") {
      return true;
    }
    return job.location.includes(searchPincode);
  });

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
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem>
                  Budget Range
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Location</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>
                  Skills Required
                </DropdownMenuCheckboxItem>
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
                Showing <strong>1-{filteredJobs.length}</strong> of <strong>{filteredJobs.length}</strong> jobs
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
