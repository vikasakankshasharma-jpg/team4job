// domains/jobs/job.rules.ts

import { JobStatus, JOB_STATE_TRANSITIONS, CreateJobInput } from './job.types';
import { Role } from '@/lib/types';
import { logger } from '@/infrastructure/logger';

/**
 * Job Business Rules
 * Validates job operations and state transitions
 */
export class JobRules {
    /**
     * Validate if status transition is allowed
     */
    canTransitionTo(currentStatus: JobStatus, newStatus: JobStatus): boolean {
        const allowedTransitions = JOB_STATE_TRANSITIONS[currentStatus];
        if (!allowedTransitions) return true; // Fail safe or handle legacy
        return allowedTransitions.includes(newStatus);
    }

    /**
     * Validate if user can create a job
     */
    canCreateJob(userRole: Role): boolean {
        return userRole === 'Job Giver' || userRole === 'Admin';
    }

    /**
     * Validate if user can accept a bid
     */
    canAcceptBid(jobStatus: JobStatus, userId: string, jobGiverId: string, userRole: Role): boolean {
        // Only job giver or admin can accept bids
        if (userRole !== 'Job Giver' && userRole !== 'Admin') {
            return false;
        }

        // Job must be in 'open' status
        if (jobStatus !== 'open') {
            logger.warn('Cannot accept bid - job not open', { jobStatus });
            return false;
        }

        // User must be the job giver (or admin)
        if (userRole !== 'Admin' && userId !== jobGiverId) {
            logger.warn('Cannot accept bid - not job owner', { userId, jobGiverId });
            return false;
        }

        return true;
    }

    /**
     * Validate if user can start work
     */
    canStartWork(jobStatus: JobStatus, userId: string, awardedInstallerId?: string): boolean {
        const allowed = ['funded', 'in_progress', 'Pending Funding', 'In Progress'];
        if (!allowed.includes(jobStatus)) {
            return false;
        }

        if (!awardedInstallerId || userId !== awardedInstallerId) {
            return false;
        }

        return true;
    }

    /**
     * Validate if user can mark job as complete
     */
    canMarkComplete(jobStatus: JobStatus, userId: string, jobGiverId: string): boolean {
        const allowed = ['work_submitted', 'Pending Confirmation'];
        if (!allowed.includes(jobStatus)) {
            return false;
        }

        if (userId !== jobGiverId) {
            return false;
        }

        return true;
    }

    /**
     * Validate job creation data
     */
    validateJobData(data: CreateJobInput): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Title validation
        if (!data.title || data.title.trim().length < 5) {
            errors.push('Title must be at least 5 characters');
        }
        if (data.title && data.title.length > 200) {
            errors.push('Title must be less than 200 characters');
        }

        // Description validation
        if (!data.description || data.description.trim().length < 20) {
            errors.push('Description must be at least 20 characters');
        }

        // Category validation
        if (!data.jobCategory || data.jobCategory.trim().length === 0) {
            errors.push('Job category is required');
        }

        // Location validation
        if (!data.location || data.location.trim().length === 0) {
            errors.push('Location is required');
        }

        // Address validation
        if (!data.address || !data.address.cityPincode) {
            errors.push('Valid address with pincode is required');
        }

        // Price estimate validation
        if (data.priceEstimate) {
            if (data.priceEstimate.min < 0) {
                errors.push('Minimum price cannot be negative');
            }
            if (data.priceEstimate.max < data.priceEstimate.min) {
                errors.push('Maximum price must be greater than minimum price');
            }
            if (data.priceEstimate.min < 100) {
                errors.push('Minimum budget must be at least ₹100');
            }
        }

        // Deadline validation
        if (!data.deadline) {
            errors.push('Deadline is required');
        } else {
            const deadlineDate = new Date(data.deadline);
            const now = new Date();
            if (deadlineDate <= now) {
                errors.push('Deadline must be in the future');
            }
        }

        // Travel tip validation
        if (data.travelTip && data.travelTip < 0) {
            errors.push('Travel tip cannot be negative');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Validate if milestones can be added
     */
    canAddMilestones(priceEstimate?: { min: number; max: number }): boolean {
        if (!priceEstimate) {
            return false;
        }

        // Milestones only for jobs with minimum budget
        const minBudgetForMilestones = 5000; // ₹5000
        return priceEstimate.min >= minBudgetForMilestones;
    }

    /**
     * Calculate remaining budget for milestones
     */
    calculateRemainingBudget(
        totalBudget: number,
        existingMilestones: { amount: number }[]
    ): number {
        const allocatedAmount = existingMilestones.reduce((sum, m) => sum + m.amount, 0);
        return totalBudget - allocatedAmount;
    }

    /**
     * Validate milestone amount
     */
    validateMilestoneAmount(amount: number, remainingBudget: number): { valid: boolean; error?: string } {
        if (amount <= 0) {
            return { valid: false, error: 'Milestone amount must be positive' };
        }

        if (amount > remainingBudget) {
            return { valid: false, error: `Amount exceeds remaining budget of ₹${remainingBudget}` };
        }

        return { valid: true };
    }
}

export const jobRules = new JobRules();
