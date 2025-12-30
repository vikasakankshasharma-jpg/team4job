
import { NextRequest, NextResponse } from 'next/server';
import { db, adminAuth } from '@/lib/firebase/server-init';
import { User, Transaction, Job } from '@/lib/types';
import axios from 'axios';
import { logAdminAlert } from '@/lib/admin-logger';
import { sendServerEmail } from '@/lib/server-email';

// Cashfree Configs
// PG (for Refunds) - Sandbox
const CASHFREE_PG_URL = 'https://sandbox.cashfree.com/pg';
// Payouts (for Releases) - Sandbox
const CASHFREE_PAYOUT_URL = 'https://payout-gamma.cashfree.com/payouts';

async function getPayoutToken(): Promise<string> {
    const response = await axios.post(
        `${CASHFREE_PAYOUT_URL}/auth`,
        {},
        {
            headers: {
                'Content-Type': 'application/json',
                'X-Client-Id': process.env.CASHFREE_PAYOUTS_CLIENT_ID,
                'X-Client-Secret': process.env.CASHFREE_PAYOUTS_CLIENT_SECRET,
            },
        }
    );
    if (response.data?.data?.token) return response.data.data.token;
    throw new Error('Failed to authenticate with Cashfree Payouts.');
}

export async function POST(req: NextRequest) {
    try {
        // 1. Auth Check (Admin Only)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try {
            const idToken = authHeader.split('Bearer ')[1];
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            const userDoc = await db.collection('users').doc(decodedToken.uid).get();
            if (!userDoc.exists || !(userDoc.data()?.roles || []).includes('Admin')) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        } catch (e) {
            return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
        }

        // 2. Parse Inputs
        const { jobId, disputeId, resolution, splitPercentage } = await req.json(); // resolution: 'REFUND' | 'RELEASE' | 'SPLIT'

        if (!jobId || !resolution) return NextResponse.json({ error: 'Missing inputs' }, { status: 400 });

        // 3. Get Job & Transaction
        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await jobRef.get();
        if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        const job = jobSnap.data() as Job;

        const transQuery = db.collection('transactions')
            .where('jobId', '==', jobId)
            .where('status', 'in', ['Funded', 'Disputed'])
            .limit(1);
        const transSnap = await transQuery.get();

        if (transSnap.empty) {
            // If no money is held, just close the dispute/job.
            // But we should warn.
            await jobRef.update({ status: 'Cancelled', adminNotes: 'Admin resolved but no funds found.' });
            return NextResponse.json({ success: true, message: 'Job closed (No funds found).' });
        }

        const transaction = transSnap.docs[0].data() as Transaction;
        const totalAmount = transaction.amount; // Use amount or totalPaidByGiver? Amount is usually the escrow corpus.

        let refundAmount = 0;
        let payoutAmount = 0;

        // 4. Calculate Split
        if (resolution === 'REFUND') {
            refundAmount = totalAmount; // Admin Full Refund usually ignores cancellation fees if it's a dispute resolution
        } else if (resolution === 'RELEASE') {
            payoutAmount = totalAmount;
        } else if (resolution === 'SPLIT') {
            if (typeof splitPercentage !== 'number' || splitPercentage < 0 || splitPercentage > 100) {
                return NextResponse.json({ error: 'Invalid split percentage' }, { status: 400 });
            }
            // splitPercentage = % to Installer (Payout)
            // Remainder = % to Job Giver (Refund)
            payoutAmount = Math.floor(totalAmount * (splitPercentage / 100));
            refundAmount = totalAmount - payoutAmount;
        } else {
            return NextResponse.json({ error: 'Invalid resolution type' }, { status: 400 });
        }

        // 5. Execute
        const results = [];

        // A) Process Refund (PG API)
        if (refundAmount > 0) {
            try {
                await axios.post(
                    `${CASHFREE_PG_URL}/orders/${transaction.paymentGatewayOrderId}/refunds`,
                    {
                        refund_amount: refundAmount,
                        refund_id: `REF-DISPUTE-${jobId}-${Date.now()}`,
                        refund_note: `Dispute Resolution: ${resolution} (${refundAmount} to Giver)`
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'x-client-id': process.env.CASHFREE_PAYMENTS_CLIENT_ID,
                            'x-client-secret': process.env.CASHFREE_PAYMENTS_CLIENT_SECRET,
                            'x-api-version': '2022-09-01'
                        }
                    }
                );
                results.push('Refund initiated');
            } catch (e: any) {
                console.error("Refund failed", e?.response?.data || e);
                // Don't block the Payout if refund fails? Or block both? Risk of partial state.
                // For MVP, we log and proceed to try Payout (Independent rails). Admin can retry manually if needed.
                await logAdminAlert('CRITICAL', `Dispute Resolution Refund Failed: Job ${jobId}`, { error: e.message });
                results.push('Refund FAILED');
            }
        }

        // B) Process Payout (Payout API)
        if (payoutAmount > 0) {
            try {
                // Get Beneficiary
                let installerId = transaction.payeeId;
                if (job.awardedInstaller) {
                    installerId = typeof job.awardedInstaller === 'string'
                        ? job.awardedInstaller
                        : (job.awardedInstaller as any).id;
                }

                const installerSnap = await db.collection('users').doc(installerId).get();
                // Need to handle if awardedInstaller is Ref or String or Missing (use transaction payee)
                const beneId = installerSnap.data()?.payouts?.beneficiaryId;

                if (!beneId) throw new Error("Installer Beneficiary ID missing");

                const token = await getPayoutToken();
                await axios.post(
                    `${CASHFREE_PAYOUT_URL}/payouts/standard`,
                    {
                        beneId: beneId,
                        amount: payoutAmount.toFixed(2),
                        transferId: `PAYOUT-DISPUTE-${jobId}-${Date.now()}`
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                results.push('Payout initiated');
            } catch (e: any) {
                console.error("Payout failed", e?.response?.data || e);
                await logAdminAlert('CRITICAL', `Dispute Resolution Payout Failed: Job ${jobId}`, { error: e.message });
                results.push('Payout FAILED');
            }
        }

        // 6. Update DB
        const status = resolution === 'REFUND' ? 'Cancelled' : 'Completed'; // If Release or Split, essentially done. Only Refund is "Cancelled".

        await jobRef.update({
            status: status,
            resolutionMetadata: {
                resolution,
                refundAmount,
                payoutAmount,
                resolvedAt: new Date(),
                resolvedBy: 'Admin'
            }
        });

        await transSnap.docs[0].ref.update({
            status: 'Resolved',
            resolutionMetadata: {
                refundAmount,
                payoutAmount
            }
        });

        if (disputeId) {
            await db.collection('disputes').doc(disputeId).update({
                status: 'Resolved',
                resolution: `Admin Action: ${resolution}`,
                resolvedAt: new Date()
            });
        }

        await logAdminAlert('INFO', `Dispute Resolved: Job ${jobId} via ${resolution}`, { refundAmount, payoutAmount });

        // Phase 13: System Notifications (Email)
        // Notify Job Giver
        const giverSnap = await db.collection('users').doc(transaction.payerId).get();
        const giverEmail = giverSnap.data()?.email;
        if (giverEmail) {
            await sendServerEmail(giverEmail, `Dispute Resolved: ${job.title}`,
                `The dispute has been resolved by Admin.\nResolution: ${resolution}\nRefund: ₹${refundAmount}\nPayout: ₹${payoutAmount}\nStatus: ${status}`
            );
        }

        // Notify Installer
        const installerId = transaction.payeeId;
        const installerSnap = await db.collection('users').doc(installerId).get();
        const installerEmail = installerSnap.data()?.email;
        if (installerEmail) {
            await sendServerEmail(installerEmail, `Dispute Resolved: ${job.title}`,
                `The dispute has been resolved by Admin.\nResolution: ${resolution}\nYour Payout: ₹${payoutAmount}\nrefunded to Client: ₹${refundAmount}`
            );
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error("Dispute Resolve Error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
