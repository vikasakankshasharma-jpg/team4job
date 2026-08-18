import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb, getAdminAuth } from '@/infrastructure/firebase/admin';
import { User, Transaction, Job, PlatformSettings } from '@/lib/types';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const CASHFREE_API_BASE = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'PRODUCTION' ? 'https://payout-api.cashfree.com/payouts' : 'https://payout-gamma.cashfree.com/payouts';

async function getCashfreeBearerToken(): Promise<string> {
  const response = await axios.post(
    `${CASHFREE_API_BASE}/auth`,
    {},
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': process.env.CASHFREE_PAYOUTS_CLIENT_ID,
        'X-Client-Secret': process.env.CASHFREE_PAYOUTS_CLIENT_SECRET,
      },
    }
  );
  if (response.data?.data?.token) {
    return response.data.data.token;
  }
  throw new Error('Failed to authenticate with Cashfree Payouts');
}

/**
 * Escrow Dispute Resolution API
 * Handles Admin resolutions: REFUND (to client), RELEASE (to professional), or SPLIT
 */
export async function POST(req: NextRequest) {
  try {
    const db = getAdminDb();
    const adminAuth = getAdminAuth();

    // 1. Verify authentication & admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    if (decodedToken.admin !== true && decodedToken.role !== 'Admin') {
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.data() as User;
      if (!userData || !userData.roles.includes('Admin')) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    // 2. Parse request
    const { jobId, disputeId, resolution, splitPercentage, adminNotes } = await req.json();

    if ((!jobId && !disputeId) || !resolution) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let targetJobId = jobId;
    let disputeRef = null;
    let disputeData = null;

    if (disputeId) {
      disputeRef = db.collection('disputes').doc(disputeId);
      const dispSnap = await disputeRef.get();
      if (dispSnap.exists) {
        disputeData = dispSnap.data();
        if (disputeData?.jobId) targetJobId = disputeData.jobId;
      }
    }

    if (!targetJobId) {
      return NextResponse.json({ error: 'Cannot determine Job ID' }, { status: 400 });
    }

    // 3. Find Transaction & Job
    const jobRef = db.collection('jobs').doc(targetJobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    const jobData = jobSnap.data() as Job;

    const txSnap = await db.collection('transactions')
      .where('jobId', '==', targetJobId)
      .where('status', 'in', ['funded', 'disputed'])
      .limit(1)
      .get();

    if (txSnap.empty) {
      return NextResponse.json({ error: 'No active funded transaction found for this job' }, { status: 404 });
    }

    const transactionDoc = txSnap.docs[0];
    const transaction = transactionDoc.data() as Transaction;

    // 4. Determine splits
    let clientRefundAmount = 0;
    let professionalPayoutAmount = 0;
    const totalAmount = transaction.amount;

    if (resolution === 'REFUND') {
      clientRefundAmount = totalAmount;
    } else if (resolution === 'RELEASE') {
      professionalPayoutAmount = totalAmount;
    } else if (resolution === 'SPLIT') {
      const proShare = splitPercentage || 50; // Defaults to 50% if not specified
      professionalPayoutAmount = (totalAmount * proShare) / 100;
      clientRefundAmount = totalAmount - professionalPayoutAmount;
    } else {
      return NextResponse.json({ error: 'Invalid resolution type' }, { status: 400 });
    }

    const isManualMode = process.env.NEXT_PUBLIC_PAYOUT_MODE === 'MANUAL';
    let token = '';
    if (!isManualMode) {
      token = await getCashfreeBearerToken();
    }

    // 5. Process Payout (if any)
    if (professionalPayoutAmount > 0 && transaction.payeeId) {
      const proUserSnap = await db.collection('users').doc(transaction.payeeId).get();
      const proUser = proUserSnap.data() as User;
      
      if (!proUser?.payouts?.beneficiaryId && !isManualMode) {
        return NextResponse.json({ error: 'Professional does not have a beneficiary account set up' }, { status: 400 });
      }

      // Deduct commission
      let commissionRate = 0.1;
      try {
        const settingsSnap = await db.collection('platform_settings').doc('fees').get();
        if (settingsSnap.exists) {
          commissionRate = (settingsSnap.data() as PlatformSettings).professionalCommissionRate || 0.1;
        }
      } catch (e) {}

      const commission = transaction.commission || (professionalPayoutAmount * commissionRate);
      const finalTransfer = professionalPayoutAmount - commission;

      payoutTransferId = isManualMode ? `MANUAL_PAYOUT_${transaction.id}_${Date.now()}` : `PAYOUT_${transaction.id}_${Date.now()}`;
      
      if (!isManualMode) {
        await axios.post(`${CASHFREE_API_BASE}/payouts/standard`, {
          beneId: proUser.payouts.beneficiaryId,
          amount: finalTransfer.toFixed(2),
          transferId: payoutTransferId,
        }, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
      }
    }

    // 6. Process Refund (if any)
    if (clientRefundAmount > 0 && transaction.payerId) {
      const clientUserSnap = await db.collection('users').doc(transaction.payerId).get();
      const clientUser = clientUserSnap.data() as User;
      
      if (clientUser?.payouts?.beneficiaryId || isManualMode) {
        refundTransferId = isManualMode ? `MANUAL_REFUND_${transaction.id}_${Date.now()}` : `REFUND_${transaction.id}_${Date.now()}`;
        if (!isManualMode) {
          await axios.post(`${CASHFREE_API_BASE}/payouts/standard`, {
            beneId: clientUser.payouts.beneficiaryId,
            amount: clientRefundAmount.toFixed(2),
            transferId: refundTransferId,
          }, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
        }
      } else {
        console.warn(`Client ${transaction.payerId} lacks beneficiary for refund via payouts.`);
      }
    }

    // 7. Update Documents
    let newStatus = resolution === 'SPLIT' ? 'split_resolved' : (resolution === 'REFUND' ? 'refunded' : 'released');
    if (isManualMode && (professionalPayoutAmount > 0 || clientRefundAmount > 0)) {
        newStatus = 'payout_pending';
    }

    const txUpdateData: any = {
      status: newStatus,
      resolvedAt: Timestamp.now(),
      resolvedBy: decodedToken.uid
    };
    if (refundTransferId) txUpdateData.refundTransferId = refundTransferId;
    if (payoutTransferId) txUpdateData.payoutTransferId = payoutTransferId;

    await transactionDoc.ref.update(txUpdateData);
    await jobRef.update({ status: resolution === 'REFUND' ? 'Cancelled' : 'Completed' });

    if (disputeRef) {
      await disputeRef.update({
        status: 'Resolved',
        resolution: resolution,
        adminNotes: adminNotes || 'Resolved by admin',
        resolvedAt: Timestamp.now()
      });
    }

    // Event Audit Logging
    await db.collection('activities').add({
      type: 'dispute_resolved',
      userId: transaction.payerId, // Notify Client
      title: 'Dispute Resolved',
      description: `Job "${jobData.title}" dispute resolved: ${resolution}`,
      timestamp: Timestamp.now(),
      link: `/dashboard/disputes/${disputeId || targetJobId}`
    });
    
    await db.collection('activities').add({
      type: 'dispute_resolved',
      userId: transaction.payeeId, // Notify Professional
      title: 'Dispute Resolved',
      description: `Job "${jobData.title}" dispute resolved: ${resolution}`,
      timestamp: Timestamp.now(),
      link: `/dashboard/disputes/${disputeId || targetJobId}`
    });

    return NextResponse.json({ success: true, resolution, refundTransferId, payoutTransferId });
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to resolve dispute';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
