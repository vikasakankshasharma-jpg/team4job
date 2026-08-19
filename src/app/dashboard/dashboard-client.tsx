"use client";

import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Role } from "@/lib/types";
import dynamic from "next/dynamic";
import { getDashboardStatsAction } from "@/app/actions/dashboard.actions";
import { useHelpStore } from "@/store/help-store";

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

import { StitchCustomerDashboardClient } from "@/components/dashboard/stitch-dashboard-client";
import { StitchAdminAnalytics } from "@/components/dashboard/stitch-admin-analytics";
import { StitchProfessionalJobBoard } from "@/components/dashboard/stitch-job-board";

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
  const fetchingRef = useRef(false);

    // Client-side fallback: fetch stats when server-side data is unavailable
  
  const { startTour, completedTourIds } = useHelpStore();
  
  useEffect(() => {
    if (user && !fetching) {
      const tourId = role === 'Professional' ? 'pro-full-cycle' : 'client-full-cycle';
      if (!completedTourIds.includes(tourId)) {
        const timer = setTimeout(() => {
          startTour(tourId);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, role, fetching, completedTourIds, startTour]);

  useEffect(() => {
    // Admin and Support roles handle their own data fetching
    if (data || !user || fetchingRef.current || fetchError || role === "Admin" || role === "Support Team") return;

    let cancelled = false;
    fetchingRef.current = true;
    setFetching(true);

    const fetchTimeout = window.setTimeout(() => {
      if (!cancelled) {
        setFetchError(true);
        setFetching(false);
        fetchingRef.current = false;
      }
    }, 30000); // Increased from 8s to 30s for dev-server cold boots

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
        if (!cancelled) {
          setFetching(false);
          fetchingRef.current = false;
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(fetchTimeout);
      fetchingRef.current = false;
    };
  }, [data, user, fetchError, role]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Auth resolved but no user — session may have expired or Firestore SDK error blocked profile load.
  // Redirect to login; the hard-fallback in use-user will handle it if the router doesn't.
  if (!user) {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
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
            <StitchCustomerDashboardClient />
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



