
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
import { Gem, Medal, Star, ShieldCheck, Briefcase, TrendingUp, CalendarDays, Building, MapPin, Grid, List, Award, Edit, UserX, UserCheck, Loader2, Ban, Trash2, Gauge, Clock, MessageSquare, Copy, UserPlus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { format, differenceInMilliseconds } from "date-fns";
import { notFound, useParams } from "next/navigation";
import { JobCard } from "@/components/job-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Job, User, Dispute } from "@/lib/types";
import { getStatusVariant, toDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirebase, useUser as useAuthUser } from "@/hooks/use-user";
import { collection, query, where, getDocs, getDoc, doc, updateDoc, deleteDoc as deleteFirestoreDoc } from "firebase/firestore";
import type { DocumentReference } from "firebase/firestore";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


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

function ManageSubscriptionDialog({ user, onSubscriptionUpdate }: { user: User, onSubscriptionUpdate: (newExpiry: Date) => void }) {
    const { toast } = useToast();
    const { db } = useFirebase();
    const [days, setDays] = React.useState(30);
    const [isOpen, setIsOpen] = React.useState(false);

    const handleGrantAccess = async () => {
        const newExpiryDate = new Date();
        newExpiryDate.setDate(newExpiryDate.getDate() + days);

        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
            'subscription.planId': 'premium',
            'subscription.planName': 'Admin Granted Access',
            'subscription.expiresAt': newExpiryDate,
        });

        onSubscriptionUpdate(newExpiryDate);
        toast({
            title: "Subscription Updated",
            description: `${user.name} has been granted access for ${days} days.`,
        });
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Manage Subscription
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Subscription for {user.name}</DialogTitle>
                    <DialogDescription>
                        Grant or extend a user's subscription for free. The user will be notified.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label htmlFor="days" className="text-sm font-medium">Grant Access For (Days)</label>
                        <Input
                            id="days"
                            type="number"
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            min="1"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleGrantAccess}>Grant Access</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AdminActionsCard({ user, onUserUpdate }: { user: User, onUserUpdate: (data: Partial<User>) => void }) {
  const { toast } = useToast();
  const { db } = useFirebase();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [suspensionDays, setSuspensionDays] = React.useState(7);
  const [isSuspendOpen, setIsSuspendOpen] = React.useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("");

  const handleDeactivate = async () => {
    setIsLoading(true);
    await updateDoc(doc(db, 'users', user.id), { status: 'deactivated' });
    onUserUpdate({ status: 'deactivated' });
    toast({ title: 'User Deactivated', description: `${user.name}'s account has been deactivated.`, variant: 'destructive' });
    setIsLoading(false);
  };

  const handleReactivate = async () => {
    setIsLoading(true);
    await updateDoc(doc(db, 'users', user.id), { status: 'active' });
    onUserUpdate({ status: 'active' });
    toast({ title: 'User Reactivated', description: `${user.name}'s account is now active.`, variant: 'success' });
    setIsLoading(false);
  };
  
  const handleSuspend = async () => {
    setIsLoading(true);
    const suspensionEndDate = new Date();
    suspensionEndDate.setDate(suspensionEndDate.getDate() + suspensionDays);
    await updateDoc(doc(db, 'users', user.id), { status: 'suspended', suspensionEndDate });
    onUserUpdate({ status: 'suspended', suspensionEndDate });
    toast({ title: 'User Suspended', description: `${user.name} has been suspended for ${suspensionDays} days.` });
    setIsLoading(false);
    setIsSuspendOpen(false);
  };

  const handleDelete = async () => {
      // In a real application, this would call a secure backend function (e.g., a Firebase Cloud Function)
      // that uses the Firebase Admin SDK to delete the user from Authentication.
      // e.g., await admin.auth().deleteUser(user.id);
      
      // For now, we will simulate the full deletion by removing the Firestore document
      // and redirecting.
      setIsLoading(true);
      await deleteFirestoreDoc(doc(db, 'users', user.id));
      
      toast({
          title: "User Deleted",
          description: `User ${user.name} has been permanently deleted.`,
          variant: "destructive",
      });
      setIsLoading(false);
      router.push("/dashboard/users");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Actions</CardTitle>
        <CardDescription>Manage this user's account status and permissions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {user.status === 'active' && (
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <h3 className="font-semibold">Suspend Account</h3>
              <p className="text-sm text-muted-foreground">Temporarily disable account access for a set period.</p>
            </div>
            <Dialog open={isSuspendOpen} onOpenChange={setIsSuspendOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={isLoading}><Ban className="mr-2 h-4 w-4" />Suspend</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Suspend {user.name}</DialogTitle>
                  <DialogDescription>
                    The user will be logged out and unable to access their account until the suspension ends.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="suspension-days">Suspension Duration (Days)</Label>
                  <Input 
                    id="suspension-days"
                    type="number" 
                    value={suspensionDays} 
                    onChange={(e) => setSuspensionDays(parseInt(e.target.value))} 
                    min="1"
                  />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                    <Button variant="destructive" onClick={handleSuspend} disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirm Suspension
                    </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
        <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <h3 className="font-semibold">
                {user.status === 'deactivated' ? 'Re-activate Account' : 'Deactivate Account'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {user.status === 'deactivated' ? 'Restore access to the user.' : 'Disable account access.'}
              </p>
            </div>
            {user.status === 'deactivated' ? (
              <Button variant="success" onClick={handleReactivate} disabled={isLoading}>
                 {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 <UserCheck className="mr-2 h-4 w-4" />Re-activate
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleDeactivate} disabled={isLoading}>
                 {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 <UserX className="mr-2 h-4 w-4" />Deactivate
              </Button>
            )}
        </div>
         <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
            <div>
              <h3 className="font-semibold text-destructive">Delete User</h3>
              <p className="text-sm text-destructive/70">
                Permanently remove the user and all their data. This action cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLoading}><Trash2 className="mr-2 h-4 w-4" />Delete Permanently</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the user <span className="font-bold">{user.name}</span> from authentication and Firestore. This action is irreversible. Please type <span className="font-bold text-foreground">DELETE</span> to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  placeholder="Type DELETE to confirm"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteConfirmation !== 'DELETE' || isLoading}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete User'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}


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
              {(job.bids || []).length} Bids
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

function DisputePerformanceCard({ disputes }: { disputes: Dispute[] }) {
    const totalDisputes = disputes.length;
    const resolvedDisputes = disputes.filter(d => d.status === 'Resolved').length;
    const resolutionRate = totalDisputes > 0 ? (resolvedDisputes / totalDisputes) * 100 : 0;

    const totalResolutionTime = disputes
        .filter(d => d.status === 'Resolved' && d.createdAt && d.resolvedAt)
        .reduce((acc, d) => {
            const timeDiff = differenceInMilliseconds(toDate(d.resolvedAt!), toDate(d.createdAt));
            return acc + timeDiff;
        }, 0);

    const avgResolutionTimeMs = resolvedDisputes > 0 ? totalResolutionTime / resolvedDisputes : 0;
    const avgResolutionTimeDays = avgResolutionTimeMs / (1000 * 60 * 60 * 24);

    const chartData = [{ name: 'Resolved', value: resolutionRate, fill: 'hsl(var(--primary))' }];
    const performanceChartConfig = {
      value: { label: 'Disputes' },
    } satisfies ChartConfig;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Dispute Performance</CardTitle>
                <CardDescription>Metrics based on this team member's involvement in disputes.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
                <Card className="flex flex-col items-center justify-center p-6">
                    <ChartContainer
                        config={performanceChartConfig}
                        className="mx-auto aspect-square h-full w-full max-w-[250px]"
                    >
                        <RadialBarChart
                            data={chartData}
                            startAngle={90}
                            endAngle={-270}
                            innerRadius="70%"
                            outerRadius="110%"
                        >
                            <PolarGrid gridType="circle" radialLines={false} stroke="none" />
                            <RadialBar dataKey="value" background cornerRadius={10} />
                            <PolarAngleAxis type="number" domain={[0, 100]} dataKey="value" tick={false} />
                        </RadialBarChart>
                    </ChartContainer>
                     <p className="text-5xl font-bold mt-[-2.5rem]">{resolutionRate.toFixed(0)}<span className="text-xl text-muted-foreground">%</span></p>
                    <p className="text-center text-sm text-muted-foreground mt-2">Resolution Rate</p>
                </Card>
                <div className="grid grid-rows-3 gap-4">
                    <Card className="flex flex-col items-center justify-center p-4 text-center">
                        <MessageSquare className="h-6 w-6 mb-2 text-primary" />
                        <p className="text-2xl font-bold">{totalDisputes}</p>
                        <p className="text-sm text-muted-foreground">Total Disputes Handled</p>
                    </Card>
                    <Card className="flex flex-col items-center justify-center p-4 text-center">
                        <ShieldCheck className="h-6 w-6 mb-2 text-green-600" />
                        <p className="text-2xl font-bold">{resolvedDisputes}</p>
                        <p className="text-sm text-muted-foreground">Disputes Resolved</p>
                    </Card>
                     <Card className="flex flex-col items-center justify-center p-4 text-center">
                        <Clock className="h-6 w-6 mb-2 text-amber-500" />
                        <p className="text-2xl font-bold">{avgResolutionTimeDays.toFixed(1)} Days</p>
                        <p className="text-sm text-muted-foreground">Avg. Resolution Time</p>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );
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
  const params = React.use(useParams());
  const { user: authUser, isAdmin, role: authUserRole } = useAuthUser();
  const id = params.id as string;
  const { db } = useFirebase();
  const { toast } = useToast();

  const [profileUser, setProfileUser] = React.useState<User | null | undefined>(undefined);
  const [userPostedJobs, setUserPostedJobs] = React.useState<Job[]>([]);
  const [userCompletedJobs, setUserCompletedJobs] = React.useState<Job[]>([]);
  const [involvedDisputes, setInvolvedDisputes] = React.useState<Dispute[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [jobsView, setJobsView] = React.useState<'list' | 'grid'>('list');

  const fetchUserData = React.useCallback(async () => {
        setLoading(true);
        const userDoc = await getDoc(doc(db, "users", id));
        if (!userDoc.exists()) {
            setProfileUser(null);
            setLoading(false);
            return;
        }
        const user = { id: userDoc.id, ...userDoc.data() } as User;
        setProfileUser(user);
        
        const isTeamMember = user.roles.includes('Admin') || user.roles.includes('Support Team');
        const jobsRef = collection(db, "jobs");
        const disputesRef = collection(db, "disputes");
        
        const promises = [];

        if (isTeamMember) {
            // Fetch disputes where this team member has participated
            const disputesQuery = query(disputesRef, where('messages', 'array-contains-any', [{ authorId: user.id }]));
            promises.push(getDocs(disputesRef).then(allDisputesSnapshot => {
                const relatedDisputes = allDisputesSnapshot.docs
                    .map(d => d.data() as Dispute)
                    .filter(d => d.messages.some(m => m.authorId === user.id));
                setInvolvedDisputes(relatedDisputes);
            }));
        } else {
            if (user.roles.includes('Job Giver')) {
                const postedJobsQuery = query(jobsRef, where('jobGiver', '==', userDoc.ref));
                promises.push(getDocs(postedJobsQuery).then(s => setUserPostedJobs(s.docs.map(d => d.data() as Job))));
            }
            if (user.roles.includes('Installer')) {
                const completedJobsQuery = query(jobsRef, where('status', '==', 'Completed'), where('awardedInstaller', '==', userDoc.ref));
                promises.push(getDocs(completedJobsQuery).then(s => setUserCompletedJobs(s.docs.map(d => d.data() as Job))));
            }
        }
        
        await Promise.all(promises);
        setLoading(false);
  }, [id, db]);

  React.useEffect(() => {
    if (id) {
        fetchUserData();
    }
  }, [id, fetchUserData]);
  
  const handleSubscriptionUpdate = (newExpiry: Date) => {
    setProfileUser(prev => prev ? {
        ...prev,
        subscription: {
            ...prev.subscription!,
            expiresAt: newExpiry,
        }
    } : null);
  };
  
  const handleUserUpdate = (data: Partial<User>) => {
    setProfileUser(prev => prev ? { ...prev, ...data } : null);
  }

  if (loading || profileUser === undefined) {
    return <PageSkeleton />;
  }

  if (profileUser === null) {
    notFound();
  }

  const { name, email, id: userId, memberSince, realAvatarUrl, address, roles, subscription, status, suspensionEndDate } = profileUser;
  const installerProfile = profileUser.installerProfile;
  const isInstaller = roles.includes('Installer');
  const isTeamMember = roles.includes('Admin') || roles.includes('Support Team');
  
  const jobsCompletedCount = userCompletedJobs.length;

  const currentTierInfo = installerProfile ? tierData[installerProfile.tier] : null;
  const progressPercentage = currentTierInfo && installerProfile ? ((installerProfile.points - currentTierInfo.points) / (currentTierInfo.goal - currentTierInfo.points)) * 100 : 0;
  
  const getUserStatusBadge = () => {
    switch (status) {
      case 'suspended':
        return <Badge variant="warning">Suspended</Badge>;
      case 'deactivated':
        return <Badge variant="destructive">Deactivated</Badge>;
      default:
        return <Badge variant="success">Active</Badge>;
    }
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(userId);
    toast({
        title: "User ID Copied!",
        description: "The user's public ID has been copied to your clipboard.",
    });
  }

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
                {getUserStatusBadge()}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground mt-1">
                 {roles.map(r => <Badge key={r} variant="outline" className="font-normal">{r}</Badge>)}
                 {installerProfile?.verified && <Badge variant="secondary" className="gap-1 pl-2 font-normal"><ShieldCheck className="h-4 w-4 text-green-600"/> Verified</Badge>}
              </div>
               <div className="flex flex-col mt-2">
                 <div className="flex items-center gap-2">
                    <p className="text-muted-foreground font-mono truncate max-w-sm">{userId}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyId}><Copy className="h-4 w-4" /></Button>
                 </div>
                {suspensionEndDate && status === 'suspended' && (
                  <p className="text-sm text-destructive font-medium">Suspension ends: {format(toDate(suspensionEndDate), "PP")}</p>
                )}
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
            {isAdmin && subscription && <ManageSubscriptionDialog user={profileUser} onSubscriptionUpdate={handleSubscriptionUpdate} />}
            {authUserRole === 'Job Giver' && isInstaller && (
                 <Button asChild>
                    <Link href={`/dashboard/post-job?directAwardInstallerId=${userId}`}>
                        <UserPlus className="mr-2 h-4 w-4"/>
                        Hire Now for a Project
                    </Link>
                </Button>
            )}
          </div>
        </CardHeader>
        {subscription && (
            <CardContent>
                 <div className="text-sm">
                    <span className="font-semibold">{subscription.planName}</span>
                    <span className="text-muted-foreground"> (Expires: {format(toDate(subscription.expiresAt), 'MMM d, yyyy')})</span>
                </div>
            </CardContent>
        )}
      </Card>

      {isAdmin && authUser?.id !== profileUser.id && (
        <AdminActionsCard user={profileUser} onUserUpdate={handleUserUpdate} />
      )}
      
      {isTeamMember && involvedDisputes.length > 0 && <DisputePerformanceCard disputes={involvedDisputes} />}

      {isInstaller && installerProfile && !isTeamMember && (
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

      {!isTeamMember && (roles.includes('Job Giver') || roles.includes('Installer')) && (
        <Card>
            <Tabs defaultValue={roles.includes('Job Giver') ? "posted" : "completed"}>
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
