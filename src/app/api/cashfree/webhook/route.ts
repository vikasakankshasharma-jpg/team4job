
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, getDocs, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/server-init';

/**
 * This webhook endpoint handles real-time notifications from Cashfree.
 * When a payment is successfully completed, Cashfree sends a POST request here.
 * We then update the corresponding transaction record in Firestore.
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log('Received Cashfree webhook:', data);

    // In production, you MUST verify the webhook signature to ensure it's from Cashfree.
    // For this demo, we are skipping signature verification.
    
    const orderId = data?.data?.order?.order_id;
    const transactionStatus = data?.data?.payment?.payment_status;

    if (!orderId) {
      console.warn('Webhook received without an order_id.');
      return NextResponse.json({ status: 'error', message: 'Missing order_id' }, { status: 400 });
    }

    // Find the transaction in Firestore using the orderId
    const q = query(collection(db, "transactions"), where("id", "==", orderId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        console.warn(`Webhook received for unknown transaction ID: ${orderId}`);
        // Return a 200 OK even for unknown IDs to prevent Cashfree from retrying.
        return NextResponse.json({ status: 'success', message: 'Acknowledged, but no matching transaction found.' });
    }
        
    const transactionDoc = querySnapshot.docs[0];
    
    if (transactionStatus === 'SUCCESS') {
        await updateDoc(transactionDoc.ref, {
            status: 'Funded',
            fundedAt: Timestamp.now(),
        });
        console.log(`Transaction ${orderId} successfully marked as 'Funded'.`);
    } else if (transactionStatus === 'FAILED' || transactionStatus === 'USER_DROPPED') {
        await updateDoc(transactionDoc.ref, {
            status: 'Failed',
            failedAt: Timestamp.now(),
        });
        console.log(`Transaction ${orderId} marked as 'Failed'.`);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error processing Cashfree webhook:', error);
    return NextResponse.json({ status: 'error', message: (error as Error).message }, { status: 500 });
  }
}
