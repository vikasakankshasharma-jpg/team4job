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
const ProfessionalDashboard = dynamic(() => import("@/domains/jobs").then(mod => mod.ProfessionalDashboard), {
  loading: () => <div className="h-96 w-full animate-pulse bg-muted/20 rounded-lg" />,
  ssr: false
});
const ClientDashboard = dynamic(() => import("@/domains/jobs").then(mod => mod.ClientDashboard), {
  loading: () => <div className="h-96 w-full animate-pulse bg-muted/20 rounded-lg" />,
  ssr: false
});

import { ClientStats, ProfessionalStats } from "@/domains/jobs/job.types";
import { Transaction } from "@/lib/types";

interface DashboardData {
  ClientStats?: ClientStats;
  ProfessionalStats?: ProfessionalStats;
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
      case "Professional":
        return (
          <ProfessionalDashboard
            stats={initialData?.ProfessionalStats || { openJobs: 0, myBids: 0, jobsWon: 0, projectedEarnings: 0, totalEarnings: 0, activeJobs: 0, completedJobs: 0 }}
            transactions={initialData?.transactions || []}
            loading={!initialData}
          />
        );
      case "Client":
        return (
          <ClientDashboard
            stats={initialData?.ClientStats || { activeJobs: 0, completedJobs: 0, cancelledJobs: 0, totalBids: 0, openDisputes: 0 }}
            transactions={initialData?.transactions || []}
            loading={!initialData}
            quickMetrics={initialData?.quickMetrics}
          />
        );
      default:
        return (
          <ClientDashboard
            stats={initialData?.ClientStats || { activeJobs: 0, completedJobs: 0, cancelledJobs: 0, totalBids: 0, openDisputes: 0 }}
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



