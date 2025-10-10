
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gem, Medal, Star, ShieldCheck, Briefcase, TrendingUp, CalendarDays, Building, MapPin, Grid, List, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { format } from "date-fns";
import { notFound, useParams } from "next/navigation";
import { JobCard } from "@/components/job-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Job, User } from "@/lib/types";
import { getStatusVariant, toDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirebase } from "@/hooks/use-user";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import type { DocumentReference } from "firebase/firestore";


const tierIcons = {
  Bronze: <Medal className="h-6 w-6 text-yellow-700" />,
  Silver: <Medal className="h-6 w-6 text-gray-400" />,
  Gold: <Gem className="h-6 w-6 text-amber-500" />,
  Platinum: <Gem className="h-6 w-6 text-cyan-400" />,
};

const tierData = {
    'Bronze': { points: 0, next: 'Silver', goal: 500 },
    'Silver': { points: 500, next: 'Gold', goal: 1000 },
    'Gold': { points: 1000, next: 'Platinum', goal: 2000 },
    'Platinum': { points: 2000, next: 'Max', goal: 2000 },
};

const chartConfig = {
  points: {
    label: "Points",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

const wasJobAwardedDirectly = (job: Job) => {
    if (!job.awardedInstaller || job.bids.length > 0) return false;
    
    const awardedInstallerId = (job.awardedInstaller as User)?.id;
    const hasBids = (job.bids || []).some(bid => (bid.installer as User).id === awardedInstallerId);

    return !hasBids;
};

function JobListItem({ job }: { job: Job }) {
  const isDirectAward = wasJobAwardedDirectly(job);
  return (
    <Link href={`/dashboard/jobs/${job.id}`} className="block hover:bg-accent rounded-lg p-4 -mx-4">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <p className="font-semibold">{job.title}</p>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
            <span>Posted: {format(toDate(job.postedAt), "MMM d, yyyy")}</span>
            <span className="flex items-center gap-1">
              {job.bids.length} Bids
            </span>
            {job.awardedInstaller && (
              <span className="flex items-center gap-1">
                <Award className="h-3 w-3" />
                {isDirectAward ? 'Direct Award' : 'Bidding'}
              </span>
            )}
          </div>
        </div>
        <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
      </div>
    </Link>
  )
}

function PageSkeleton() {
  return (
    <div className="grid gap-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          </div>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const { db } = useFirebase();

  const [profileUser, setProfileUser] = React.useState<User | null | undefined>(undefined);
  const [userPostedJobs, setUserPostedJobs] = React.useState<Job[]>([]);
  const [userCompletedJobs, setUserCompletedJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [jobsView, setJobsView] = React.useState<'list' | 'grid'>('list');

  React.useEffect(() => {
    if (id) {
        setLoading(true);
        
        const fetchUserData = async () => {
            const userDoc = await getDoc(doc(db, "users", id));
            if (!userDoc.exists()) {
                setProfileUser(null);
                setLoading(false);
                return;
            }
            const user = { id: userDoc.id, ...userDoc.data() } as User;
            setProfileUser(user);

            const jobsRef = collection(db, "jobs");
            
            if (user.roles.includes('Job Giver')) {
                const postedJobsQuery = query(jobsRef, where('jobGiver', '==', userDoc.ref));
                const postedJobsSnapshot = await getDocs(postedJobsQuery);
                const postedJobs = postedJobsSnapshot.docs.map(d => d.data() as Job);
                setUserPostedJobs(postedJobs);
            }

            if (user.roles.includes('Installer')) {
                const completedJobsQuery = query(jobsRef, where('status', '==', 'Completed'), where('awardedInstaller', '==', userDoc.ref));
                const completedJobsSnapshot = await getDocs(completedJobsQuery);
                const completedJobs = completedJobsSnapshot.docs.map(d => d.data() as Job);
                setUserCompletedJobs(completedJobs);
            }
            setLoading(false);
        };
        fetchUserData();
    }
  }, [id, db]);

  if (loading || profileUser === undefined) {
    return <PageSkeleton />;
  }

  if (profileUser === null) {
    notFound();
  }

  const { name, email, id: userId, memberSince, realAvatarUrl, address, roles } = profileUser;
  const installerProfile = profileUser.installerProfile;
  const isInstaller = roles.includes('Installer');
  
  const jobsCompletedCount = userCompletedJobs.length;

  const currentTierInfo = installerProfile ? tierData[installerProfile.tier] : null;
  const progressPercentage = currentTierInfo && installerProfile ? ((installerProfile.points - currentTierInfo.points) / (currentTierInfo.goal - currentTierInfo.points)) * 100 : 0;
  
  return (
    <div className="grid gap-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-24 w-24 border-2 border-primary">
              <AvatarImage src={realAvatarUrl} alt={name} />
              <AvatarFallback className="text-3xl">
                {name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <CardTitle className="text-3xl">{name}</CardTitle>
                 <div className="flex items-center gap-2">
                    {roles.map(r => <Badge key={r} variant="outline">{r}</Badge>)}
                    {installerProfile?.verified && (
                        <Badge variant="secondary" className="gap-1 pl-2">
                            <ShieldCheck className="h-4 w-4 text-green-600"/> Verified
                        </Badge>
                    )}
                 </div>
              </div>
               <div className="flex flex-col mt-1">
                <p className="text-muted-foreground">{userId}</p>
              </div>

               <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground mt-2">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>Member since {format(toDate(memberSince), 'MMMM yyyy')}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{address.cityPincode}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {isInstaller && installerProfile && (
        <Card>
            <CardHeader>
                <CardTitle>Installer Reputation</CardTitle>
                <CardDescription>This user's performance and trust score on the platform.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-accent/20">
                    <div className="flex items-center gap-4">
                        {tierIcons[installerProfile.tier]}
                        <div>
                            <p className="text-sm">Tier</p>
                            <p className="text-xl font-bold">{installerProfile.tier}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm">Reputation Points</p>
                            <p className="text-xl font-bold text-right">{installerProfile.points}</p>
                        </div>
                    </div>
                </div>
                
                {currentTierInfo && currentTierInfo.next !== 'Max' && (
                     <div>
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-medium">Progress to {currentTierInfo.next}</p>
                            <p className="text-sm font-medium">{installerProfile.points} / {currentTierInfo.goal} pts</p>
                        </div>
                        <Progress value={progressPercentage} className="h-2"/>
                     </div>
                )}
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <div className="p-4 rounded-lg border">
                        <Star className="mx-auto h-6 w-6 mb-2 text-primary"/>
                        <p className="text-2xl font-bold">{installerProfile.rating}/5.0</p>
                        <p className="text-sm text-muted-foreground">from {installerProfile.reviews} reviews</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                        <Briefcase className="mx-auto h-6 w-6 mb-2 text-primary"/>
                        <p className="text-2xl font-bold">{jobsCompletedCount}</p>
                        <p className="text-sm text-muted-foreground">Jobs Completed</p>
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold mb-3">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                        {installerProfile.skills.map(skill => (
                            <Badge key={skill} variant="secondary">{skill}</Badge>
                        ))}
                    </div>
                </div>

                {installerProfile.reputationHistory && installerProfile.reputationHistory.length > 0 && (
                     <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Reputation History (Last 6 Months)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-64 w-full">
                                <AreaChart data={installerProfile.reputationHistory} margin={{ left: -20, right: 20, top: 10, bottom: 0 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis 
                                        dataKey="month" 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickMargin={8} 
                                    />
                                    <YAxis
                                         tickLine={false}
                                         axisLine={false}
                                         tickMargin={8}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Area 
                                        dataKey="points" 
                                        type="natural" 
                                        fill="var(--color-points)" 
                                        fillOpacity={0.4} 
                                        stroke="var(--color-points)" 
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                     </Card>
                )}
            </CardContent>
        </Card>
      )}

      {(roles.includes('Job Giver') || roles.includes('Installer')) && (
        <Card>
            <Tabs defaultValue="posted">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <TabsList>
                            {roles.includes('Job Giver') && <TabsTrigger value="posted">Posted Jobs</TabsTrigger>}
                            {roles.includes('Installer') && <TabsTrigger value="completed">Completed Jobs</TabsTrigger>}
                        </TabsList>
                         <div className="flex items-center gap-1 rounded-md bg-secondary p-1">
                            <Button
                                variant={jobsView === 'list' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setJobsView('list')}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={jobsView === 'grid' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setJobsView('grid')}
                            >
                                <Grid className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                {roles.includes('Job Giver') && (
                    <TabsContent value="posted">
                        <CardContent>
                            {userPostedJobs.length > 0 ? (
                            jobsView === 'grid' ? (
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {userPostedJobs.map(job => (
                                    <JobCard key={job.id} job={job} />
                                ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                {userPostedJobs.map(job => (
                                    <JobListItem key={job.id} job={job} />
                                ))}
                                </div>
                            )
                            ) : <p className="text-muted-foreground col-span-full text-center py-8">This user has not posted any jobs yet.</p>}
                        </CardContent>
                    </TabsContent>
                )}

                {roles.includes('Installer') && (
                    <TabsContent value="completed">
                         <CardContent>
                            {userCompletedJobs.length > 0 ? (
                            jobsView === 'grid' ? (
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {userCompletedJobs.map(job => (
                                    <JobCard key={job.id} job={job} />
                                ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                {userCompletedJobs.map(job => (
                                    <JobListItem key={job.id} job={job} />
                                ))}
                                </div>
                            )
                            ) : <p className="text-muted-foreground col-span-full text-center py-8">This installer has not completed any jobs yet.</p>}
                        </CardContent>
                    </TabsContent>
                )}
            </Tabs>
        </Card>
      )}
    </div>
  );
}

    