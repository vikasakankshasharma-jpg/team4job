"use client";

import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import React from "react";
import { Role } from "@/lib/types";
import { AdminDashboardView } from "@/components/dashboard/admin-dashboard-view";
import { SupportTeamDashboard } from "@/components/dashboard/support-dashboard";
import { InstallerDashboard } from "@/components/dashboard/installer-dashboard";
import { JobGiverDashboard } from "@/components/dashboard/job-giver-dashboard";

import { JobGiverStats, InstallerStats } from "@/domains/jobs/job.types";
import { Transaction } from "@/lib/types";

interface DashboardData {
  jobGiverStats?: JobGiverStats;
  installerStats?: InstallerStats;
  transactions: Transaction[];
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
            stats={initialData?.installerStats || { openJobs: 0, myBids: 0, jobsWon: 0, projectedEarnings: 0, totalEarnings: 0 }}
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
          />
        );
      default:
        return (
          <JobGiverDashboard
            stats={initialData?.jobGiverStats || { activeJobs: 0, completedJobs: 0, cancelledJobs: 0, totalBids: 0, openDisputes: 0 }}
            transactions={initialData?.transactions || []}
            loading={!initialData}
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
