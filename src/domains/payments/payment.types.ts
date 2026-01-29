// domains/payments/payment.types.ts

import { Timestamp } from 'firebase/firestore';

export type PaymentStatus =
    | 'initiated'
    | 'funded'
    | 'failed'
    | 'released'
    | 'refunded'
    | 'disputed';

export interface Transaction {
    id: string;
    jobId: string;
    jobTitle: string;
    payerId: string; // Job Giver
    payeeId: string; // Installer
    amount: number;
    travelTip?: number;
    commission: number; // Platform fee from installer
    jobGiverFee: number; // Fee charged to job giver
    totalPaidByGiver: number; // amount + jobGiverFee + travelTip
    payoutToInstaller: number; // amount - commission + travelTip
    status: PaymentStatus;
    paymentGatewayOrderId?: string;
    paymentGatewaySessionId?: string;
    payoutTransferId?: string;
    refundTransferId?: string;
    transactionType?: 'JOB' | 'SUBSCRIPTION' | 'AddOn';
    planId?: string;
    createdAt: Date | Timestamp;
    fundedAt?: Date | Timestamp;
    failedAt?: Date | Timestamp;
    releasedAt?: Date | Timestamp;
    refundedAt?: Date | Timestamp;
    relatedTaskId?: string;
    description?: string;
}

export interface CreatePaymentOrderInput {
    jobId: string;
    amount: number;
    travelTip?: number;
    userId: string;
    transactionType?: 'JOB' | 'SUBSCRIPTION' | 'AddOn';
    description?: string;
    taskId?: string;
}

export interface PaymentVerification {
    orderId: string;
    status: 'success' | 'failed';
}
