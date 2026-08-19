"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Gem, 
    Medal, 
    Star, 
    ShieldCheck, 
    Briefcase, 
    TrendingUp, 
    CalendarDays, 
    Building, 
    MapPin, 
    Grid, 
    List, 
    Award, 
    Edit, 
    UserX, 
    UserCheck, 
    Loader2, 
    Ban, 
    Trash2, 
    Gauge, 
    Clock, 
    MessageSquare, 
    Copy, 
    UserPlus,
    XCircle,
    CheckCircle2,
    Sparkles,
    Zap,
    ShieldAlert,
    ChevronRight,
    Search,
    Filter,
    Plus,
    FileText,
    ArrowRight
} from "lucide-react";
import { PortfolioViewer } from "@/components/profile/portfolio-viewer";
import { Progress } from "@/components/ui/progress";
import React, { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { format, differenceInMilliseconds } from "date-fns";
import { useParams, useRouter, notFound } from "next/navigation";
import { JobCard } from "@/components/job-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from 'next-intl';
import { Job, User, Dispute, Bid } from "@/lib/types";
import { getStatusVariant, toDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn, getRefId } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser as useAuthUser } from "@/hooks/use-user";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { collection, query, where, getDocs, getDoc, doc, updateDoc, deleteDoc as deleteFirestoreDoc } from "firebase/firestore";
import { signInWithCustomToken } from "firebase/auth";
import type { DocumentReference } from "firebase/firestore";
import axios from "axios";
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
  AlertDialogCancel as AlertDialogCancelBtn
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";

const tierIcons: Record<string, React.ReactNode> = {
  Bronze: <Medal className="h-8 w-8 text-yellow-700" />,
  Silver: <Medal className="h-8 w-8 text-gray-300" />,
  Gold: <Gem className="h-8 w-8 text-amber-500" />,
  Platinum: <Gem className="h-8 w-8 text-cyan-400" />,
};

const tierData: Record<string, { points: number, next: string, goal: number, color: string }> = {
  'Bronze': { points: 0, next: 'Silver', goal: 500, color: 'from-yellow-700/20 to-transparent' },
  'Silver': { points: 500, next: 'Gold', goal: 1000, color: 'from-slate-400/20 to-transparent' },
  'Gold': { points: 1000, next: 'Platinum', goal: 2000, color: 'from-amber-500/20 to-transparent' },
  'Platinum': { points: 2000, next: 'Max', goal: 2000, color: 'from-cyan-400/20 to-transparent' },
};

const chartConfig = {
  points: {
    label: "Points",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

const wasJobAwardedDirectly = (job: Job) => {
  if (!job.awardedProfessional) return false;
  const awardedProfessionalId = getRefId(job.awardedProfessional);
  if (!awardedProfessionalId) return false;
  if (!job.bids || job.bids.length === 0) return true;
  return !(job.bids || []).some(bid => getRefId(bid.professional) === awardedProfessionalId);
};

function ManageSubscriptionDialog({ user, onSubscriptionUpdate }: { user: User, onSubscriptionUpdate: (newExpiry: Date) => void }) {
  const { toast } = useToast();
  const { db } = useFirebase();
  const tCommon = useTranslations('common');
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
    toast({ title: "Subscription Updated", description: `${user.name} has been granted access.` });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all">
          <Edit className="h-4 w-4 mr-2" />
          SUBSCRIPTION CONTROL
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[3.5rem] bg-surface-container-low/60 backdrop-blur-3xl border-none p-12 shadow-[0_45px_120px_rgba(0,0,0,0.3)] ring-1 ring-white/10">
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase">{user.name.split(' ')[0]}&apos;s Access</DialogTitle>
          <DialogDescription className="text-sm font-medium opacity-60">Grant or extend this user&apos;s premium capabilities directly from the bridge.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-8">
            <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic">Log Term (Days)</Label>
                <Input
                    type="number"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="h-16 rounded-2xl bg-background/50 border-none ring-1 ring-white/5 font-black text-xl"
                />
            </div>
        </div>
        <DialogFooter className="gap-3">
          <DialogClose asChild><Button variant="ghost" className="h-14 px-8 rounded-[1.25rem] font-black text-xs uppercase tracking-widest italic hover:bg-background/5">ABORT COMMAND</Button></DialogClose>
          <Button onClick={handleGrantAccess} className="h-14 px-8 rounded-[1.25rem] bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 italic hover:scale-105 active:scale-95 transition-all">GRANT ACCESS</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminActionsCard({ user, onUserUpdate }: { user: User, onUserUpdate: (data: Partial<User>) => void }) {
  const { toast } = useToast();
  const { db, auth } = useFirebase();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [suspensionDays, setSuspensionDays] = React.useState(7);
  const [isSuspendOpen, setIsSuspendOpen] = React.useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("");

  const handleImpersonate = async () => {
    if (!auth || !auth.currentUser) return;
    setIsLoading(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await axios.post('/api/admin/impersonate', { targetUserId: user.id }, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      const { token } = response.data;
      await signInWithCustomToken(auth, token);
      toast({ title: "Impersonation Active" });
      window.location.href = '/dashboard';
    } catch (error: any) {
      toast({ title: "Impersonation Failed", description: "Authorization revoked.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  const setStatus = async (s: string, date?: Date) => {
      setIsLoading(true);
      const updates: any = { status: s };
      if (date) updates.suspensionEndDate = date;
      await updateDoc(doc(db, 'users', user.id), updates);
      await updateDoc(doc(db, 'public_profiles', user.id), { status: s }).catch(() => {});
      onUserUpdate(updates);
      setIsLoading(false);
      setIsSuspendOpen(false);
  }

  const handleDelete = async () => {
    setIsLoading(true);
    await deleteFirestoreDoc(doc(db, 'users', user.id));
    toast({ title: "Subject Terminated", variant: "destructive" });
    router.push("/dashboard/users");
  };

  return (
    <Card className="border-none shadow-[0_45px_120px_rgba(0,0,0,0.3)] bg-surface-container-highest/60 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden ring-1 ring-white/10 group relative">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-destructive via-amber-500 to-destructive animate-gradient-x opacity-40" />
      <CardHeader className="p-10 pb-4 relative">
        <CardTitle className="text-3xl font-black italic tracking-tighter uppercase flex items-center gap-4">
            <ShieldAlert className="h-8 w-8 text-destructive animate-pulse" />
            ADMIN CONTROL TERMINAL
            <div className="h-1.5 flex-1 bg-gradient-to-r from-destructive/20 to-transparent rounded-full" />
        </CardTitle>
        <CardDescription className="text-sm font-medium opacity-60">High-authority protocols for account management and security enforcement.</CardDescription>
      </CardHeader>
      <CardContent className="p-10 space-y-6">
        <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:bg-primary/10">
          <div className="space-y-1">
            <h3 className="font-black text-lg italic tracking-tight uppercase flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Auth Impersonation
            </h3>
            <p className="text-sm text-muted-foreground font-medium">Access the bridge exactly as {user.name.split(' ')[0]} sees it.</p>
          </div>
          <Button variant="outline" className="h-14 px-8 rounded-2xl border-primary/20 text-primary font-black text-xs uppercase tracking-widest hover:bg-primary/10 shadow-xl shadow-primary/5" onClick={handleImpersonate} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
            LOG IN AS {user.name.split(' ')[0]}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-background/40 p-8 rounded-[2rem] border border-white/5 flex flex-col justify-between gap-6 hover:bg-background/60 transition-all">
                <div className="space-y-1">
                    <h3 className="font-black text-lg italic tracking-tight uppercase">Account Suspension</h3>
                    <p className="text-xs text-muted-foreground font-medium">Temporarily revoke access for protocol violations.</p>
                </div>
                {user.status === 'active' ? (
                    <Dialog open={isSuspendOpen} onOpenChange={setIsSuspendOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-500/10 border-amber-500/20 text-amber-500"><Ban className="mr-2 h-4 w-4" />INITIATE SUSPENSION</Button>
                        </DialogTrigger>
                        <DialogContent className="group relative overflow-hidden rounded-[3.5rem] bg-surface-container-low/40 backdrop-blur-3xl border border-white/5 p-12 shadow-[0_45px_120px_rgba(0,0,0,0.15)] transition-all hover:translate-x-1">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black italic uppercase">SUSPEND PROTOCOL</DialogTitle>
                                <DialogDescription className="font-medium opacity-60">Specify the duration of access revocation for {user.name}.</DialogDescription>
                            </DialogHeader>
                            <div className="py-8 space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">Duration (Days)</Label>
                                <Input type="number" value={suspensionDays} onChange={(e) => setSuspensionDays(parseInt(e.target.value))} className="h-16 rounded-2xl bg-background/50 border-none ring-1 ring-white/5 font-black text-xl" />
                            </div>
                            <DialogFooter className="gap-4">
                                <Button variant="ghost" onClick={() => setIsSuspendOpen(false)} className="h-14 font-black italic rounded-[1.25rem] hover:bg-background/5 px-8">ABORT</Button>
                                <Button variant="destructive" className="h-14 px-10 rounded-[1.25rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-destructive/20 italic hover:scale-105 transition-all" onClick={() => setStatus('suspended', new Date(Date.now() + suspensionDays * 86400000))} disabled={isLoading}>REVOKE ACCESS</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                ) : (
                    <Button className="w-full h-14 rounded-2xl bg-success text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-success/20" onClick={() => setStatus('active')} disabled={isLoading}><UserCheck className="mr-2 h-4 w-4" />RESTORE ACCESS</Button>
                )}
            </div>

            <div className="bg-destructive/5 p-8 rounded-[2rem] border border-destructive/10 flex flex-col justify-between gap-6 hover:bg-destructive/10 transition-all">
                <div className="space-y-1">
                    <h3 className="font-black text-lg italic tracking-tight uppercase text-destructive">System Termination</h3>
                    <p className="text-xs text-destructive/60 font-medium italic">Permanent data erasure. This protocol is irreversible.</p>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-destructive/20" disabled={isLoading}><Trash2 className="mr-2 h-4 w-4" />PURGE SUBJECT</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[3.5rem] bg-surface-container-low/60 backdrop-blur-3xl border-none p-12 shadow-[0_45px_120px_rgba(0,0,0,0.3)] ring-1 ring-white/10">
                        <AlertDialogHeader className="space-y-4">
                            <AlertDialogTitle className="text-3xl font-black italic uppercase text-destructive">DATA PURGE CONFIRMATION</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm font-medium opacity-60">You are about to permanently erase all records for <span className="text-foreground font-black">{user.name}</span>. Type <span className="text-destructive font-black">PURGE</span> below to authorize.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-8">
                            <Input placeholder="Authorization Code" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} className="h-16 rounded-2xl bg-destructive/5 border-none ring-1 ring-destructive/20 font-black text-xl text-destructive" />
                        </div>
                        <AlertDialogFooter className="gap-4">
                            <Button variant="ghost" onClick={() => setDeleteConfirmation('')} className="h-14 font-black italic rounded-[1.25rem] hover:bg-background/5 px-8">ABORT TERMINATION</Button>
                            <Button className="h-14 px-12 rounded-[1.25rem] bg-destructive text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-destructive/40 italic hover:scale-105 transition-all" onClick={handleDelete} disabled={deleteConfirmation !== 'PURGE' || isLoading}>CONFIRM PURGE</Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DisputePerformanceCard({ disputes }: { disputes: Dispute[] }) {
  const totalDisputes = disputes.length;
  const resolvedDisputes = disputes.filter(d => d.status === 'Resolved').length;
  const resolutionRate = totalDisputes > 0 ? (resolvedDisputes / totalDisputes) * 100 : 0;
  const totalResolutionTime = disputes.filter(d => d.status === 'Resolved' && d.createdAt && d.resolvedAt).reduce((acc, d) => acc + differenceInMilliseconds(toDate(d.resolvedAt!), toDate(d.createdAt)), 0);
  const avgResolutionTimeDays = resolvedDisputes > 0 ? (totalResolutionTime / resolvedDisputes) / (1000 * 60 * 60 * 24) : 0;

  return (
    <Card className="border-none shadow-[0_45px_120px_rgba(0,0,0,0.3)] bg-surface-container-low/40 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden ring-1 ring-white/10">
      <CardHeader className="p-10 pb-4">
        <CardTitle className="text-2xl font-black italic tracking-tighter uppercase opacity-60 flex items-center gap-4">
            DISPUTE TELEMETRY
            <div className="h-1.5 flex-1 bg-gradient-to-r from-primary/20 to-transparent rounded-full" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-10 grid gap-10 md:grid-cols-2 items-center">
        <div className="flex flex-col items-center justify-center p-10 bg-surface-container-high/40 rounded-[2.5rem] border border-white/5 shadow-inner group">
          <div className="relative flex items-center justify-center mb-4">
              <ResponsiveContainer width={200} height={200}>
                <RadialBarChart innerRadius="70%" outerRadius="110%" barSize={10} data={[{ name: 'Rate', value: resolutionRate, fill: 'hsl(var(--primary))' }]}>
                  <RadialBar background dataKey="value" cornerRadius={5} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black italic tracking-tighter">{resolutionRate.toFixed(0)}<span className="text-xl opacity-40">%</span></span>
              </div>
          </div>
          <p className="font-black text-[10px] uppercase tracking-[0.3em] opacity-40">RESOLUTION RATE</p>
        </div>
        <div className="grid grid-cols-1 gap-6">
            {[
                { label: "HANDLED", val: totalDisputes, icon: MessageSquare, color: "text-primary", bg: "bg-primary/10" },
                { label: "RESOLVED", val: resolvedDisputes, icon: ShieldCheck, color: "text-success", bg: "bg-success/10" },
                { label: "AVG TIME", val: `${avgResolutionTimeDays.toFixed(1)}d`, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" }
            ].map((stat, i) => (
                <div key={i} className="flex items-center gap-6 p-6 bg-surface-container-high/40 rounded-3xl border border-white/5 hover:bg-surface-container-high/60 transition-all group">
                    <div className={cn("p-4 rounded-2xl shadow-xl transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                        <stat.icon className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic">{stat.label}</p>
                        <p className="text-2xl font-black italic tracking-tighter">{stat.val}</p>
                    </div>
                </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="container py-12 space-y-12 animate-pulse">
        <div className="h-80 w-full bg-surface-container-low rounded-[3rem]" />
        <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 h-64 bg-surface-container-low rounded-[2rem]" />
            <div className="h-64 bg-surface-container-low rounded-[2rem]" />
        </div>
    </div>
  );
}

export default function UserProfileClient() {
  const params = useParams();
  const { user: authUser, isAdmin } = useAuthUser();
  const id = params.id as string;
  const { db } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPostedJobs, setUserPostedJobs] = useState<Job[]>([]);
  const [userCompletedJobs, setUserCompletedJobs] = useState<Job[]>([]);
  const [involvedDisputes, setInvolvedDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!db || !id) return;
      setLoading(true);
      const isOwner = authUser?.id === id;
      const collectionName = (isAdmin || isOwner) ? 'users' : 'public_profiles';
      const userDocRef = doc(db, collectionName, id);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) { setLoading(false); notFound(); return; }
      const fetchedUser = { id: userDoc.id, ...userDoc.data() } as User;
      setProfileUser(fetchedUser);

      const isProfessional = fetchedUser.roles.includes('Professional');
      const isClient = fetchedUser.roles.includes('Client');
      const isTeamMember = fetchedUser.roles.includes('Admin') || fetchedUser.roles.includes('Support Team');
      const promises: Promise<any>[] = [];

      promises.push(isClient ? getDocs(query(collection(db, "jobs"), where('client', '==', userDocRef))) : Promise.resolve({ docs: [] }));
      promises.push(isProfessional ? getDocs(query(collection(db, 'jobs'), where('status', '==', 'Completed'), where('awardedProfessional', '==', userDocRef))) : Promise.resolve({ docs: [] }));
      promises.push(isTeamMember ? getDocs(query(collection(db, "disputes"), where('handledBy', '==', id))) : Promise.resolve({ docs: [] }));

      try {
        const [postedJobsSnapshot, completedJobsSnapshot, disputesSnapshot] = await Promise.all(promises);
        const allJobUsers = new Set<string>();
        const allJobsRaw: Job[] = [...postedJobsSnapshot.docs.map((d: any) => d.data()), ...completedJobsSnapshot.docs.map((d: any) => d.data())];
        allJobsRaw.forEach(job => {
          if (getRefId(job.client)) allJobUsers.add(getRefId(job.client)!);
          if (getRefId(job.awardedProfessional)) allJobUsers.add(getRefId(job.awardedProfessional)!);
        });
        const usersMap = new Map<string, User>();
        if (allJobUsers.size > 0) {
          const usersQuery = query(collection(db, 'users'), where('__name__', 'in', Array.from(allJobUsers)));
          const userDocs = await getDocs(usersQuery);
          userDocs.forEach(docSnap => usersMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as User));
        }
        const populateJob = (job: Job) => ({ ...job, client: usersMap.get(getRefId(job.client)!), awardedProfessional: usersMap.get(getRefId(job.awardedProfessional)!) });
        setUserPostedJobs(postedJobsSnapshot.docs.map((d: any) => populateJob(d.data() as Job)));
        setUserCompletedJobs(completedJobsSnapshot.docs.map((d: any) => populateJob(d.data() as Job)));
        setInvolvedDisputes(disputesSnapshot.docs.map((d: any) => d.data() as Dispute));
      } catch (error) { toast({ title: "Error", description: "Telemetry sync failed." }); }
      setLoading(false);
    };
    fetchUserData();
  }, [id, db, toast, authUser?.id, isAdmin]);

  if (loading || !profileUser) return <PageSkeleton />;

  const { name, memberSince, realAvatarUrl, address, roles, subscription, status, suspensionEndDate } = profileUser;
  const professionalProfile = profileUser.professionalProfile;
  const isProfessional = roles.includes('Professional');
  const isClient = roles.includes('Client');
  const isTeamMember = roles.includes('Admin') || roles.includes('Support Team');
  const currentTierInfo = professionalProfile ? tierData[professionalProfile.tier] : null;
  const progressPercentage = currentTierInfo && professionalProfile ? ((professionalProfile.points - currentTierInfo.points) / (currentTierInfo.goal - currentTierInfo.points)) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 pb-20">
      {/* Cinematic Portfolio Hero */}
      <div className={cn(
          "relative min-h-[500px] rounded-[4.5rem] overflow-hidden flex flex-col justify-end p-12 sm:p-24 shadow-[0_40px_100px_rgba(0,0,0,0.1)] group transition-all duration-700",
          currentTierInfo ? `bg-gradient-to-br ${currentTierInfo.color}` : "bg-gradient-to-br from-primary/10 via-background to-transparent"
      )}>
          {/* Animated Background Pulse */}
          <div className="absolute top-[10%] right-[-5%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[180px] pointer-events-none animate-pulse" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-end justify-between gap-12 w-full">
              <div className="flex flex-col items-center lg:items-start gap-8">
                  <div className="relative group/avatar">
                      <Avatar className="h-40 w-40 sm:h-56 sm:w-56 border-[8px] border-background shadow-2xl ring-2 ring-primary/20 transition-transform duration-700 group-hover/avatar:scale-105">
                          <AvatarImage src={realAvatarUrl} className="object-cover" />
                          <AvatarFallback className="text-6xl font-black bg-gradient-to-br from-primary/10 to-primary/30">{name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {status === 'active' && (
                          <div className="absolute bottom-6 right-6 h-10 w-10 bg-success rounded-full border-4 border-background shadow-xl flex items-center justify-center">
                              <ShieldCheck className="h-5 w-5 text-white" />
                          </div>
                      )}
                  </div>

                  <div className="text-center lg:text-left space-y-4">
                      <div className="flex flex-col gap-2">
                         <div className="flex items-center justify-center lg:justify-start gap-6 flex-wrap">
                            <motion.h1 className="text-6xl sm:text-8xl md:text-[9rem] font-black italic tracking-tighter uppercase line-clamp-1 leading-[0.75] mb-2">{name}</motion.h1>
                            {status === 'active' ? (
                                <Badge className="px-6 py-3 rounded-full bg-success/20 text-success border-none font-black text-[10px] uppercase tracking-[0.4em] italic animate-pulse ring-1 ring-success/30 backdrop-blur-md">LIVE PROTOCOL</Badge>
                            ) : (
                                <Badge variant="destructive" className="px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.4em] italic shadow-2xl">{status.toUpperCase()}</Badge>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                            {roles.map(r => (
                                <Badge key={r} variant="outline" className="px-4 py-1.5 rounded-full border-primary/20 bg-primary/5 text-primary font-black text-[9px] uppercase tracking-widest">{r}</Badge>
                            ))}
                            {professionalProfile?.verified && (
                                <Badge className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-500 border-none font-black text-[9px] uppercase tracking-widest italic flex items-center gap-2">
                                    <ShieldCheck className="h-3 w-3" /> VERIFIED EXPERT
                                </Badge>
                            )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8 text-[11px] font-black uppercase tracking-[0.2em] opacity-40">
                          <div className="flex items-center gap-3"><CalendarDays className="h-4 w-4" /> MEMBER SINCE {format(toDate(memberSince), 'MMMM yyyy')}</div>
                          <div className="flex items-center gap-3"><MapPin className="h-4 w-4" /> {address?.cityPincode || "GLOBAL NODE"}</div>
                          <div className="flex items-center gap-3 font-mono cursor-pointer hover:opacity-100 transition-opacity" onClick={() => {navigator.clipboard.writeText(profileUser.id); toast({title: "UID COPIED"})}}>
                              <Copy className="h-4 w-4" /> {profileUser.id.slice(0, 12)}...
                          </div>
                      </div>
                  </div>
              </div>

              <div className="flex flex-col gap-4 min-w-[300px]">
                  {isAdmin && subscription && <ManageSubscriptionDialog user={profileUser} onSubscriptionUpdate={(exp) => setProfileUser(p => p ? {...p, subscription: {...p.subscription!, expiresAt: exp}} : null)} />}
                  {authUser?.roles.includes('Client') && isProfessional && authUser.id !== profileUser.id && (
                    <Button asChild className="h-20 px-12 rounded-[2rem] bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all italic">
                        <Link href={`/dashboard/post-job?directAwardProfessionalId=${profileUser.id}`}>
                            <UserPlus className="mr-4 h-6 w-6" /> HIRE NOW
                        </Link>
                    </Button>
                  )}
                  {subscription && (
                    <div className="p-8 bg-background/5 dark:bg-foreground/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 ring-1 ring-white/5 flex flex-col gap-1 shadow-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">ACCESS LEVEL</p>
                        <p className="font-black text-2xl italic tracking-tight uppercase">{subscription.planName}</p>
                        <div className="flex items-center gap-2 text-[10px] text-primary font-black mt-2 tracking-[0.2em] uppercase italic">
                            <Clock className="h-3.5 w-3.5" /> CLOSURE: {format(toDate(subscription.expiresAt), 'MMM d, yyyy')}
                        </div>
                    </div>
                  )}
              </div>
          </div>
      </div>

      <div className="container px-6 sm:px-12 grid gap-12">
        {isAdmin && authUser?.id !== profileUser.id && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <AdminActionsCard user={profileUser} onUserUpdate={(d) => setProfileUser(p => p ? {...p, ...d} : null)} />
            </motion.div>
        )}

        {isTeamMember && involvedDisputes.length > 0 && <DisputePerformanceCard disputes={involvedDisputes} />}

        {isProfessional && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                <div className="lg:col-span-2 space-y-12">
                    {/* Professional Reputation Card */}
                    <Card className="border-none shadow-[0_45px_120px_rgba(0,0,0,0.3)] bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden ring-1 ring-white/10 relative group">
                        <div className="absolute top-0 right-0 p-10 opacity-5 scale-150 rotate-12 pointer-events-none group-hover:rotate-45 transition-transform duration-1000">
                            <Award className="h-32 w-32 text-primary" />
                        </div>
                        <CardHeader className="p-10 pb-6 border-b border-white/5 bg-background/5">
                            <CardTitle className="text-2xl font-black italic tracking-[0.4em] uppercase text-on-surface/40 flex items-center gap-4">
                                PROFESSIONAL REPUTATION
                                <div className="h-1.5 flex-1 bg-gradient-to-r from-primary/20 to-transparent rounded-full" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 space-y-12 pt-10">
                            {!professionalProfile ? (
                                <div className="p-10 bg-surface-container-high/40 rounded-[2.5rem] border border-dashed border-white/5 text-center">
                                    <p className="font-black text-lg italic uppercase opacity-40">NEW PROFESSIONAL PROTOCOL</p>
                                </div>
                            ) : (
                                <>
                                    <div className={cn(
                                        "p-10 rounded-[3rem] ring-1 ring-white/10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10",
                                        currentTierInfo ? `bg-gradient-to-br ${currentTierInfo.color}` : "bg-surface-container-high"
                                    )}>
                                        <div className="flex items-center gap-8 relative z-10">
                                            <div className="bg-background/80 p-6 rounded-[2rem] shadow-2xl ring-1 ring-white/5">
                                                {tierIcons[professionalProfile.tier] || <Zap className="h-10 w-10" />}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">CURRENT STANDING</p>
                                                <p className="text-4xl font-black italic tracking-tight">{professionalProfile.tier.toUpperCase()} TIER</p>
                                            </div>
                                        </div>
                                        <div className="text-center md:text-right relative z-10">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">REPUTATION POINTS</p>
                                            <p className="text-5xl font-black italic tracking-tighter text-primary">{professionalProfile.points}</p>
                                        </div>
                                    </div>

                                    {currentTierInfo && currentTierInfo.next !== 'Max' && (
                                        <div className="bg-surface-container-high/40 p-10 rounded-[2.5rem] border border-white/5 space-y-6">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic mb-1">ASCENSION PATH</p>
                                                    <p className="font-black text-xl italic tracking-tight">PROGRESS TO {currentTierInfo.next.toUpperCase()}</p>
                                                </div>
                                                <p className="font-black text-lg italic opacity-80">{professionalProfile.points} / {currentTierInfo.goal} PTS</p>
                                            </div>
                                            <Progress value={progressPercentage} className="h-3 rounded-full bg-background/50" />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div className="p-8 bg-surface-container-high/40 rounded-[2.5rem] border border-white/5 flex items-center gap-6 group hover:bg-surface-container-high/60 transition-all">
                                            <div className="p-4 bg-primary/10 text-primary rounded-2xl shadow-xl transition-transform group-hover:scale-110">
                                                <Star className="h-8 w-8" />
                                            </div>
                                            <div>
                                                <p className="text-3xl font-black italic tracking-tighter">{(professionalProfile.rating || 0).toFixed(1)}<span className="text-lg opacity-40">/5.0</span></p>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">FROM {professionalProfile.reviews || 0} REVIEWS</p>
                                            </div>
                                        </div>
                                        <div className="p-8 bg-surface-container-high/40 rounded-[2.5rem] border border-white/5 flex items-center gap-6 group hover:bg-surface-container-high/60 transition-all">
                                            <div className="p-4 bg-success/10 text-success rounded-2xl shadow-xl transition-transform group-hover:scale-110">
                                                <Briefcase className="h-8 w-8" />
                                            </div>
                                            <div>
                                                <p className="text-3xl font-black italic tracking-tighter">{userCompletedJobs.length}</p>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">JOBS COMPLETED</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.4em] opacity-40 italic flex items-center gap-4">
                                            CORE COMPETENCIES
                                            <div className="h-[1px] flex-1 bg-background/5" />
                                        </h4>
                                        <div className="flex flex-wrap gap-4">
                                            {(professionalProfile.skills || []).map(skill => (
                                                <Badge key={skill} className="px-5 py-2 rounded-full border-none bg-background text-foreground font-black text-[10px] uppercase tracking-widest shadow-xl ring-1 ring-white/5 hover:scale-105 transition-transform">{skill}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <PortfolioViewer portfolio={professionalProfile.portfolio || []} />

                                    {professionalProfile.reputationHistory && professionalProfile.reputationHistory.length > 0 && (
                                        <div className="bg-surface-container-high/20 p-10 rounded-[3rem] border border-white/5 space-y-8">
                                            <div className="flex items-center gap-4">
                                                <TrendingUp className="h-5 w-5 text-primary" />
                                                <h4 className="font-black text-[11px] uppercase tracking-[0.3em] opacity-40 italic">REPUTATION TELEMETRY (6MO)</h4>
                                            </div>
                                            <div className="h-64 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={professionalProfile.reputationHistory}>
                                                        <defs>
                                                            <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                        <XAxis dataKey="month" tick={{fontSize: 9, fontWeight: 900}} axisLine={false} tickLine={false} />
                                                        <YAxis hide />
                                                        <Tooltip contentStyle={{backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px', fontSize: '10px', color: '#fff'}} />
                                                        <Area type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={4} fillOpacity={1} fill="url(#colorPoints)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-12 h-fit">
                    {/* Activity Feed / Compact Sidebar */}
                    <Card className="border-none shadow-[0_45px_120px_rgba(0,0,0,0.3)] bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden ring-1 ring-white/10">
                        <CardHeader className="p-10 pb-6 border-b border-white/5 bg-background/5">
                            <CardTitle className="text-xl font-black italic tracking-[0.4em] uppercase text-on-surface/40">ACTIVE LOGS</CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 pt-10 space-y-6">
                            {userPostedJobs.length === 0 && userCompletedJobs.length === 0 ? (
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-20 text-center py-10">EMPTY FEED</p>
                            ) : (
                                <div className="space-y-4">
                                    {[...userPostedJobs, ...userCompletedJobs].slice(0, 5).map((job, i) => (
                                        <Link key={i} href={`/dashboard/jobs/${job.id}`} className="group block">
                                            <div className="p-1.5 flex items-center gap-4 hover:translate-x-2 transition-transform">
                                                <div className={cn(
                                                    "h-2 w-2 rounded-full",
                                                    job.status === 'Completed' ? "bg-success" : "bg-primary"
                                                )} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-black text-xs uppercase tracking-tight italic line-clamp-1 group-hover:text-primary transition-colors">{job.title}</p>
                                                    <p className="text-[9px] font-black uppercase opacity-40">{format(toDate(job.postedAt), "MMM d, yyyy")}</p>
                                                </div>
                                                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="p-10 pt-4">
                            <Button variant="ghost" className="w-full rounded-2xl h-12 font-black text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity" asChild>
                                <Link href="/dashboard/jobs">VIEW ARCHIVES</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        )}
      </div>
    </motion.div>
  );
}


