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
    payerId: string; // Client
    payeeId: string; // Professional
    amount: number;
    travelTip?: number;
    commission: number; // Platform fee from Professional
    clientFee: number; // Fee charged to client
    totalPaidByClient: number; // amount + clientFee + travelTip
    payoutToProfessional: number; // amount - commission + travelTip
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

