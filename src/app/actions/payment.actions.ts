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
        const { requireAuth } = await import('@/lib/auth-server');
        await requireAuth(userId);

        const input: CreatePaymentOrderInput = {
            jobId,
            userId,
            amount,
            travelTip
        };

        const result = await paymentService.createPaymentOrder(input);

        return { success: true, data: result };
    } catch (error: any) {
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
        const { requireAuth } = await import('@/lib/auth-server');
        await requireAuth(userId);

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
        return {
            success: false,
            error: error.message || 'Failed to initiate add-funds payment',
        };
    }
}

/**
 * Server Action to onboard a Professional as a Cashfree Vendor (Easy Split)
 */
export async function onboardCashfreeVendorAction(
    userId: string,
    bankDetails: { account_number: string; ifsc: string; account_holder: string }
): Promise<{ success: boolean; error?: string }> {
    try {
        const { requireAuth } = await import('@/lib/auth-server');
        await requireAuth(userId);

        const { userRepository } = await import('@/domains/users/user.repository');
        const user = await userRepository.fetchById(userId);
        if (!user) throw new Error('User not found');

        const { cashfreeClient } = await import('@/domains/payments/cashfree.client');

        // Create vendor on Cashfree
        await cashfreeClient.createVendor({
            vendorId: userId,
            name: user.name,
            email: user.email,
            phone: user.mobile,
            bankDetails,
        });

        // Save partial details to user profile (Masked)
        const maskedAccount = 'XXXX' + bankDetails.account_number.slice(-4);
        await userRepository.update(userId, {
            payouts: {
                beneficiaryId: userId,
                accountHolderName: bankDetails.account_holder,
                accountNumberMasked: maskedAccount,
                ifsc: bankDetails.ifsc,
            }
        });

        return { success: true };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Failed to connect bank account',
        };
    }
}
