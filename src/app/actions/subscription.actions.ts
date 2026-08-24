'use server';
import { SubscriptionPlan } from "@/lib/types";
import { CreatePaymentOrderInput } from "@/domains/payments/payment.types";
import { paymentService } from "@/domains/payments/payment.service";

export async function createSubscriptionOrderAction(
    userId: string,
    planId: string,
    planName: string,
    amount: number
): Promise<{ success: boolean; data?: { orderToken: string; orderId: string }; error?: string }> {
    try {
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
        const input: CreatePaymentOrderInput = {
            jobId: `SUB-${userId}-${planId}-${Date.now()}`,
            userId,
            amount,
            description: `Subscription: ${planName}`,
            transactionType: 'SUBSCRIPTION'
        };

        const result = await paymentService.createPaymentOrder(input);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

