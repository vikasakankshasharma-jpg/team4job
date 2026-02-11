"use client";

import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import React from "react";
import { Role } from "@/lib/types";
import dynamic from "next/dynamic";

const AdminDashboardView = dynamic(() => import("@/components/dashboard/admin-dashboard-view").then(mod => mod.AdminDashboardView), {
  loading: () => <div className="h-96 w-full animate-pulse bg-muted/20 rounded-lg" />,
  ssr: false
});
const SupportTeamDashboard = dynamic(() => import("@/components/dashboard/support-dashboard").then(mod => mod.SupportTeamDashboard), {
  loading: () => <div className="h-96 w-full animate-pulse bg-muted/20 rounded-lg" />,
  ssr: false
});
const InstallerDashboard = dynamic(() => import("@/components/dashboard/installer-dashboard").then(mod => mod.InstallerDashboard), {
  loading: () => <div className="h-96 w-full animate-pulse bg-muted/20 rounded-lg" />,
  ssr: false
});
const JobGiverDashboard = dynamic(() => import("@/components/dashboard/job-giver-dashboard").then(mod => mod.JobGiverDashboard), {
  loading: () => <div className="h-96 w-full animate-pulse bg-muted/20 rounded-lg" />,
  ssr: false
});

import { JobGiverStats, InstallerStats } from "@/domains/jobs/job.types";
import { Transaction } from "@/lib/types";

interface DashboardData {
  jobGiverStats?: JobGiverStats;
  installerStats?: InstallerStats;
  transactions: Transaction[];
  quickMetrics?: any; // Strictly type this if sharing types, for now any matching the Metrics component
}

export default function DashboardClient({ initialData }: { initialData?: DashboardData }) {
  const { user, role, loading } = useUser();

  if (loading || !user) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Use initialData if provided, otherwise the sub-dashboards will handle their own state 
  // (though ideally we move everything to props eventually).

  const renderDashboard = (userRole: Role) => {
    switch (userRole) {
      case "Admin":
        return <AdminDashboardView />;
      case "Support Team":
        return <SupportTeamDashboard />;
      case "Installer":
        return (
          <InstallerDashboard
            stats={initialData?.installerStats || { openJobs: 0, myBids: 0, jobsWon: 0, projectedEarnings: 0, totalEarnings: 0, activeJobs: 0, completedJobs: 0 }}
            transactions={initialData?.transactions || []}
            loading={!initialData}
          />
        );
      case "Job Giver":
        return (
          <JobGiverDashboard
            stats={initialData?.jobGiverStats || { activeJobs: 0, completedJobs: 0, cancelledJobs: 0, totalBids: 0, openDisputes: 0 }}
            transactions={initialData?.transactions || []}
            loading={!initialData}
            quickMetrics={initialData?.quickMetrics}
          />
        );
      default:
        return (
          <JobGiverDashboard
            stats={initialData?.jobGiverStats || { activeJobs: 0, completedJobs: 0, cancelledJobs: 0, totalBids: 0, openDisputes: 0 }}
            transactions={initialData?.transactions || []}
            loading={!initialData}
            quickMetrics={initialData?.quickMetrics}
          />
        );
    }
  };

  return (
    <>
      {renderDashboard(role as Role)}
    </>
  );
}
