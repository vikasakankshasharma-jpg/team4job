
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
    if (data.type === 'PAYMENT_SUCCESS_WEBHOOK' && data.data?.order) {
      const orderId = data.data.order.order_id;
      
      if (!orderId) {
        console.warn('Payment webhook received without an order_id.');
        return NextResponse.json({ status: 'error', message: 'Missing order_id' }, { status: 400 });
      }

      // Find the transaction in Firestore using the orderId which is our transaction.id
      const transactionRef = doc(db, "transactions", orderId);
      
      await updateDoc(transactionRef, {
          status: 'Funded',
          fundedAt: Timestamp.now(),
          paymentGatewayOrderId: data.data.order.order_id,
      });
      console.log(`Transaction ${orderId} successfully marked as 'Funded'.`);
      
      return NextResponse.json({ status: 'success' });
    }

    if (data.type === 'PAYMENT_FAILED_WEBHOOK' && data.data?.order) {
        const orderId = data.data.order.order_id;
        const transactionRef = doc(db, "transactions", orderId);
        await updateDoc(transactionRef, {
            status: 'Failed',
            failedAt: Timestamp.now(),
        });
        console.log(`Transaction ${orderId} marked as 'Failed'.`);
        return NextResponse.json({ status: 'success' });
    }

    // 2. Handle Payouts/Transfers Webhook (Standard Transfer)
    if (data.event === 'transfer_success' || data.event === 'transfer_failed' || data.event === 'transfer_reversed') {
        const { event, data: transferData } = data;
        const transferId = transferData?.transfer?.transferId;
        
        if (!transferId) {
            console.warn('Payout webhook received without a transferId.');
            return NextResponse.json({ status: 'success', message: 'Acknowledged, but missing transferId.' });
        }
        
        // A transfer can be a payout or a refund, so we check both fields.
        const q = query(collection(db, 'transactions'), 
          where(transferId.startsWith('REFUND') ? 'refundTransferId' : 'payoutTransferId', '==', transferId)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn(`Payout/Refund webhook for unknown transfer ID: ${transferId}`);
            return NextResponse.json({ status: 'success', message: 'Acknowledged, but no matching transfer found.' });
        }
        
        const transactionDoc = querySnapshot.docs[0];

        if (event === 'transfer_success') {
            const isRefund = transferId.startsWith('REFUND');
            await updateDoc(transactionDoc.ref, {
                status: isRefund ? 'Refunded' : 'Released',
                [isRefund ? 'refundedAt' : 'releasedAt']: Timestamp.now(),
            });
            console.log(`Transaction for transfer ${transferId} successfully marked as '${isRefund ? 'Refunded' : 'Released'}'.`);
        } else if (event === 'transfer_failed' || event === 'transfer_reversed') {
            await updateDoc(transactionDoc.ref, {
                status: 'Failed', // or a more specific status like 'Payout Failed'
                failedAt: Timestamp.now(),
            });
            console.error(`Payout/Refund for transfer ${transferId} has failed or been reversed.`);
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
