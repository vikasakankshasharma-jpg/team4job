// domains/payments/payment.service.ts

import { cashfreeClient } from './cashfree.client';
import { CreatePaymentOrderInput, Transaction, PaymentStatus } from './payment.types';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { COLLECTIONS } from '@/infrastructure/firebase/firestore';
import { logger } from '@/infrastructure/logger';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Payment Service - Business logic for payments
 */
export class PaymentService {
    /**
     * Create a payment order for job funding
     */
    async createPaymentOrder(data: CreatePaymentOrderInput): Promise<{ orderToken: string; orderId: string }> {
        try {
            // Generate unique order ID
            const orderId = `order_${data.jobId}_${Date.now()}`;

            // Calculate fees
            const commission = data.amount * 0.05; // 5% platform commission
            const jobGiverFee = data.amount * 0.02; // 2% job giver fee
            const totalPaidByGiver = data.amount + jobGiverFee + (data.travelTip || 0);

            // Create transaction record
            const transaction: Partial<Transaction> = {
                jobId: data.jobId,
                payerId: data.userId,
                amount: data.amount,
                travelTip: data.travelTip,
                commission,
                jobGiverFee,
                totalPaidByGiver,
                payoutToInstaller: data.amount - commission + (data.travelTip || 0),
                status: 'initiated',
                transactionType: data.transactionType || 'JOB',
                relatedTaskId: data.taskId,
                description: data.description,
                paymentGatewayOrderId: orderId,
                createdAt: Timestamp.now() as any,
            };

            const db = getAdminDb();
            const tranRef = await db.collection(COLLECTIONS.TRANSACTIONS).add(transaction);

            logger.userActivity(data.userId, 'payment_initiated', {
                jobId: data.jobId,
                amount: totalPaidByGiver
            });

            // Create Cashfree order (mock for now)
            const order = await cashfreeClient.createOrder({
                orderId,
                orderAmount: totalPaidByGiver,
                customerName: 'User', // TODO: Get from user data
                customerEmail: 'user@example.com',
                customerPhone: '9999999999',
            });

            // Update transaction with order token
            await tranRef.update({
                paymentGatewaySessionId: order.orderToken,
            });

            return order;
        } catch (error) {
            logger.error('Failed to create payment order', error, { metadata: data });
            throw error;
        }
    }

    /**
     * Verify and mark payment as funded
     */
    async verifyPayment(orderId: string): Promise<void> {
        try {
            // Verify with Cashfree
            const verification = await cashfreeClient.verifyPayment(orderId);

            // Update transaction status
            const db = getAdminDb();
            const snapshot = await db
                .collection(COLLECTIONS.TRANSACTIONS)
                .where('paymentGatewayOrderId', '==', orderId)
                .limit(1)
                .get();

            if (snapshot.empty) {
                throw new Error('Transaction not found');
            }

            const tranDoc = snapshot.docs[0];
            await tranDoc.ref.update({
                status: 'funded',
                fundedAt: Timestamp.now() as any,
            });

            const transaction = tranDoc.data() as Transaction;
            logger.userActivity(transaction.payerId, 'payment_verified', {
                jobId: transaction.jobId,
                orderId
            });
        } catch (error) {
            logger.error('Failed to verify payment', error, { metadata: { orderId } });
            throw error;
        }
    }

    /**
     * Release funds to installer
     */
    async releaseFunds(jobId: string, installerId: string): Promise<void> {
        try {
            const db = getAdminDb();

            // Find transaction using only jobId to avoid composite index
            const snapshot = await db
                .collection(COLLECTIONS.TRANSACTIONS)
                .where('jobId', '==', jobId)
                .get();

            const tranDoc = snapshot.docs.find(doc => doc.data().status === 'funded');

            if (!tranDoc) {
                throw new Error('No funded transaction found for this job');
            }

            const transaction = tranDoc.data() as Transaction;

            // Create payout
            const transferId = `transfer_${jobId}_${Date.now()}`;
            await cashfreeClient.createPayout({
                beneficiaryId: installerId,
                amount: transaction.payoutToInstaller,
                transferId,
            });

            // Update transaction
            await tranDoc.ref.update({
                status: 'released',
                releasedAt: Timestamp.now() as any,
                payoutTransferId: transferId,
            });

            logger.userActivity(installerId, 'funds_released', {
                jobId,
                amount: transaction.payoutToInstaller
            });
        } catch (error) {
            logger.error('Failed to release funds', error, { metadata: { jobId } });
            throw error;
        }
    }

    /**
     * Process refund
     */
    async processRefund(jobId: string, reason: string): Promise<void> {
        try {
            const db = getAdminDb();

            // Find transaction using only jobId to avoid composite index
            const snapshot = await db
                .collection(COLLECTIONS.TRANSACTIONS)
                .where('jobId', '==', jobId)
                .get();

            const tranDoc = snapshot.docs.find(doc => ['funded', 'initiated'].includes(doc.data().status));

            if (!tranDoc) {
                throw new Error('No refundable transaction found');
            }

            const transaction = tranDoc.data() as Transaction;

            // Process refund
            const refundId = `refund_${jobId}_${Date.now()}`;
            await cashfreeClient.processRefund({
                orderId: transaction.paymentGatewayOrderId!,
                refundAmount: transaction.totalPaidByGiver,
                refundId,
            });

            // Update transaction
            await tranDoc.ref.update({
                status: 'refunded',
                refundedAt: Timestamp.now() as any,
                refundTransferId: refundId,
            });

            logger.adminAction('system', 'refund_processed', jobId, { reason, amount: transaction.totalPaidByGiver });
        } catch (error) {
            logger.error('Failed to process refund', error, { metadata: { jobId } });
            throw error;
        }
    }


    /**
     * Get transaction history for a user (both as payer and payee)
     */
    async getTransactionHistory(userId: string): Promise<Transaction[]> {
        try {
            const db = getAdminDb();
            const payerSnap = await db.collection(COLLECTIONS.TRANSACTIONS)
                .where('payerId', '==', userId)
                .get();
            const payeeSnap = await db.collection(COLLECTIONS.TRANSACTIONS)
                .where('payeeId', '==', userId)
                .get();

            const txMap = new Map<string, Transaction>();
            payerSnap.docs.forEach(d => txMap.set(d.id, { id: d.id, ...d.data() } as Transaction));
            payeeSnap.docs.forEach(d => txMap.set(d.id, { id: d.id, ...d.data() } as Transaction));

            return Array.from(txMap.values());
        } catch (error) {
            logger.error('Failed to fetch transaction history', error, { userId });
            throw error;
        }
    }

    async getTransaction(transactionId: string): Promise<Transaction | null> {
        try {
            const db = getAdminDb();
            const doc = await db.collection(COLLECTIONS.TRANSACTIONS).doc(transactionId).get();
            if (!doc.exists) return null;
            return { id: doc.id, ...doc.data() } as Transaction;
        } catch (error) {
            logger.error('Failed to fetch transaction', error, { transactionId });
            throw error;
        }
    }
}

export const paymentService = new PaymentService();
