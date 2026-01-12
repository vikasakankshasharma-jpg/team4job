
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Job, User } from "./types";
import { Timestamp, DocumentReference } from "firebase/firestore";
import { subMonths, format, parse } from "date-fns";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const getStatusVariant = (status: Job['status']): "default" | "secondary" | "success" | "warning" | "info" | "destructive" | "outline" | null | undefined => {
    switch (status) {
        case 'Open for Bidding':
            return 'success';
        case 'Bidding Closed':
            return 'warning';
        case 'Unbid':
            return 'outline';
        case 'Awarded':
            return 'info';
        case 'Pending Funding':
            return 'info';
        case 'In Progress':
            return 'default';
        case 'Completed':
            return 'secondary';
        case 'Cancelled':
            return 'destructive'
        default:
            return 'default';
    }
}

export const toDate = (timestamp: Date | Timestamp | { _seconds: number; _nanoseconds?: number } | string | number | null | undefined): Date => {
    if (!timestamp) return new Date();

    let date: Date;
    if (timestamp instanceof Timestamp) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else if (timestamp && typeof timestamp === 'object' && '_seconds' in timestamp) {
        // Handle plain object representation from server SDK or JSON
        date = new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000);
    } else {
        date = new Date(timestamp);
    }

    // Check if valid date
    if (isNaN(date.getTime())) {
        console.warn("Invalid date encountered in toDate:", timestamp);
        return new Date(); // Fallback to now
    }

    return date;
};


export function exportToCsv(filename: string, rows: object[]) {
    if (!rows || rows.length === 0) {
        return;
    }
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
        keys.join(separator) +
        '\n' +
        rows.map(row => {
            return keys.map(k => {
                let cell = (row as any)[k] === null || (row as any)[k] === undefined ? '' : (row as any)[k];
                cell = cell instanceof Date
                    ? cell.toLocaleString()
                    : cell.toString().replace(/"/g, '""');
                if (cell.search(/("|,|\n)/g) >= 0) {
                    cell = `"${cell}"`;
                }
                return cell;
            }).join(separator);
        }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

/**
 * Checks a message for restricted patterns like phone numbers, emails, and specific keywords.
 * @param message The message string to check.
 * @returns An object indicating if the message is valid and a reason if it's not.
 */
export function validateMessageContent(message: string): { isValid: boolean; reason?: string } {
    const restrictedPatterns = [
        { pattern: /\b\d{10}\b/g, reason: 'phone numbers' }, // 10-digit phone numbers
        { pattern: /\b\d{3,}[-\s]?\d{3,}[-\s]?\d{4,}\b/g, reason: 'phone numbers' }, // Formatted phone numbers
        { pattern: /[\w.-]+@[\w.-]+\.\w{2,}/g, reason: 'email addresses' }, // Emails
        { pattern: /\b(whatsapp|telegram|phone|contact|number|email|mail)\b/i, reason: 'contact information' },
        { pattern: /\b(direct|outside|personally|offline)\b/i, reason: 'off-platform communication' },
        { pattern: /\b(cash|gpay|paytm|bank transfer|advance)\b/i, reason: 'off-platform payments' },
        { pattern: /\b(admin|support|dodo|verification|system|staff)\b/i, reason: 'impersonation keywords' },
    ];

    for (const { pattern, reason } of restrictedPatterns) {
        if (pattern.test(message)) {
            return {
                isValid: false,
                reason: `Sharing ${reason} is not allowed. All communication and payments must be kept on the platform for your safety.`,
            };
        }
    }

    return { isValid: true };
}

export const getRefId = (ref: string | { id: string } | DocumentReference | null | undefined): string | null => {
    if (!ref) return null;
    if (typeof ref === 'string') return ref;
    if ('id' in ref) return ref.id;
    return null;
}

export const getMyBidStatus = (job: Job, user: User): { text: string; variant: "default" | "secondary" | "success" | "warning" | "info" | "destructive" | "outline" | null | undefined } => {
    const awardedId = getRefId(job.awardedInstaller);
    const won = awardedId === user.id;

    if (won) {
        if (job.status === 'Completed') return { text: 'Completed & Won', variant: 'success' };
        if (job.status === 'In Progress') return { text: 'In Progress', variant: 'info' };
        if (job.status === 'Awarded') return { text: 'Awarded to You', variant: 'success' };
        if (job.status === 'Pending Funding') return { text: 'Pending Funding', variant: 'info' };
    }

    if (job.status === 'Cancelled') return { text: 'Cancelled', variant: 'destructive' };
    if (job.status === 'Open for Bidding') return { text: 'Bidded', variant: 'default' };

    if ((job.status === 'Bidding Closed' || job.status === 'Awarded' || job.status === 'In Progress' || job.status === 'Completed') && !won) {
        return { text: 'Not Selected', variant: 'destructive' };
    }

    return { text: job.status, variant: getStatusVariant(job.status) };
}

export interface RankedInstaller extends User {
    monthlyPoints: number;
}

/**
 * Calculates monthly performance points for a list of installers and ranks them.
 * 
 * @param installers List of users (installers)
 * @param referenceDate The date relative to which "last month" is calculated. Defaults to now.
 * @returns Sorted list of installers with 'monthlyPoints' property.
 */
export function calculateMonthlyPerformance(installers: User[], referenceDate: Date = new Date()): RankedInstaller[] {
    const lastMonthDate = subMonths(referenceDate, 1);
    const lastMonthName = format(lastMonthDate, 'MMMM yyyy');

    const twoMonthsAgoDate = subMonths(referenceDate, 2);
    // We don't rely solely on exact name match for the baseline, but use it as a primary lookup

    return installers
        .filter(i => i.roles.includes('Installer') && i.installerProfile)
        .map(installer => {
            const history = installer.installerProfile?.reputationHistory || [];

            // 1. Find the cumulative points at the end of Last Month
            let lastMonthPoints = 0;
            const lastMonthEntry = history.find(h => h.month === lastMonthName);

            if (lastMonthEntry) {
                lastMonthPoints = lastMonthEntry.points;
            } else {
                // If no entry for last month, we need to find the latest entry BEFORE or during last month
                // Ideally, history is sorted. Let's assume chronological order.
                // We reverse to find the latest applicable entry.
                const relevantEntry = [...history].reverse().find(h => {
                    const hDate = parse(h.month, 'MMMM yyyy', new Date());
                    return hDate <= lastMonthDate; // Entries from last month or before
                });
                lastMonthPoints = relevantEntry ? relevantEntry.points : 0;
            }

            // 2. Find the cumulative points at the end of Two Months Ago (Baseline)
            // This represents the points the user started the month with.
            let baselinePoints = 0;
            const twoMonthsAgoEntry = history.find(h => {
                const hDate = parse(h.month, 'MMMM yyyy', new Date());
                // We want the entry that represents the state at the END of the month prior to the calculation month.
                // So if calculation month is March, we want points at end of February.
                // Here "lastMonth" is the target month (e.g., February). "twoMonthsAgo" is January.
                // So baseline is end of January.
                return hDate.getMonth() === twoMonthsAgoDate.getMonth() && hDate.getFullYear() === twoMonthsAgoDate.getFullYear();
            });

            if (twoMonthsAgoEntry) {
                baselinePoints = twoMonthsAgoEntry.points;
            } else {
                // Fallback: Find latest entry BEFORE the target month started
                const relevantEntry = [...history].reverse().find(h => {
                    const hDate = parse(h.month, 'MMMM yyyy', new Date());
                    return hDate <= twoMonthsAgoDate;
                });
                baselinePoints = relevantEntry ? relevantEntry.points : 0;
            }

            // If user has no history before the target month, baseline is 0.
            // If user has no history at all, both are 0.

            // Calculate delta
            const monthlyPoints = Math.max(0, lastMonthPoints - baselinePoints);

            return { ...installer, monthlyPoints };
        })
        .sort((a, b) => {
            // 1. Sort by monthly points (descending)
            if (b.monthlyPoints !== a.monthlyPoints) {
                return b.monthlyPoints - a.monthlyPoints;
            }
            // 2. Sort by rating (descending)
            if ((b.installerProfile?.rating || 0) !== (a.installerProfile?.rating || 0)) {
                return (b.installerProfile?.rating || 0) - (a.installerProfile?.rating || 0);
            }
            // 3. Sort by memberSince (oldest first, so ascending)
            return toDate(a.memberSince).getTime() - toDate(b.memberSince).getTime();
        });
}
