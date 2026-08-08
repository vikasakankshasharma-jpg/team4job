import { getAdminAuth, getAdminDb } from "@/infrastructure/firebase/admin";
import { getSystemLinksAction } from "@/app/actions/system-ops.actions";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SystemOpsClient } from "./system-ops-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SystemOpsPage() {
    // Verify session and role
    let isAdmin = false;
    try {
        const sessionCookie = (await cookies()).get('session')?.value;
        if (sessionCookie) {
            const decodedClaims = await getAdminAuth().verifySessionCookie(sessionCookie);
            const uid = decodedClaims.uid;
            const db = getAdminDb();
            const userDoc = await db.collection('users').doc(uid).get();
            const role = userDoc.data()?.role || '';
            isAdmin = role === 'Admin';
        }
    } catch {
        // Auth failed, redirect below
    }

    if (!isAdmin) {
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
