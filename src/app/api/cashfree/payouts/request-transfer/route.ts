
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/server-init';
import { User, Transaction, PlatformSettings } from '@/lib/types';
import axios from 'axios';

// This would be 'https://payout-api.cashfree.com' for production
const CASHFREE_API_BASE = 'https://payout-api.cashfree.com/payouts';

// Function to get the bearer token from Cashfree
async function getCashfreeBearerToken(): Promise<string> {
    const response = await axios.post(
        `${CASHFREE_API_BASE}/auth`,
        {}, // Empty body
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
    throw new Error('Failed to authenticate with Cashfree Payouts.');
}

async function getPlatformSettings(): Promise<PlatformSettings> {
    const settingsRef = doc(db, 'settings', 'platform');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
        return settingsSnap.data() as PlatformSettings;
    }
    // Return default values if settings are not configured
    return {
        installerCommissionRate: 10,
        jobGiverFeeRate: 2,
        proInstallerPlanPrice: 2999,
        businessJobGiverPlanPrice: 4999,
        bidBundle10: 500,
        bidBundle25: 1100,
        bidBundle50: 2000,
        defaultTrialPeriodDays: 30,
        freeBidsForNewInstallers: 10,
        freePostsForNewJobGivers: 3,
        pointsForJobCompletion: 50,
        pointsFor5StarRating: 20,
        pointsFor4StarRating: 10,
        penaltyFor1StarRating: -25,
        silverTierPoints: 500,
        goldTierPoints: 1000,
        platinumTierPoints: 2000,
        minJobBudget: 500,
        autoVerifyInstallers: true
    };
}

export async function POST(req: NextRequest) {
  try {
    const { transactionId, userId, transferType = 'payout' } = await req.json();

    if (!transactionId || !userId) {
      return NextResponse.json({ error: 'Missing transactionId or userId' }, { status: 400 });
    }

    // 1. Fetch platform settings and user/transaction details
    const platformSettings = await getPlatformSettings();
    const userRef = doc(db, 'users', userId);
    const transactionRef = doc(db, 'transactions', transactionId);

    const [userSnap, transactionSnap] = await Promise.all([
        getDoc(userRef),
        getDoc(transactionRef)
    ]);

    if (!userSnap.exists() || !transactionSnap.exists()) {
      return NextResponse.json({ error: 'User or Transaction not found' }, { status: 404 });
    }

    const user = userSnap.data() as User;
    const transaction = transactionSnap.data() as Transaction;
    
    if (transaction.status !== 'Funded') {
        return NextResponse.json({ error: 'Transaction is not in a payable state.' }, { status: 400 });
    }

    let beneficiaryId: string | undefined;
    let transferAmount: number;
    let transferIdPrefix: string;
    let updateField: 'payoutTransferId' | 'refundTransferId';
    
    // Determine if it's a payout to an installer or a refund to a job giver
    if (transferType === 'refund') {
        // For refunds, the beneficiary is the Job Giver (payer)
        const payerUserSnap = await getDoc(doc(db, 'users', transaction.payerId));
        const payerUser = payerUserSnap.data() as User;
        if (!payerUser || !payerUser?.payouts?.beneficiaryId) {
             return NextResponse.json({ error: 'Job Giver has not configured a bank account for refunds.' }, { status: 400 });
        }
        beneficiaryId = payerUser.payouts.beneficiaryId;
        transferAmount = transaction.amount; // Full refund amount
        transferIdPrefix = 'REFUND';
        updateField = 'refundTransferId';
    } else {
        // For standard payouts to the installer (payee)
        if (!user.payouts?.beneficiaryId) {
            return NextResponse.json({ error: 'Installer has not configured their bank account for payouts.' }, { status: 400 });
        }
        beneficiaryId = user.payouts.beneficiaryId;
        
        // Calculate the payout amount based on dynamic commission rate
        const commissionPercentage = platformSettings.installerCommissionRate || 10;
        const commissionDecimal = commissionPercentage / 100;
        transferAmount = transaction.amount * (1 - commissionDecimal);
        
        transferIdPrefix = 'PAYOUT';
        updateField = 'payoutTransferId';
    }


    // 2. Authenticate with Cashfree Payouts
    const token = await getCashfreeBearerToken();
    
    // 3. Prepare the transfer payload for Cashfree
    const transferId = `${transferIdPrefix}_${transactionId}`;
    const transferPayload = {
      beneId: beneficiaryId,
      amount: transferAmount.toFixed(2),
      transferId: transferId,
    };
    
    // 4. Make the API call to Cashfree to request the transfer
    await axios.post(
      `${CASHFREE_API_BASE}/payouts/standard`,
      transferPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    // 5. Store the transferId in our transaction for webhook correlation
    await updateDoc(transactionRef, {
        [updateField]: transferId,
    });
    
    // 6. Return success to the frontend.
    // The final status update will be handled by the webhook.
    return NextResponse.json({ success: true, transferId });

  } catch (error: any) {
    console.error(`Error requesting Cashfree ${req.body.transferType || 'payout'}:`, error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || 'Failed to request transfer.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
