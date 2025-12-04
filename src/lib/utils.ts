
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Job, User } from "./types";
import { Timestamp } from "firebase/firestore";

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

export const toDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  // Fallback for string or number representations
  return new Date(timestamp);
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

const getRefId = (ref: any): string | null => {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return ref.id || null;
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

    