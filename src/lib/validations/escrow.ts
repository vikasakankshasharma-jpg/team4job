
import { z } from 'zod';

export const releasePaymentSchema = z.object({
    jobId: z.string().min(1, 'Job ID is required'),
});

export const addFundsSchema = z.object({
    jobId: z.string().min(1, 'Job ID is required'),
    amount: z.number().min(1, 'Amount must be greater than 0'),
    description: z.string().optional(),
    userId: z.string().min(1, 'User ID is required'),
    taskId: z.string().optional(),
});

export const initiatePaymentSchema = z.object({
    jobId: z.string().min(1, 'Job ID is required'),
    planId: z.string().optional(),
    taskId: z.string().optional(),
});

export const raiseDisputeSchema = z.object({
    jobId: z.string().min(1, 'Job ID is required'),
    reason: z.string().min(5, 'Reason must be at least 5 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
});

export type ReleasePaymentInput = z.infer<typeof releasePaymentSchema>;
export type AddFundsInput = z.infer<typeof addFundsSchema>;
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type RaiseDisputeInput = z.infer<typeof raiseDisputeSchema>;
