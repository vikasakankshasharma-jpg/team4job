
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server-init';
import { Job, Transaction } from '@/lib/types';
import axios from 'axios';
import { logAdminAlert } from '@/lib/admin-logger';

// Use sandbox for beta
const CASHFREE_API_BASE = 'https://sandbox.cashfree.com/pg';

export async function POST(req: NextRequest) {
    try {
        const db = getAdminDb();
        const { jobId, userId } = await req.json();

        if (!jobId || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await jobRef.get();

        if (!jobSnap.exists) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        const job = jobSnap.data() as Job;

        // Verify ownership
        if (typeof job.jobGiver === 'string') {
            if (job.jobGiver !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        } else if (job.jobGiver.id !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Check status
        // Only allow refund if In Progress (Funded)
        if (job.status !== 'In Progress') {
            // If not funded (e.g. Open, Awarded but not paid), just cancel locally provided no one accepted? 
            // Actually, if it's 'Awarded', we might need to notify installer. 
            // But for 'Refund', we only care if money is held.
            // If money is NOT held, the client should use a different path or we handle it here simply.
            if (['Open', 'Awarded', 'Pending Confirmation'].includes(job.status)) { // Pending Confirmation means work done? No, Cancel should be disabled then.
                // Allow simple cancel if not funded.
                await jobRef.update({ status: 'Cancelled' });
                return NextResponse.json({ success: true, message: 'Job cancelled (no refund needed).' });
            }
            return NextResponse.json({ error: 'Job cannot be cancelled in this state.' }, { status: 400 });
        }

        // Find the funded transaction
        const transQuery = db.collection('transactions')
            .where('jobId', '==', jobId)
            .where('status', '==', 'Funded') // Or 'Initiated' if captured? 'Funded' is our tracking.
            .limit(1);

        const transSnap = await transQuery.get();

        if (transSnap.empty) {
            // Edge case: Job says funded but no txn? Just cancel.
            await jobRef.update({ status: 'Cancelled' });
            return NextResponse.json({ success: true, message: 'Job cancelled (no transaction found).' });
        }

        const transaction = transSnap.docs[0].data() as Transaction;
        const transactionId = transaction.paymentGatewayOrderId;

        if (!transactionId) {
            return NextResponse.json({ error: 'Payment gateway order ID missing.' }, { status: 500 });
        }

        // --- TIERED CANCELLATION LOGIC (Railway Style - Refined) ---
        const now = new Date();
        const jobStartDate = job.jobStartDate ? (job.jobStartDate as any).toDate() : null;
        let fundedAt = transaction.fundedAt ? (transaction.fundedAt as any).toDate() : null;

        // Fallback if fundedAt is missing (shouldn't happen for In Progress, but safety first)
        if (!fundedAt && transaction.status === 'Funded') {
            // If we can't find fundedAt, we can't offer grace period safely, assume old transaction
            fundedAt = new Date(0);
        }

        let penaltyAmount = 0;
        let installerCompensation = 0;
        // Fetch Dynamic Platform Settings
        const settingsSnap = await db.collection('platform_settings').doc('config').get();
        const settings = settingsSnap.exists ? settingsSnap.data() : {};
        const platformFeePercent = settings?.cancellationFeePercent || 2.5;

        const platformFee = Math.ceil(transaction.totalPaidByGiver * (platformFeePercent / 100)); // Dynamic Fee

        if (job.cancellationReason === 'no_show' || (req.body as any).reason === 'no_show') { // Handle reason passed in body
            // VERIFIED NO-SHOW LOGIC
            const gracePeriodHours = 1;
            const timeSinceStart = (now.getTime() - jobStartDate.getTime()) / (1000 * 60 * 60);

            if (timeSinceStart >= gracePeriodHours && !job.workStartedAt) {
                // Condition Met: > 1 Hour Late and NOT Started
                penaltyAmount = 0; // FULL REFUND for Job Giver
                installerCompensation = 0; // Installer gets nothing

                // Installer gets DEBT (The platform fee they caused the platform to lose/incur)
                // Actually, we usually want to recover the platform fee. 
                // If we give 100% refund, the platform loses the processing fee paid to Gateway (likely).
                // So we charge the installer that fee.
                const debtAmount = platformFee;

                // Log Debt to Installer
                if (transaction.payeeId) { // payeeId is installer
                    const installerRef = db.collection('users').doc(transaction.payeeId);
                    await db.runTransaction(async (t) => {
                        const doc = await t.get(installerRef);
                        const currentDebt = doc.data()?.platformDebt || 0;
                        t.update(installerRef, { platformDebt: currentDebt + debtAmount });
                    });
                    await logAdminAlert('WARNING', `Installer No-Show Penalty Applied: ₹${debtAmount} to User ${transaction.payeeId}`, { jobId, installerId: transaction.payeeId });
                }

            } else {
                // Misuse of 'No-Show' or too early? Fallback to standard cancellation or Error?
                // If they try to claim No-Show before the time, we should probably warn or fall back to standard.
                // For now, let's treat it as standard "Less than 4 hours" or whatever the time is, 
                // OR return error "Cannot claim No-Show yet. Please wait 1 hour after start time."
                if (timeSinceStart < gracePeriodHours) {
                    return NextResponse.json({
                        error: `Cannot claim No-Show yet. Please wait until 1 hour after the scheduled start time (${new Date(jobStartDate.getTime() + 60 * 60 * 1000).toLocaleTimeString()}).`
                    }, { status: 400 });
                }
                // If work started?
                if (job.workStartedAt) {
                    return NextResponse.json({ error: 'Work has already started. Cannot claim No-Show.' }, { status: 400 });
                }
            }
        }

        // Standard Logic only if penaltyAmount wasn't set to 0 by No-Show logic (and reason wasn't no_show)
        if (penaltyAmount === 0 && (job.cancellationReason !== 'no_show' && (req.body as any).reason !== 'no_show')) {
            const timeDiffHours = (jobStartDate.getTime() - now.getTime()) / (1000 * 60 * 60);
            const bidAmount = transaction.amount;

            // Grace Period: Cancelled within 30 mins of funding AND start time > 2 hours away
            let isGracePeriod = false;
            if (fundedAt) {
                const minutesSinceFunding = (now.getTime() - fundedAt.getTime()) / (1000 * 60);
                if (minutesSinceFunding <= 30 && timeDiffHours >= 2) {
                    isGracePeriod = true;
                }
            }

            if (isGracePeriod) {
                // Grace Period: Only Platform Fee
                penaltyAmount = platformFee;
            } else if (timeDiffHours > 24) {
                // > 24 Hours: Only Platform Fee
                penaltyAmount = platformFee;
            } else if (timeDiffHours >= 12) {
                // 12 - 24 Hours: 10% of Bid
                penaltyAmount = Math.ceil(bidAmount * 0.10);
                installerCompensation = penaltyAmount - platformFee;
            } else if (timeDiffHours >= 4) {
                // 4 - 12 Hours: 25% of Bid
                penaltyAmount = Math.ceil(bidAmount * 0.25);
                installerCompensation = penaltyAmount - platformFee;
            } else if (timeDiffHours > 0) {
                // < 4 Hours: 50% of Bid
                penaltyAmount = Math.ceil(bidAmount * 0.50);
                installerCompensation = penaltyAmount - platformFee;
            } else {
                // After Start Time (and not No-Show logic): 100% Penalty
                return NextResponse.json({
                    error: 'Job has already started or start time passed. Cancellations must be handled via Dispute or No-Show claim.'
                }, { status: 400 });
            }
        }

        // Ensure penalty covers at least the platform fee and is not negative
        penaltyAmount = Math.max(penaltyAmount, platformFee);
        installerCompensation = Math.max(0, installerCompensation);

        const refundAmount = transaction.totalPaidByGiver - penaltyAmount;

        // Trigger Cashfree Refund
        const refundPayload = {
            refund_amount: refundAmount,
            refund_id: `REF-${jobId}-${Date.now()}`,
            refund_note: `Job Cancelled. Penalty: ₹${penaltyAmount} (Installer: ₹${installerCompensation}, Platform: ₹${platformFee}).`
        };

        const response = await axios.post(
            `${CASHFREE_API_BASE}/orders/${transactionId}/refunds`,
            refundPayload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-id': process.env.CASHFREE_PAYMENTS_CLIENT_ID,
                    'x-client-secret': process.env.CASHFREE_PAYMENTS_CLIENT_SECRET,
                    'x-api-version': '2022-09-01',
                },
            }
        );

        // Update DB
        await jobRef.update({
            status: 'Cancelled',
            cancellationMetadata: {
                cancelledBy: userId,
                cancelledAt: new Date(),
                penaltyApplied: penaltyAmount,
                installerCompensation: installerCompensation,
                platformFee: platformFee,
                refundProcessed: refundAmount
            }
        });
        await transSnap.docs[0].ref.update({
            status: 'Refunded',
            refundMetadata: {
                amount: refundAmount,
                penalty: penaltyAmount,
                timestamp: new Date()
            }
        });

        // Alert Admin for High Value Refunds
        if (refundAmount > 5000) {
            await logAdminAlert('WARNING', `High Value Refund Processed: ₹${refundAmount} for Job ${jobId}`, {
                jobId,
                refundAmount,
                penaltyAmount,
                userId
            });
        }

        return NextResponse.json({ success: true, refund_id: response.data.refund_id });

    } catch (error: any) {
        console.error('Refund failed:', error.response?.data || error.message);
        return NextResponse.json({ error: error.response?.data?.message || 'Refund failed' }, { status: 500 });
    }
}
