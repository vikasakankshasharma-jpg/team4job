
import { cashfreeClient } from './cashfree.client';
import { CreatePaymentOrderInput, Transaction, PaymentStatus } from './payment.types';
import { paymentRepository } from './payment.repository';

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import * as Sentry from '@sentry/nextjs';
import { userRepository } from '../users/user.repository';
import { platformEventEmitter } from '@/lib/events/event-emitter';

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

            // Calculate fees (rounded to 2 decimal places to avoid floating point errors)
            const commission = Math.round(data.amount * commissionRate * 100) / 100;
            const clientFee = Math.round(data.amount * 0.02 * 100) / 100; // 2% client fee
            const totalPaidByClient = Math.round((data.amount + clientFee + (data.travelTip || 0)) * 100) / 100;

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
                const orderPayload: any = {
                    orderId,
                    orderAmount: totalPaidByClient,
                    customerName: user.name || 'User',
                    customerEmail: user.email || 'user@example.com',
                    customerPhone: user.mobile || '0000000000',
                };
                
                // Add Vendor Split if Professional is known
                if (job?.awardedProfessionalId) {
                    orderPayload.orderSplits = [{
                        vendor_id: job.awardedProfessionalId,
                        amount: data.amount - commission + (data.travelTip || 0),
                    }];
                }

                order = await cashfreeClient.createOrder(orderPayload);
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

            const db = getAdminDb();
            const txRef = db.collection('transactions').doc(transactionResult.id);
            
            let isFirstTimeFunding = false;

            // IDEMPOTENCY CHECK & UPDATE IN ATOMIC TRANSACTION
            await db.runTransaction(async (t) => {
                const doc = await t.get(txRef);
                if (!doc.exists) throw new Error('Transaction doc vanished');
                
                const data = doc.data() as any;
                if (data.status === 'funded' || data.status === 'released') {
                    // Already processed, exit gracefully
                    isFirstTimeFunding = false;
                    return;
                }
                
                t.update(txRef, {
                    status: 'funded',
                    fundedAt: Timestamp.now() as any,
                });
                isFirstTimeFunding = true;
            });

            if (!isFirstTimeFunding) {
                // If this is a redelivered webhook and we already funded, silently exit
                return;
            }

                        if (transactionResult.data.transactionType === 'SUBSCRIPTION') {
                // Subscription Logic
                const planId = transactionResult.data.jobId.split('-')[2];
                if (!planId) return;
                
                const { userRepository } = await import('../../domains/users/user.repository');
                                const userDoc = await userRepository.fetchById((transactionResult.data as any).userId);
                
                if (userDoc) {
                    const now = new Date();
                    const newExpiryDate = new Date(now);
                    newExpiryDate.setMonth(newExpiryDate.getMonth() + 1); // 1 month subscription
                    
                    await userRepository.update(userDoc.id, {
                        subscription: {
                            planId: planId,
                            planName: (transactionResult.data.description || '').replace('Subscription: ', ''),
                            expiresAt: newExpiryDate.toISOString() as any,
                            status: 'active'
                        }
                    } as any);
                }
                return;
            }

            platformEventEmitter.emit({
                name: 'escrow.funded',
                occurredAt: new Date().toISOString(),
                payload: { transactionId: transactionResult.id, jobId: transactionResult.data.jobId },
            });

            // Data Aggregation: Update Professional's Projected Earnings
            // We need to find the awarded Professional for this job
            const { jobRepository } = await import('../jobs/job.repository');
            const job = await jobRepository.fetchById(transactionResult.data.jobId);
            if (job?.awardedProfessionalId) {
                userRepository.incrementStats(job.awardedProfessionalId, {
                    projectedEarnings: transactionResult.data.payoutToProfessional
                }).catch(e => { console.error('Failed to increment projectedEarnings', e); Sentry.captureException(e); });
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Mark payment as failed (called from webhook)
     */
    async markPaymentFailed(orderId: string, reason?: string): Promise<void> {
        try {
            const transactionResult = await paymentRepository.findByOrderId(orderId);
            if (!transactionResult) return; // Silent exit if not found
            
            const db = getAdminDb();
            const txRef = db.collection('transactions').doc(transactionResult.id);
            
            await db.runTransaction(async (t) => {
                const doc = await t.get(txRef);
                if (!doc.exists) return;
                
                const data = doc.data() as any;
                // If it's already funded/released, we CANNOT mark it failed. That would be an inconsistent state.
                if (data.status === 'funded' || data.status === 'released' || data.status === 'failed') {
                    return;
                }
                
                t.update(txRef, {
                    status: 'failed',
                    failedAt: Timestamp.now() as any,
                    description: reason ? `Failed: ${reason}` : data.description
                });
            });
            
        } catch (error) {
            console.error('[PaymentService] Failed to mark payment as failed', error);
        }
    }

    /**
     * Release funds to Professional
     */
    async releaseFunds(jobId: string, professionalId: string): Promise<void> {
        try {
            const transactions = await paymentRepository.findByJobId(jobId);
            const transactionDoc = transactions.find(t => t.status === 'funded');

            if (!transactionDoc) {
                throw new Error('No funded transaction found for this job');
            }

            // Verify the transaction belongs to this job and amount matches
            if (transactionDoc.jobId !== jobId) {
                throw new Error('Security violation: Transaction job ID mismatch');
            }

            const transferId = `transfer_${jobId}_${Date.now()}`;
            const db = getAdminDb();
            const txRef = db.collection('transactions').doc(transactionDoc.id);

            // Phase 1: Atomically lock the transaction by changing its status
            await db.runTransaction(async (t) => {
                const doc = await t.get(txRef);
                if (!doc.exists) throw new Error('Transaction document not found');
                const currentStatus = doc.data()?.status;
                if (currentStatus !== 'funded' && currentStatus !== 'payout_initiated') {
                    throw new Error('Transaction is no longer in funded status (possibly already released)');
                }
                t.update(txRef, {
                    status: 'payout_initiated', // intermediate state to prevent double execution
                    payoutTransferId: transferId,
                    payeeId: professionalId,
                });
            });

            // Phase 2: External API call (Easy Split Settlement)
            if (!this.isEmulatorMode()) {
                try {
                    if (!transactionDoc.paymentGatewayOrderId) {
                        throw new Error("Cannot settle order without paymentGatewayOrderId");
                    }
                    await cashfreeClient.settleOrder(transactionDoc.paymentGatewayOrderId);
                } catch (payoutError: any) {
                    const errorMsg = payoutError.response?.data?.message || payoutError.message || '';
                    if (errorMsg.toLowerCase().includes('already settled') || errorMsg.toLowerCase().includes('settlement already initiated')) {
                        console.log(`[PaymentService] Checking external settlement status for ${transactionDoc.paymentGatewayOrderId}...`);
                        try {
                            const settlements = await cashfreeClient.getSettlements(transactionDoc.paymentGatewayOrderId!);
                            if (settlements && settlements.length > 0) {
                                console.log(`[PaymentService] Confirmed external settlement. Proceeding to release.`);
                            } else {
                                await txRef.update({ status: 'reconciliation_required' });
                                throw new Error(`Status uncertain: Settlement error matched, but no settlement found. Marked for reconciliation.`);
                            }
                        } catch (fetchError) {
                            await txRef.update({ status: 'reconciliation_required' });
                            throw new Error(`Status uncertain: Could not verify settlement status. Marked for reconciliation.`);
                        }
                    } else {
                        // Mark for reconciliation if it's a network timeout (5xx or code like ENOTFOUND)
                        // For safe UX, we will just leave it in payout_initiated and throw.
                        const isNetworkError = !payoutError.response || payoutError.response.status >= 500;
                        if (isNetworkError) {
                            await txRef.update({ status: 'reconciliation_required' });
                        }
                        throw payoutError;
                    }
                }
            }

            // Phase 3: Mark as released
            await txRef.update({
                status: 'released',
                releasedAt: Timestamp.now()
            });

            // Record to Timeline
            const { timelineService } = await import('@/domains/jobs/timeline.service');
            await timelineService.recordEvent({
                jobId: jobId,
                eventType: 'PAYMENT_RELEASED',
                actorId: professionalId,
                actorRole: 'SYSTEM',
                visibility: ['CUSTOMER', 'PROFESSIONAL', 'ADMIN'],
                metadata: {
                    transactionId: transactionDoc.id,
                    amount: transactionDoc.payoutToProfessional
                },
                idempotencyKey: `payment_released_${transactionDoc.id}`
            });

            // Data Aggregation: Transition Projected to Total Earnings
            userRepository.incrementStats(professionalId, {
                projectedEarnings: -transactionDoc.payoutToProfessional,
                totalEarnings: transactionDoc.payoutToProfessional
            }).catch(e => { console.error('Failed to update earnings', e); Sentry.captureException(e); });

        } catch (error) {
            console.error('[PaymentService] releaseFunds failed', error);
            Sentry.captureException(error);
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

            const db = getAdminDb();
            const txRef = db.collection('transactions').doc(transaction.id);

            let shouldCallGateway = false;

            await db.runTransaction(async (t) => {
                const doc = await t.get(txRef);
                if (!doc.exists) throw new Error('Transaction vanished');
                
                const data = doc.data() as any;
                
                if (data.status === 'refunded' || data.status === 'cancelled') {
                    // Already processed
                    return;
                }

                if (data.status === 'initiated') {
                    t.update(txRef, { status: 'cancelled' });
                    return;
                }

                if (data.status === 'funded' || data.status === 'refund_initiated') {
                    // Lock for refund, or allow retry if stuck in refund_initiated
                    t.update(txRef, { status: 'refund_initiated' });
                    shouldCallGateway = true;
                }
            });

            if (!shouldCallGateway) return;

            // Process refund externally
            // DETERMINISTIC REFUND ID to prevent duplicate refunds on network timeouts
            const refundId = `refund_${transaction.id}`;
            try {
                await cashfreeClient.processRefund({
                    orderId: transaction.paymentGatewayOrderId!,
                    refundAmount: transaction.totalPaidByClient,
                    refundId,
                });
            } catch (err: any) {
                const errorMsg = err.response?.data?.message || err.message || '';
                if (errorMsg.toLowerCase().includes('refund already') || errorMsg.toLowerCase().includes('already processed')) {
                    console.log(`[PaymentService] Checking external refund status for ${refundId}...`);
                    try {
                        const refundData = await cashfreeClient.getRefund(transaction.paymentGatewayOrderId!, refundId);
                        if (refundData && (refundData.refund_status === 'SUCCESS' || refundData.refund_status === 'PENDING')) {
                            console.log(`[PaymentService] Confirmed external refund. Proceeding to finalize.`);
                        } else {
                            await txRef.update({ status: 'reconciliation_required' });
                            throw new Error(`Status uncertain: Refund error matched, but status is ${refundData?.refund_status}. Marked for reconciliation.`);
                        }
                    } catch (fetchError) {
                        await txRef.update({ status: 'reconciliation_required' });
                        throw new Error(`Status uncertain: Could not verify refund status. Marked for reconciliation.`);
                    }
                } else {
                    const isNetworkError = !err.response || err.response.status >= 500;
                    if (isNetworkError) {
                        await txRef.update({ status: 'reconciliation_required' });
                    }
                    throw err;
                }
            }

            // Finalize refund state
            await txRef.update({
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
                    }).catch(e => { console.error('Failed to rollback projectedEarnings', e); Sentry.captureException(e); });
                }
            }
        } catch (error) {
            throw error;
        }
    }


    /**
     * Get transaction history for a user (both as payer and payee)
     */
    async getTransactionHistory(userId: string, limit = 50, startAfter?: any): Promise<Transaction[]> {
        try {
            // Note: In a real app with large data, this requires a composite index or complex queries.
            // For now, fetch and slice in-memory if we have to, or update repository to accept limits.
            const [payerTransactions, payeeTransactions] = await Promise.all([
                paymentRepository.findByPayerId(userId, limit),
                paymentRepository.findByPayeeId(userId, limit)
            ]);

            const txMap = new Map<string, Transaction>();
            payerTransactions.forEach(t => txMap.set(t.id, t));
            payeeTransactions.forEach(t => txMap.set(t.id, t));

            const combined = Array.from(txMap.values());
            combined.sort((a, b) => {
                const dateA = (a.createdAt as any)?._seconds || 0;
                const dateB = (b.createdAt as any)?._seconds || 0;
                return dateB - dateA;
            });
            
            return combined.slice(0, limit);
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

            const db = getAdminDb();
            const txRef = db.collection('transactions').doc(transactionRecord.id);

            await db.runTransaction(async (t) => {
                const doc = await t.get(txRef);
                if (!doc.exists) return;

                const data = doc.data() as any;
                if (data.status === 'released') {
                    // Idempotent exit
                    return;
                }

                t.update(txRef, {
                    status: 'released',
                    releasedAt: data.releasedAt || Timestamp.now() as any
                });
            });
        } catch (error) {
            console.error('[PaymentService] Failed to record payout success', error);
            Sentry.captureException(error);
        }
    }
}

export const paymentService = new PaymentService();





