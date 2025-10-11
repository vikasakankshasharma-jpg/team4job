
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useFirebase } from "@/lib/firebase/client-provider";
import { Download, Users, Briefcase, IndianRupee, FileText, Calendar as CalendarIcon, X } from "lucide-react";
import React, { useState } from "react";
import { Job, User } from "@/lib/types";
import { toDate, exportToCsv, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, query, where, QueryConstraint } from "firebase/firestore";
import { DocumentReference }from "firebase/firestore";
import type { DateRange } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

type ReportCardProps = {
  title: string;
  description: string;
  icon: React.ElementType;
  onExport: () => void;
  loading: boolean;
  children?: React.ReactNode;
};

function ReportCard({ title, description, icon: Icon, onExport, loading, children }: ReportCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-3 rounded-full">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
      <CardFooter>
        <Button onClick={onExport} disabled={loading}>
          <Download className="mr-2 h-4 w-4" />
          {loading ? "Generating..." : "Export CSV"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function ReportsPage() {
  const { user, role, isAdmin } = useUser();
  const { db } = useFirebase();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [userFilters, setUserFilters] = useState({ role: 'all', tier: 'all', verified: 'all' });
  const [jobFilters, setJobFilters] = useState<{ status: string; date?: DateRange }>({ status: 'all' });

  const handleExport = async (generator: () => Promise<{data: any[], filename: string}>) => {
    setLoading(true);
    try {
      const { data, filename } = await generator();
      if (data.length === 0) {
        toast({
          title: "No Data to Export",
          description: "There is no data available for the selected filters.",
          variant: "destructive"
        });
        return;
      }
      exportToCsv(filename, data);
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while generating the report.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // --- ADMIN REPORTS ---
  const generateAllUsersReport = async () => {
    const qConstraints: QueryConstraint[] = [];
    if (userFilters.role !== 'all') {
      qConstraints.push(where('roles', 'array-contains', userFilters.role));
    }
    if (userFilters.tier !== 'all') {
      qConstraints.push(where('installerProfile.tier', '==', userFilters.tier));
    }
    if (userFilters.verified !== 'all') {
      qConstraints.push(where('installerProfile.verified', '==', userFilters.verified === 'true'));
    }

    const usersQuery = query(collection(db, "users"), ...qConstraints);
    const usersSnapshot = await getDocs(usersQuery);
    const users = usersSnapshot.docs.map(d => d.data() as User);
    
    const data = users.map(u => ({
      ID: u.id,
      Name: u.name,
      Email: u.email,
      Mobile: u.mobile,
      Roles: u.roles.join(', '),
      MemberSince: toDate(u.memberSince).toLocaleDateString(),
      InstallerTier: u.installerProfile?.tier || 'N/A',
      ReputationPoints: u.installerProfile?.points || 0,
      Rating: u.installerProfile?.rating || 0,
      Reviews: u.installerProfile?.reviews || 0,
      IsVerified: u.installerProfile?.verified ? 'Yes' : 'No',
    }));
    return { data, filename: `all-users-${new Date().toISOString().split('T')[0]}.csv` };
  };

  const generateAllJobsReport = async () => {
    const qConstraints: QueryConstraint[] = [];
    if (jobFilters.status !== 'all') {
      qConstraints.push(where('status', '==', jobFilters.status));
    }
    if (jobFilters.date?.from) {
      qConstraints.push(where('postedAt', '>=', jobFilters.date.from));
    }
    if (jobFilters.date?.to) {
      qConstraints.push(where('postedAt', '<=', jobFilters.date.to));
    }

    const jobsQuery = query(collection(db, "jobs"), ...qConstraints);
    const jobsSnapshot = await getDocs(jobsQuery);
    const jobs = jobsSnapshot.docs.map(d => d.data() as Job);
    const data = jobs.map(job => ({
      ID: job.id,
      Title: job.title,
      Status: job.status,
      JobGiverID: (job.jobGiver as DocumentReference)?.id,
      AwardedInstallerID: (job.awardedInstaller as DocumentReference)?.id || 'N/A',
      MinBudget: job.budget.min,
      MaxBudget: job.budget.max,
      PostedDate: toDate(job.postedAt).toLocaleDateString(),
      Deadline: toDate(job.deadline).toLocaleDateString(),
    }));
    return { data, filename: `all-jobs-${new Date().toISOString().split('T')[0]}.csv` };
  };

  // --- INSTALLER REPORTS ---
  const generateEarningsReport = async () => {
    if (!user) return { data: [], filename: '' };
    const qConstraints: QueryConstraint[] = [
      where('status', '==', "Completed"),
      where('awardedInstaller', '==', doc(db, 'users', user.id))
    ];
    // Note: Firestore does not support range filters on different fields. 
    // Date filtering would need to happen client-side if combined with other range filters.
    // For this case, it's fine as we only have one date field.

    const querySnapshot = await getDocs(query(collection(db, "jobs"), ...qConstraints));
    let myCompletedJobs = querySnapshot.docs.map(d => d.data() as Job);

    if (jobFilters.date?.from) {
      myCompletedJobs = myCompletedJobs.filter(j => toDate(j.postedAt) >= jobFilters.date!.from!);
    }
    if (jobFilters.date?.to) {
      myCompletedJobs = myCompletedJobs.filter(j => toDate(j.postedAt) <= jobFilters.date!.to!);
    }

    const data = myCompletedJobs.map(job => {
      const winningBid = (job.bids || []).find(b => ((b.installer as DocumentReference)?.id) === user.id);
      return {
        JobID: job.id,
        JobTitle: job.title,
        CompletionDate: toDate(job.deadline).toLocaleDateString(), // Assuming deadline is completion date for this mock
        YourBidAmount: winningBid?.amount || 'Direct Award',
      };
    });

    return { data, filename: `earnings-report-${user.id}-${new Date().toISOString().split('T')[0]}.csv` };
  };
  
  // --- JOB GIVER REPORTS ---
  const generateMyJobsReport = async () => {
    if (!user) return { data: [], filename: '' };
    const qConstraints: QueryConstraint[] = [where('jobGiver', '==', doc(db, 'users', user.id))];
    if (jobFilters.status !== 'all') {
      qConstraints.push(where('status', '==', jobFilters.status));
    }
    
    const querySnapshot = await getDocs(query(collection(db, "jobs"), ...qConstraints));
    const myJobs = querySnapshot.docs.map(d => d.data() as Job);

    const data = myJobs.map(job => ({
      JobID: job.id,
      JobTitle: job.title,
      Status: job.status,
      BidsReceived: (job.bids || []).length,
      AwardedInstallerID: (job.awardedInstaller as DocumentReference)?.id || 'N/A',
      PostedDate: toDate(job.postedAt).toLocaleDateString(),
    }));
    return { data, filename: `my-jobs-report-${user.id}-${new Date().toISOString().split('T')[0]}.csv` };
  };

  const jobStatuses = ["All", "Open for Bidding", "Bidding Closed", "Awarded", "In Progress", "Completed", "Cancelled", "Unbid"];
  const userRoles = ["All", "Admin", "Installer", "Job Giver"];
  const installerTiers = ["All", "Bronze", "Silver", "Gold", "Platinum"];
  const verificationStatuses = [
    { value: 'all', label: 'All' },
    { value: 'true', label: 'Verified' },
    { value: 'false', label: 'Not Verified' },
  ];

  const AdminReports = () => (
    <div className="space-y-4">
      <ReportCard title="All Users Report" description="Export a complete list of all registered users and their profile data." icon={Users} onExport={() => handleExport(generateAllUsersReport)} loading={loading}>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6">
          <Select value={userFilters.role} onValueChange={(value) => setUserFilters(f => ({ ...f, role: value }))}>
              <SelectTrigger><SelectValue placeholder="Filter by Role..." /></SelectTrigger>
              <SelectContent>{userRoles.map(r => <SelectItem key={r} value={r === 'All' ? 'all' : r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={userFilters.tier} onValueChange={(value) => setUserFilters(f => ({ ...f, tier: value }))}>
              <SelectTrigger><SelectValue placeholder="Filter by Tier..." /></SelectTrigger>
              <SelectContent>{installerTiers.map(t => <SelectItem key={t} value={t === 'All' ? 'all' : t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={userFilters.verified} onValueChange={(value) => setUserFilters(f => ({ ...f, verified: value }))}>
              <SelectTrigger><SelectValue placeholder="Filter by Verification..." /></SelectTrigger>
              <SelectContent>{verificationStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </ReportCard>
      <ReportCard title="All Jobs Report" description="Export a comprehensive list of all jobs posted on the platform, including their status and key details." icon={Briefcase} onExport={() => handleExport(generateAllJobsReport)} loading={loading}>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
           <Select value={jobFilters.status} onValueChange={(value) => setJobFilters(f => ({ ...f, status: value }))}>
                <SelectTrigger><SelectValue placeholder="Filter by Status..." /></SelectTrigger>
                <SelectContent>{jobStatuses.map(s => <SelectItem key={s} value={s === 'All' ? 'all' : s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <DateRangePicker date={jobFilters.date} onDateChange={(date) => setJobFilters(f => ({ ...f, date }))} />
        </CardContent>
      </ReportCard>
      <ReportCard title="Financial Report" description="Export a summary of financial transactions, including job values and commissions." icon={IndianRupee} onExport={async () => { toast({title: "Coming Soon!"}); return {data: [], filename: ''}; }} loading={loading} />
    </div>
  );
  
  const InstallerReports = () => (
    <div className="space-y-4">
        <ReportCard title="Earnings Report" description="Export a detailed history of your earnings from completed jobs." icon={IndianRupee} onExport={() => handleExport(generateEarningsReport)} loading={loading}>
           <CardContent className="border-t pt-6">
             <DateRangePicker date={jobFilters.date} onDateChange={(date) => setJobFilters(f => ({ ...f, date }))} />
           </CardContent>
        </ReportCard>
        <ReportCard title="Bids History Report" description="Download a full report of all the bids you have placed and their outcomes." icon={FileText} onExport={async () => { toast({title: "Coming Soon!"}); return {data: [], filename: ''}; }} loading={loading} />
    </div>
  );

  const JobGiverReports = () => (
    <div className="space-y-4">
        <ReportCard title="My Jobs Report" description="Export a list of all jobs you have posted, including their status and number of bids." icon={Briefcase} onExport={() => handleExport(generateMyJobsReport)} loading={loading}>
          <CardContent className="border-t pt-6">
            <Select value={jobFilters.status} onValueChange={(value) => setJobFilters(f => ({ ...f, status: value }))}>
                <SelectTrigger><SelectValue placeholder="Filter by Status..." /></SelectTrigger>
                <SelectContent>{jobStatuses.map(s => <SelectItem key={s} value={s === 'All' ? 'all' : s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </ReportCard>
        <ReportCard title="Spending Report" description="Download a summary of your spending on successfully awarded and completed jobs." icon={IndianRupee} onExport={async () => { toast({title: "Coming Soon!"}); return {data: [], filename: ''}; }} loading={loading} />
    </div>
  );

  const DateRangePicker = ({ date, onDateChange }: { date?: DateRange, onDateChange: (date?: DateRange) => void }) => (
     <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Filter by date...</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      {date && (
        <Button variant="ghost" size="icon" onClick={() => onDateChange(undefined)}>
            <X className="h-4 w-4" />
        </Button>
      )}
     </div>
  );

  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold">Reports</h1>
      <p className="text-muted-foreground">
        Download your data in CSV format. Select a report below to get started.
      </p>

      {isAdmin && <AdminReports />}
      {role === 'Installer' && <InstallerReports />}
      {role === 'Job Giver' && <JobGiverReports />}
    </div>
  );
}

    