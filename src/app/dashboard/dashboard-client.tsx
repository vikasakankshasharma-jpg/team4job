"use client";

import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Role } from "@/lib/types";
import dynamic from "next/dynamic";
import { getDashboardStatsAction } from "@/app/actions/dashboard.actions";

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
  quickMetrics?: any;
}

export default function DashboardClient({ initialData }: { initialData?: DashboardData }) {
  const { user, role, loading } = useUser();
  const [data, setData] = useState<DashboardData | undefined>(initialData);
  const [fetchError, setFetchError] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Client-side fallback: fetch stats when server-side data is unavailable
  useEffect(() => {
    // Admin and Support roles handle their own data fetching
    if (data || !user || fetching || role === "Admin" || role === "Support Team") return;
    
    let cancelled = false;
    setFetching(true);
    
    getDashboardStatsAction(user.id)
      .then((result) => {
        if (cancelled) return;
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setFetchError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFetchError(true);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    
    return () => { cancelled = true; };
  }, [data, user, fetching, role]);

  if (loading || !user) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderDashboard = (userRole: Role) => {
    // Show loading while fetching client-side (only for roles that need this data)
    const needsStats = userRole !== "Admin" && userRole !== "Support Team";
    if (!data && fetching && needsStats) {
      return (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    
    // Show error only if fetch has completely failed
    if (!data && fetchError) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="p-4 rounded-full bg-destructive/10 text-destructive">
                    <Loader2 className="h-8 w-8" />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-semibold">Dashboard Data Unavailable</h3>
                    <p className="text-muted-foreground text-sm max-w-sm">We're having trouble loading your dashboard stats right now. Please try refreshing the page.</p>
                </div>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Refresh Dashboard
                </button>
            </div>
        );
    }
    
    switch (userRole) {
      case "Admin":
        return <AdminDashboardView />;
      case "Support Team":
        return <SupportTeamDashboard />;
      case "Professional":
        return (
          <ProfessionalDashboard
            stats={data?.ProfessionalStats || { openJobs: 0, myBids: 0, jobsWon: 0, projectedEarnings: 0, totalEarnings: 0, activeJobs: 0, completedJobs: 0 }}
            transactions={data?.transactions || []}
            loading={!data}
          />
        );
      case "Client":
        return (
          <ClientDashboard
            stats={data?.ClientStats || { activeJobs: 0, completedJobs: 0, cancelledJobs: 0, totalBids: 0, openDisputes: 0 }}
            transactions={data?.transactions || []}
            loading={!data}
            quickMetrics={data?.quickMetrics}
          />
        );
      default:
        return (
          <ClientDashboard
            stats={data?.ClientStats || { activeJobs: 0, completedJobs: 0, cancelledJobs: 0, totalBids: 0, openDisputes: 0 }}
            transactions={data?.transactions || []}
            loading={!data}
            quickMetrics={data?.quickMetrics}
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





