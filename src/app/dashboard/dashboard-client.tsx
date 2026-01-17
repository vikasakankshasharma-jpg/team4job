"use client";

import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import React from "react";
import { Role } from "@/lib/types";
import { AdminDashboardView } from "@/components/dashboard/admin-dashboard-view";
import { SupportTeamDashboard } from "@/components/dashboard/support-dashboard";
import { InstallerDashboard } from "@/components/dashboard/installer-dashboard";
import { JobGiverDashboard } from "@/components/dashboard/job-giver-dashboard";

function renderDashboard(role: Role) {
  switch (role) {
    case "Admin":
      return <AdminDashboardView />;
    case "Support Team":
      return <SupportTeamDashboard />;
    case "Installer":
      return <InstallerDashboard />;
    case "Job Giver":
      return <JobGiverDashboard />;
    default:
      return <JobGiverDashboard />; // Default fallback
  }
}

export default function DashboardClient() {
  const { user, role, loading } = useUser();

  if (loading || !user) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {renderDashboard(role as Role)}
    </>
  );
}
