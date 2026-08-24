import { Timestamp } from 'firebase/firestore';
import { Address } from '@/lib/types';

/**
 * Dealer Profile
 * Represents a B2B business entity using the Dealer Workspace.
 */
export interface Dealer {
    id: string; // Typically matches the User ID for the dealer admin
    businessName: string;
    gstin?: string;
    pan?: string;
    address: Address;
    contactPhone: string;
    contactEmail: string;
    
    // Metrics & Telemetry
    metrics: {
        activeJobs: number;
        jobsPerMonth: number;
        repeatCustomerRate: number;
        matchToAwardConversion: number;
        avgTimeToAwardMs: number;
        installerRepeatRate: number;
        disputeRate: number;
        revenuePerMonth: number;
        gmvPerMonth: number;
    };
    
    createdAt: Date | Timestamp;
    updatedAt: Date | Timestamp;
}

/**
 * B2B Customer (Dealer's Customer)
 * This is separate from a Platform User. It lives in the Dealer's Private Memory.
 */
export interface DealerCustomer {
    id: string;
    dealerId: string;
    name: string; // Sharma Electronics
    phone: string;
    email?: string;
    
    // Link to platform user if they register later
    platformUserId?: string; 

    // Aggregate metrics for this customer
    totalJobs: number;
    totalRevenue: number;
    lastServiceDate?: Date | Timestamp;
    
    createdAt: Date | Timestamp;
    updatedAt: Date | Timestamp;
}

/**
 * Service Site / Location
 * Belongs to a Dealer and optionally a Customer.
 * Ties the "Customer/Site Memory" together.
 */
export interface ServiceSite {
    id: string;
    dealerId: string;
    customerId?: string; // Optional if standalone site
    
    name: string; // e.g., "Jaipur Main Branch"
    address: Address;
    fullAddress: string;
    
    // AI/Operational Memory
    history: {
        totalJobs: number;
        lastServiceDate?: Date | Timestamp;
        preferredInstallerId?: string; // e.g., Raj CCTV Services
        averageRating?: number;
        lastIssueSummary?: string; // e.g., "DVR replacement"
        nextRecommendedAction?: string; // AI generated
        nextDueDate?: Date | Timestamp; // For scheduled maintenance
        maintenanceIntervalDays?: number; // E.g., 180 for 6 months
    };
    
    createdAt: Date | Timestamp;
    updatedAt: Date | Timestamp;
}

/**
 * Dealer Private Feedback / Memory for an Installer
 * This lives in dealers/{dealerId}/operationalMemory/{installerId}
 */
export interface InstallerPrivateMemory {
    id: string; // installerId
    dealerId: string;
    
    jobsCompletedForDealer: number;
    averagePrivateRating: number;
    privateNotes: string; // e.g., "Always arrives 15 min early, excellent with commercial sites."
    
    lastJobId?: string;
    lastJobDate?: Date | Timestamp;
    
    updatedAt: Date | Timestamp;
}
