
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Job } from "./types";
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
        case 'Awarded':
        case 'In Progress':
            return 'info';
        case 'Completed':
            return 'secondary';
        case 'Cancelled':
            return 'destructive'
        default:
            return 'default';
    }
}

export const toDate = (timestamp: Date | Timestamp): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
};
