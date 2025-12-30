import { collection, addDoc, Timestamp } from "firebase/firestore";

export type ReportType = "Scam" | "Inappropriate Language" | "Off-platform request" | "Other";

export interface CreateReportParams {
    jobId: string;
    jobTitle: string;
    reporterId: string;
    reporterRole: "Job Giver" | "Installer";
    reportedId: string;
    reason: ReportType;
    details?: string;
}

/**
 * Log a safety report to Firestore.
 */
export async function createReport(db: any, params: CreateReportParams) {
    if (!db) throw new Error("Firestore not initialized");

    const reportsRef = collection(db, "reports");
    const reportData = {
        ...params,
        status: "Pending", // Reports start as pending for Admin review
        createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(reportsRef, reportData);
    return docRef.id;
}
