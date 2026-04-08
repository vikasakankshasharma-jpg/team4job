
import { cashfreeClient } from './cashfree.client';
import { CreatePaymentOrderInput, Transaction, PaymentStatus } from './payment.types';
import { paymentRepository } from './payment.repository';

import { Timestamp } from 'firebase-admin/firestore';
import { userRepository } from '../users/user.repository';

/**
 * Payment Service - Business logic for payments
 */
export class PaymentService {
    private isEmulatorMode(): boolean {
        const isEmu = process.env.USE_EMULATOR === 'true'
            || process.env.NEXT_PUBLIC_USE_EMULATOR === 'true'
            || process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true'
            || !!process.env.FIRESTORE_EMULATOR_HOST;


        return isEmu;
    }

    /**
     * Create a payment order for job funding
     */
    async createPaymentOrder(data: CreatePaymentOrderInput): Promise<{ orderToken: string; orderId: string }> {
        try {
            // Generate unique order ID
            const orderId = `order_${data.jobId}_${Date.now()}`;

            const { jobRepository } = await import('../jobs/job.repository');
            const job = await jobRepository.fetchById(data.jobId);
            
            let commissionRate = 0.05; // Default 5% for Bronze/Missing
            
            if (job?.awardedProfessionalId) {
                const professional = await userRepository.fetchById(job.awardedProfessionalId);
                const tierPriority = professional?.professionalProfile?.tierPriority || 1;
                
                // Tier mapping: 4=Platinum (2%), 3=Gold (3%), 2=Silver (4%), 1=Bronze (5%)
                if (tierPriority === 4) commissionRate = 0.02;
                else if (tierPriority === 3) commissionRate = 0.03;
                else if (tierPriority === 2) commissionRate = 0.04;
            }

            // Calculate fees
            const commission = data.amount * commissionRate;
            const clientFee = data.amount * 0.02; // 2% client fee
            const totalPaidByClient = data.amount + clientFee + (data.travelTip || 0);

            // Create transaction record
            const transactionData: Partial<Transaction> = {
                jobId: data.jobId,
                payerId: data.userId,
                amount: data.amount,
                travelTip: data.travelTip || 0,
                commission,
                clientFee,
                totalPaidByClient,
                payoutToProfessional: data.amount - commission + (data.travelTip || 0),
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

            const transactionId = await paymentRepository.create(transactionData);

            // Fetch real user data
            const user = await userRepository.fetchById(data.userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Create Cashfree order or mock if in emulator mode
            let order;
            if (this.isEmulatorMode()) {
                order = {
                    orderId,
                    orderToken: `mock_token_${Date.now()}`
                };
            } else {
                order = await cashfreeClient.createOrder({
                    orderId,
                    orderAmount: totalPaidByClient,
                    customerName: user.name || 'User',
                    customerEmail: user.email || 'user@example.com',
                    customerPhone: user.mobile || '0000000000',
                });
            }

            // Update transaction with order token
            await paymentRepository.update(transactionId, {
                paymentGatewaySessionId: order.orderToken,
            });

            return order;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Verify and mark payment as funded
     */
    async verifyPayment(orderId: string): Promise<void> {
        try {
            // Verify with Cashfree
            const cashfreeResponse = await cashfreeClient.verifyPayment(orderId);

            if (cashfreeResponse.status !== 'PAID' && cashfreeResponse.status !== 'SUCCESS') {
                throw new Error(`Payment verification failed. Cashfree Status: ${cashfreeResponse.status}`);
            }

            // Find transaction
            const transactionResult = await paymentRepository.findByOrderId(orderId);

            if (!transactionResult) {
                throw new Error('Transaction not found');
            }

            await paymentRepository.update(transactionResult.id, {
                status: 'funded',
                fundedAt: Timestamp.now() as any,
            });

            // Data Aggregation: Update Professional's Projected Earnings
            // We need to find the awarded Professional for this job
            const { jobRepository } = await import('../jobs/job.repository');
            const job = await jobRepository.fetchById(transactionResult.data.jobId);
            if (job?.awardedProfessionalId) {
                userRepository.incrementStats(job.awardedProfessionalId, {
                    projectedEarnings: transactionResult.data.payoutToProfessional
                }).catch(e => { /* Failed to increment projectedEarnings */ });
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Release funds to Professional
     */
    async releaseFunds(jobId: string, professionalId: string): Promise<void> {
        try {
            const transactions = await paymentRepository.findByJobId(jobId);
            const transaction = transactions.find(t => t.status === 'funded');

            if (!transaction) {
                throw new Error('No funded transaction found for this job');
            }

            // Verify the transaction belongs to this job and amount matches
            if (transaction.jobId !== jobId) {
                throw new Error('Security violation: Transaction job ID mismatch');
            }

            // Create payout
            const transferId = `transfer_${jobId}_${Date.now()}`;
            if (this.isEmulatorMode()) {
                // Skiping Cashfree payout in emulator mode
            } else {
                await cashfreeClient.createPayout({
                    beneficiaryId: professionalId,
                    amount: transaction.payoutToProfessional,
                    transferId,
                });
            }

            // Update transaction
            await paymentRepository.update(transaction.id, {
                status: 'released',
                releasedAt: Timestamp.now() as any,
                payoutTransferId: transferId,
                payeeId: professionalId,
            });

            // Data Aggregation: Transition Projected to Total Earnings
            userRepository.incrementStats(professionalId, {
                projectedEarnings: -transaction.payoutToProfessional,
                totalEarnings: transaction.payoutToProfessional
            }).catch(e => { /* Failed to update earnings aggregation */ });

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get escrow status for a job
     */
    async getEscrowStatus(jobId: string): Promise<{ status: 'none' | 'initiated' | 'funded' | 'released' | 'refunded'; amount?: number }> {
        const transactions = await paymentRepository.findByJobId(jobId);
        if (transactions.length === 0) return { status: 'none' };

        // Prioritize funded/released statuses
        if (transactions.some(t => t.status === 'released')) {
            const tx = transactions.find(t => t.status === 'released')!;
            return { status: 'released', amount: tx.amount };
        }
        if (transactions.some(t => t.status === 'funded')) {
            const tx = transactions.find(t => t.status === 'funded')!;
            return { status: 'funded', amount: tx.amount };
        }
        if (transactions.some(t => t.status === 'refunded')) {
            return { status: 'refunded' };
        }

        return { status: 'initiated' };
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
                refundAmount: transaction.totalPaidByClient,
                refundId,
            });

            // Update transaction
            await paymentRepository.update(transaction.id, {
                status: 'refunded',
                refundedAt: Timestamp.now() as any,
                refundTransferId: refundId,
            });

            // Data Aggregation: Rollback Projected Earnings if it was funded
            if (transaction.status === 'funded') {
                const { jobRepository } = await import('../jobs/job.repository');
                const job = await jobRepository.fetchById(transaction.jobId);
                if (job?.awardedProfessionalId) {
                    userRepository.incrementStats(job.awardedProfessionalId, {
                        projectedEarnings: -transaction.payoutToProfessional
                    }).catch(e => { /* Failed to rollback projectedEarnings */ });
                }
            }
        } catch (error) {
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
            throw error;
        }
    }

    async getTransaction(transactionId: string): Promise<Transaction | null> {
        try {
            return await paymentRepository.findById(transactionId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Record payout success from webhook (TRANSFER_SUCCESS)
     */
    async recordPayoutSuccess(transferId: string): Promise<void> {
        try {
            // Find transaction by payoutTransferId
            const transactionRecord = await paymentRepository.findByPayoutTransferId(transferId);
            if (!transactionRecord) {
                return;
            }

            await paymentRepository.update(transactionRecord.id, {
                status: 'released',
                releasedAt: transactionRecord.data.releasedAt || Timestamp.now() as any
            });
        } catch (error) {
            // Failed to record payout success
        }
    }
}

export const paymentService = new PaymentService();

