import { getAdminAuth } from "@/infrastructure/firebase/admin";
import { getSystemLinksAction } from "@/app/actions/system-ops.actions";
import { redirect } from "next/navigation";
import { SystemOpsClient } from "./system-ops-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SystemOpsPage() {
    const auth = await getAdminAuth();
    
    // Strict RBAC: Only Super Admins can view this
    if (!auth || !auth.uid || auth.role !== "Admin") {
        redirect("/dashboard");
    }

    const { success, data, error } = await getSystemLinksAction();

    if (!success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive">
                <p>Failed to load system configuration.</p>
                <p className="text-sm opacity-80">{error}</p>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">System Operations</h2>
            </div>
            <p className="text-muted-foreground mb-8">
                Manage external infrastructure and services. Do not share these links with unverified personnel.
            </p>
            
            <SystemOpsClient initialLinks={data || []} />
        </div>
    );
}
