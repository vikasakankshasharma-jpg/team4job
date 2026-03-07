'use server';

import { paymentService } from '@/domains/payments/payment.service';
import { CreatePaymentOrderInput } from '@/domains/payments/payment.types';
import { logger } from '@/lib/system-logger';

/**
 * Server Action to create a payment order
 * This replaces the /api/escrow/initiate-payment API route
 */
export async function createPaymentOrderAction(
    jobId: string,
    userId: string,
    amount: number,
    travelTip?: number
): Promise<{ success: boolean; data?: { orderToken: string; orderId: string }; error?: string }> {
    try {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[Action] createPaymentOrderAction called by ${userId} for job ${jobId}`);
        }

        const input: CreatePaymentOrderInput = {
            jobId,
            userId,
            amount,
            travelTip
        };

        const result = await paymentService.createPaymentOrder(input);

        return { success: true, data: result };
    } catch (error: any) {
        await logger.error(error, { action: 'createPaymentOrderAction', jobId, userId });
        return {
            success: false,
            error: error.message || 'Failed to initiate payment',
        };
    }
}

/**
 * Server Action to create an Add Funds order
 */
export async function createAddFundsOrderAction(
    jobId: string,
    userId: string,
    amount: number,
    description: string,
    taskId?: string
): Promise<{ success: boolean; data?: { orderToken: string; orderId: string }; error?: string }> {
    try {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[Action] createAddFundsOrderAction called by ${userId} for job ${jobId}`);
        }

        const input: CreatePaymentOrderInput = {
            jobId,
            userId,
            amount,
            description,
            taskId,
            transactionType: 'AddOn'
        };

        const result = await paymentService.createPaymentOrder(input);

        return { success: true, data: result };
    } catch (error: any) {
        await logger.error(error, { action: 'createAddFundsOrderAction', jobId, userId });
        return {
            success: false,
            error: error.message || 'Failed to initiate add-funds payment',
        };
    }
}
