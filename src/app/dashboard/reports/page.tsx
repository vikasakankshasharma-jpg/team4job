
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useFirebase } from "@/lib/firebase/client-provider";
import { Download, Users, Briefcase, IndianRupee, FileText } from "lucide-react";
import React from "react";
import { Job, User } from "@/lib/types";
import { toDate, exportToCsv } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, query, where } from "firebase/firestore";
import { DocumentReference } from "firebase/firestore";


type ReportCardProps = {
  title: string;
  description: string;
  icon: React.ElementType;
  onExport: () => void;
  loading: boolean;
};

function ReportCard({ title, description, icon: Icon, onExport, loading }: ReportCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-3 rounded-full">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
        <Button onClick={onExport} disabled={loading}>
          <Download className="mr-2 h-4 w-4" />
          {loading ? "Generating..." : "Export CSV"}
        </Button>
      </CardHeader>
    </Card>
  );
}

export default function ReportsPage() {
  const { user, role, isAdmin } = useUser();
  const { db } = useFirebase();
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  const handleExport = async (generator: () => Promise<{data: any[], filename: string}>) => {
    setLoading(true);
    try {
      const { data, filename } = await generator();
      if (data.length === 0) {
        toast({
          title: "No Data to Export",
          description: "There is no data available for this report.",
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
  
  // Admin Report Generators
  const generateAllUsersReport = async () => {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const users = usersSnapshot.docs.map(d => d.data() as User);
    const data = users.map(user => {
      return {
        ID: user.id,
        Name: user.name,
        Email: user.email,
        Mobile: user.mobile,
        Roles: user.roles.join(', '),
        MemberSince: toDate(user.memberSince).toLocaleDateString(),
        InstallerTier: user.installerProfile?.tier || 'N/A',
        ReputationPoints: user.installerProfile?.points || 0,
        Rating: user.installerProfile?.rating || 0,
        Reviews: user.installerProfile?.reviews || 0,
        IsVerified: user.installerProfile?.verified ? 'Yes' : 'No',
      };
    });
    return { data, filename: `all-users-${new Date().toISOString().split('T')[0]}.csv` };
  };

  const generateAllJobsReport = async () => {
    const jobsSnapshot = await getDocs(collection(db, "jobs"));
    const jobs = jobsSnapshot.docs.map(d => d.data() as Job);
    const data = jobs.map(job => {
      const jobGiver = (job.jobGiver as DocumentReference)?.id;
      const awardedInstaller = (job.awardedInstaller as DocumentReference)?.id;
      return {
        ID: job.id,
        Title: job.title,
        Status: job.status,
        JobGiverID: jobGiver,
        AwardedInstallerID: awardedInstaller || 'N/A',
        MinBudget: job.budget.min,
        MaxBudget: job.budget.max,
        PostedDate: toDate(job.postedAt).toLocaleDateString(),
        Deadline: toDate(job.deadline).toLocaleDateString(),
        StartDate: job.jobStartDate ? toDate(job.jobStartDate).toLocaleDateString() : 'N/A',
      };
    });
    return { data, filename: `all-jobs-${new Date().toISOString().split('T')[0]}.csv` };
  };

  // Installer Report Generators
  const generateEarningsReport = async () => {
    if (!user) return { data: [], filename: '' };
    const q = query(collection(db, "jobs"), where('status', '==', "Completed"), where('awardedInstaller', '==', user.id));
    const querySnapshot = await getDocs(q);
    const myCompletedJobs = querySnapshot.docs.map(d => d.data() as Job);
    
    const data = myCompletedJobs.map(job => {
      const winningBid = job.bids.find(b => ((b.installer as DocumentReference)?.id) === user.id);
      return {
        JobID: job.id,
        JobTitle: job.title,
        CompletionDate: toDate(job.deadline).toLocaleDateString(),
        YourBidAmount: winningBid?.amount || 'Direct Award',
      };
    });

    return { data, filename: `earnings-report-${user.id}-${new Date().toISOString().split('T')[0]}.csv` };
  };

  // Job Giver Report Generators
  const generateMyJobsReport = async () => {
    if (!user) return { data: [], filename: '' };
    const q = query(collection(db, "jobs"), where('jobGiver', '==', user.id));
    const querySnapshot = await getDocs(q);
    const myJobs = querySnapshot.docs.map(d => d.data() as Job);

    const data = myJobs.map(job => {
      return {
        JobID: job.id,
        JobTitle: job.title,
        Status: job.status,
        BidsReceived: job.bids.length,
        AwardedInstallerID: (job.awardedInstaller as DocumentReference)?.id || 'N/A',
        PostedDate: toDate(job.postedAt).toLocaleDateString(),
      };
    });
    return { data, filename: `my-jobs-report-${user.id}-${new Date().toISOString().split('T')[0]}.csv` };
  };

  const AdminReports = () => (
    <div className="space-y-4">
      <ReportCard title="All Users Report" description="Export a complete list of all registered users and their profile data." icon={Users} onExport={() => handleExport(generateAllUsersReport)} loading={loading} />
      <ReportCard title="All Jobs Report" description="Export a comprehensive list of all jobs posted on the platform, including their status and key details." icon={Briefcase} onExport={() => handleExport(generateAllJobsReport)} loading={loading} />
      <ReportCard title="Financial Report" description="Export a summary of financial transactions, including job values and commissions." icon={IndianRupee} onExport={async () => { /* Complex logic placeholder */ toast({title: "Coming Soon!"}); return {data: [], filename: ''}; }} loading={loading} />
    </div>
  );
  
  const InstallerReports = () => (
    <div className="space-y-4">
        <ReportCard title="Earnings Report" description="Export a detailed history of your earnings from completed jobs." icon={IndianRupee} onExport={() => handleExport(generateEarningsReport)} loading={loading} />
        <ReportCard title="Bids History Report" description="Download a full report of all the bids you have placed and their outcomes." icon={FileText} onExport={async () => { toast({title: "Coming Soon!"}); return {data: [], filename: ''}; }} loading={loading} />
    </div>
  );

  const JobGiverReports = () => (
    <div className="space-y-4">
        <ReportCard title="My Jobs Report" description="Export a list of all jobs you have posted, including their status and number of bids." icon={Briefcase} onExport={() => handleExport(generateMyJobsReport)} loading={loading} />
        <ReportCard title="Spending Report" description="Download a summary of your spending on successfully awarded and completed jobs." icon={IndianRupee} onExport={async () => { toast({title: "Coming Soon!"}); return {data: [], filename: ''}; }} loading={loading} />
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

    