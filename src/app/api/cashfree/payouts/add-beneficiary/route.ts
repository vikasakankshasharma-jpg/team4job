
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/server-init';
import { User } from '@/lib/types';
import axios from 'axios';

// This would be 'https://payout-api.cashfree.com' for production
const CASHFREE_API_BASE = 'https://payout-api.cashfree.com/payouts';

// Function to get the bearer token from Cashfree
async function getCashfreeBearerToken(): Promise<string> {
    const response = await axios.post(
        `${CASHFREE_API_BASE}/auth`,
        {}, // Empty body for client credentials grant
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

export async function POST(req: NextRequest) {
  try {
    const { userId, accountHolderName, accountNumber, ifsc } = await req.json();

    if (!userId || !accountHolderName || !accountNumber || !ifsc) {
      return NextResponse.json({ error: 'Missing required beneficiary details' }, { status: 400 });
    }

    // 1. Fetch user details from Firestore
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const user = userSnap.data() as User;

    // 2. Generate a unique beneficiary ID
    const beneficiaryId = `INSTALLER_${userId.slice(0, 8)}_${Date.now()}`;

    // 3. Authenticate with Cashfree to get a bearer token
    const token = await getCashfreeBearerToken();

    // 4. Prepare the beneficiary payload for Cashfree
    const beneficiaryPayload = {
      beneId: beneficiaryId,
      name: accountHolderName,
      email: user.email,
      phone: user.mobile,
      bankAccount: accountNumber,
      ifsc: ifsc,
      address1: user.address.street || "Not Provided",
    };
    
    // 5. Make the API call to Cashfree to add the beneficiary
    await axios.post(
      `${CASHFREE_API_BASE}/beneficiaries`,
      beneficiaryPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    // 6. If successful, store the beneficiaryId and masked account number in our DB
    const lastFourDigits = accountNumber.slice(-4);
    const maskedAccountNumber = `**** **** ${lastFourDigits}`;

    await updateDoc(userRef, {
        'payouts.beneficiaryId': beneficiaryId,
        'payouts.accountHolderName': accountHolderName,
        'payouts.accountNumberMasked': maskedAccountNumber,
        'payouts.ifsc': ifsc,
    });
    
    // 7. Return success to the frontend
    return NextResponse.json({ success: true, beneficiaryId });

  } catch (error: any) {
    console.error('Error adding Cashfree beneficiary:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || 'Failed to add beneficiary.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
