import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, getDocs, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/server-init';

/**
 * This webhook endpoint handles real-time notifications from Cashfree for both Payments and Payouts.
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log('Received Cashfree webhook:', JSON.stringify(data, null, 2));

    // In production, you MUST verify the webhook signature to ensure it's from Cashfree.
    // For this demo, we are skipping signature verification.
    
    // --- Distinguish between Payments and Payouts webhooks ---
    
    // 1. Handle Payment Gateway Webhook
    if (data.event_time && data.data?.order) {
      const orderId = data.data.order.order_id;
      const paymentStatus = data.data.payment?.payment_status;

      if (!orderId) {
        console.warn('Payment webhook received without an order_id.');
        return NextResponse.json({ status: 'error', message: 'Missing order_id' }, { status: 400 });
      }

      // Find the transaction in Firestore using the orderId which is our transaction.id
      const q = query(collection(db, "transactions"), where("id", "==", orderId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
          console.warn(`Payment webhook for unknown transaction ID: ${orderId}`);
          return NextResponse.json({ status: 'success', message: 'Acknowledged, but no matching transaction found.' });
      }
          
      const transactionDoc = querySnapshot.docs[0];
      
      if (paymentStatus === 'SUCCESS') {
          await updateDoc(transactionDoc.ref, {
              status: 'Funded',
              fundedAt: Timestamp.now(),
          });
          console.log(`Transaction ${orderId} successfully marked as 'Funded'.`);
      } else if (paymentStatus === 'FAILED' || paymentStatus === 'USER_DROPPED') {
          await updateDoc(transactionDoc.ref, {
              status: 'Failed',
              failedAt: Timestamp.now(),
          });
          console.log(`Transaction ${orderId} marked as 'Failed'.`);
      }
      return NextResponse.json({ status: 'success' });
    }

    // 2. Handle Payouts Webhook
    if (data.event && data.transferId) {
        const { event, transferId, acknowledged } = data;
        
        // Find transaction by our internal ID, which we will correlate with transferId
        // This assumes we store transferId in our transaction doc, which we will do in the payout request
        const q = query(collection(db, 'transactions'), where('payoutTransferId', '==', transferId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn(`Payout webhook for unknown transfer ID: ${transferId}`);
            return NextResponse.json({ status: 'success', message: 'Acknowledged, but no matching transfer found.' });
        }
        
        const transactionDoc = querySnapshot.docs[0];

        if (event === 'TRANSFER_SUCCESS') {
            await updateDoc(transactionDoc.ref, {
                status: 'Released',
                releasedAt: Timestamp.now(),
            });
            console.log(`Transaction for transfer ${transferId} successfully marked as 'Released'.`);
        } else if (event === 'TRANSFER_FAILED' || event === 'TRANSFER_REVERSED') {
            await updateDoc(transactionDoc.ref, {
                status: 'Failed', // or a more specific status like 'Payout Failed'
                failedAt: Timestamp.now(),
            });
            console.error(`Payout for transfer ${transferId} has failed or been reversed.`);
        }
        
        return NextResponse.json({ status: 'success' });
    }


    // If it's neither a known Payment nor Payout webhook format
    console.warn('Webhook received with unknown format.');
    return NextResponse.json({ status: 'success', message: 'Acknowledged, but format not recognized.' });

  } catch (error) {
    console.error('Error processing Cashfree webhook:', error);
    return NextResponse.json({ status: 'error', message: (error as Error).message }, { status: 500 });
  }
}