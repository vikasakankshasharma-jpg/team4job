"use server";

import { getAdminDb, getAdminAuth } from "@/infrastructure/firebase/admin";
import { revalidatePath } from "next/cache";

export type SystemLink = {
    id: string;
    title: string;
    url: string;
    iconName: string;
    description: string;
};

export async function getSystemLinksAction(): Promise<{ success: boolean; data?: SystemLink[]; error?: string }> {
    try {
        const { uid, role } = await getAdminAuth();

        if (!uid || role !== "Admin") {
            return { success: false, error: "Unauthorized access" };
        }

        const db = getAdminDb();
        const docRef = db.collection("system_config").doc("external_links");
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            // Provide default fallback links
            const defaultLinks: SystemLink[] = [
                { id: "firebase", title: "Firebase Console", url: "https://console.firebase.google.com/", iconName: "Database", description: "Database, Auth, and Storage" },
                { id: "cashfree", title: "Cashfree", url: "https://merchant.cashfree.com/", iconName: "IndianRupee", description: "Payment Gateway and Escrow" },
                { id: "sentry", title: "Sentry", url: "https://sentry.io/", iconName: "AlertOctagon", description: "Error Tracking and Bug Triage" },
                { id: "github", title: "GitHub", url: "https://github.com/", iconName: "Github", description: "Source Code and CI/CD" },
                { id: "vercel", title: "Vercel", url: "https://vercel.com/", iconName: "Triangle", description: "Analytics and Speed Insights" },
                { id: "whatsapp", title: "WhatsApp Manager", url: "https://business.facebook.com/wa/manage/home/", iconName: "MessageCircle", description: "OTPs and Communications" },
                { id: "gcp", title: "Google Cloud", url: "https://console.cloud.google.com/", iconName: "Cloud", description: "Maps API and Genkit" },
            ];
            
            // Optionally save these defaults to the DB if it doesn't exist
            await docRef.set({ links: defaultLinks });
            return { success: true, data: defaultLinks };
        }

        const data = docSnap.data();
        return { success: true, data: data?.links as SystemLink[] || [] };
    } catch (error: any) {
        console.error("[SystemOps] Error fetching links:", error);
        return { success: false, error: "Failed to fetch system links" };
    }
}

export async function updateSystemLinksAction(links: SystemLink[]): Promise<{ success: boolean; error?: string }> {
    try {
        const { uid, role } = await getAdminAuth();

        if (!uid || role !== "Admin") {
            return { success: false, error: "Unauthorized access" };
        }

        const db = getAdminDb();
        const docRef = db.collection("system_config").doc("external_links");
        await docRef.set({ links });

        revalidatePath("/dashboard/system-ops");
        
        return { success: true };
    } catch (error: any) {
        console.error("[SystemOps] Error updating links:", error);
        return { success: false, error: "Failed to update system links" };
    }
}
