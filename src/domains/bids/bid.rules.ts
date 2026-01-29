// domains/bids/bid.rules.ts

import { Role } from '@/lib/types';
import { JobStatus } from '../jobs/job.types';
import { CreateBidInput } from './bid.types';

export class BidRules {
    /**
     * Check if user can place a bid
     */
    canPlaceBid(userRole: Role, jobStatus: JobStatus, jobGiverId: string, userId: string): boolean {
        // Must be an installer
        if (userRole !== 'Installer') {
            return false;
        }

        // Job must be open for bidding
        if (jobStatus !== 'open') {
            return false;
        }

        // Cannot bid on own job
        if (jobGiverId === userId) {
            return false;
        }

        return true;
    }

    /**
     * Validate bid data
     */
    validateBidData(data: CreateBidInput, jobBudget?: { min: number; max: number }): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!data.amount || data.amount <= 0) {
            errors.push('Bid amount must be positive');
        }

        if (data.amount < 100) {
            errors.push('Minimum bid amount is ₹100');
        }

        // Optionally check if bid is within reasonable range of job budget
        if (jobBudget && data.amount > jobBudget.max * 2) {
            errors.push('Bid amount significantly exceeds job budget');
        }

        if (data.coverLetter && data.coverLetter.length > 1000) {
            errors.push('Cover letter must be less than 1000 characters');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Check if user can withdraw bid
     */
    canWithdrawBid(userId: string, bidInstallerId: string, jobStatus: JobStatus): boolean {
        // Can only withdraw own bid
        if (userId !== bidInstallerId) {
            return false;
        }

        // Can only withdraw if job is still open
        if (jobStatus !== 'open') {
            return false;
        }

        return true;
    }
}

export const bidRules = new BidRules();
