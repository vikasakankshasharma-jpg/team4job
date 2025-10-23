
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/server-init'; // Assumes a server-side db instance

/**
 * This webhook endpoint handles real-time notifications from Cashfree.
 * When a payment is successfully completed, Cashfree sends a POST request here.
 * We then update the corresponding transaction record in Firestore.
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log('Received Cashfree webhook:', data);

    // This is a simplified example. In production, you would:
    // 1. Verify the webhook signature to ensure it's from Cashfree.
    // 2. Check the event type (e.g., 'PAYMENT_SUCCESS').
    // 3. Extract your internal order ID or transaction ID from the webhook payload.

    const orderId = data?.data?.order?.order_id; 
    
    if (data.event_type === 'PAYMENT_SUCCESS' && orderId) {
        // Find the transaction in Firestore using the orderId (which should be our transactionId)
        const q = query(collection(db, "transactions"), where("id", "==", orderId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const transactionDoc = querySnapshot.docs[0];
            await updateDoc(transactionDoc.ref, {
                status: 'Funded',
                fundedAt: new Date(),
            });
             console.log(`Transaction ${orderId} successfully marked as 'Funded'.`);
        } else {
            console.warn(`Webhook received for unknown transaction ID: ${orderId}`);
        }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error processing Cashfree webhook:', error);
    return NextResponse.json({ status: 'error', message: (error as Error).message }, { status: 500 });
  }
}
