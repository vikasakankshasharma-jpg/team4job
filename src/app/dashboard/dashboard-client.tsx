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

const EMPTY_CLIENT_STATS: ClientStats = {
  activeJobs: 0,
  completedJobs: 0,
  cancelledJobs: 0,
  totalBids: 0,
  openDisputes: 0,
};

const EMPTY_PROFESSIONAL_STATS: ProfessionalStats = {
  openJobs: 0,
  myBids: 0,
  jobsWon: 0,
  projectedEarnings: 0,
  totalEarnings: 0,
  activeJobs: 0,
  completedJobs: 0,
};

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
    const fetchTimeout = window.setTimeout(() => {
      if (!cancelled) {
        setFetchError(true);
        setFetching(false);
      }
    }, 8000);

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
        window.clearTimeout(fetchTimeout);
        if (!cancelled) setFetching(false);
      });
    
    return () => {
      cancelled = true;
      window.clearTimeout(fetchTimeout);
    };
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
    const hasFailedStatsFetch = needsStats && !data && fetchError;

    if (!data && fetching && needsStats) {
      return (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
          <div className="space-y-6">
            {hasFailedStatsFetch && (
              <div className="rounded-lg border border-warning/50 bg-warning/5 px-4 py-3 text-sm text-muted-foreground">
                We couldn&apos;t load your latest dashboard stats, so you&apos;re seeing a safe empty state for now.
              </div>
            )}
            <ProfessionalDashboard
              stats={data?.ProfessionalStats || EMPTY_PROFESSIONAL_STATS}
              transactions={data?.transactions || []}
              loading={false}
            />
          </div>
        );
      case "Client":
        return (
          <div className="space-y-6">
            {hasFailedStatsFetch && (
              <div className="rounded-lg border border-warning/50 bg-warning/5 px-4 py-3 text-sm text-muted-foreground">
                We couldn&apos;t load your latest dashboard stats, so you&apos;re seeing a safe empty state for now.
              </div>
            )}
            <ClientDashboard
              stats={data?.ClientStats || EMPTY_CLIENT_STATS}
              transactions={data?.transactions || []}
              loading={false}
              quickMetrics={data?.quickMetrics}
            />
          </div>
        );
      default:
        return (
          <ClientDashboard
            stats={data?.ClientStats || EMPTY_CLIENT_STATS}
            transactions={data?.transactions || []}
            loading={false}
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
