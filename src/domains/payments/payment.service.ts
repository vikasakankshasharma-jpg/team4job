
import { cashfreeClient } from './cashfree.client';
import { CreatePaymentOrderInput, Transaction, PaymentStatus } from './payment.types';
import { paymentRepository } from './payment.repository';
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
            const transactionData: Partial<Transaction> = {
                jobId: data.jobId,
                payerId: data.userId,
                amount: data.amount,
                travelTip: data.travelTip || 0,
                commission,
                jobGiverFee,
                totalPaidByGiver,
                payoutToInstaller: data.amount - commission + (data.travelTip || 0),
                status: 'initiated',
                transactionType: data.transactionType || 'JOB',
                relatedTaskId: data.taskId || undefined,
                description: data.description || undefined,
                paymentGatewayOrderId: orderId,
                createdAt: Timestamp.now() as any,
            };

            // Remove any remaining undefined keys (belt and suspenders)
            Object.keys(transactionData).forEach(key => {
                if ((transactionData as any)[key] === undefined) {
                    delete (transactionData as any)[key];
                }
            });

            console.log('[DEBUG] Final Transaction before Repository:', JSON.stringify(transactionData, null, 2));

            const transactionId = await paymentRepository.create(transactionData);

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
            await paymentRepository.update(transactionId, {
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
            await cashfreeClient.verifyPayment(orderId);

            // Find transaction
            const transactionResult = await paymentRepository.findByOrderId(orderId);

            if (!transactionResult) {
                throw new Error('Transaction not found');
            }

            await paymentRepository.update(transactionResult.id, {
                status: 'funded',
                fundedAt: Timestamp.now() as any,
            });

            logger.userActivity(transactionResult.data.payerId, 'payment_verified', {
                jobId: transactionResult.data.jobId,
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
            const transactions = await paymentRepository.findByJobId(jobId);
            const transaction = transactions.find(t => t.status === 'funded');

            if (!transaction) {
                throw new Error('No funded transaction found for this job');
            }

            // Create payout
            const transferId = `transfer_${jobId}_${Date.now()}`;
            await cashfreeClient.createPayout({
                beneficiaryId: installerId,
                amount: transaction.payoutToInstaller,
                transferId,
            });

            // Update transaction
            await paymentRepository.update(transaction.id, {
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
            const transactions = await paymentRepository.findByJobId(jobId);
            const transaction = transactions.find(t => ['funded', 'initiated'].includes(t.status));

            if (!transaction) {
                throw new Error('No refundable transaction found');
            }

            // Process refund
            const refundId = `refund_${jobId}_${Date.now()}`;
            await cashfreeClient.processRefund({
                orderId: transaction.paymentGatewayOrderId!,
                refundAmount: transaction.totalPaidByGiver,
                refundId,
            });

            // Update transaction
            await paymentRepository.update(transaction.id, {
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
            const [payerTransactions, payeeTransactions] = await Promise.all([
                paymentRepository.findByPayerId(userId),
                paymentRepository.findByPayeeId(userId)
            ]);

            const txMap = new Map<string, Transaction>();
            payerTransactions.forEach(t => txMap.set(t.id, t));
            payeeTransactions.forEach(t => txMap.set(t.id, t));

            return Array.from(txMap.values());
        } catch (error) {
            logger.error('Failed to fetch transaction history', error, { userId });
            throw error;
        }
    }

    async getTransaction(transactionId: string): Promise<Transaction | null> {
        try {
            return await paymentRepository.findById(transactionId);
        } catch (error) {
            logger.error('Failed to fetch transaction', error, { transactionId });
            throw error;
        }
    }
}

export const paymentService = new PaymentService();
