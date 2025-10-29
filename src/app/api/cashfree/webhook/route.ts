
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, getDocs, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/server-init';
import { verifyWebhookSignature } from '@/lib/cashfree-utils';

/**
 * This webhook endpoint handles real-time notifications from Cashfree for both Payments and Payouts.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const data = JSON.parse(rawBody);
    console.log('Received Cashfree webhook:', JSON.stringify(data, null, 2));

    const signature = req.headers.get('x-webhook-signature');
    const timestamp = req.headers.get('x-webhook-timestamp');

    if (!signature || !timestamp) {
        console.error('Webhook signature or timestamp missing.');
        return NextResponse.json({ status: 'error', message: 'Signature missing' }, { status: 400 });
    }

    // --- Verify Webhook Signature ---
    const isValid = verifyWebhookSignature(rawBody, signature, timestamp);
    if (!isValid) {
        console.error('Invalid webhook signature.');
        return NextResponse.json({ status: 'error', message: 'Invalid signature' }, { status: 403 });
    }
    
    // --- Distinguish between different webhook types ---
    
    // 1. Handle Payment Gateway Webhook
    if (data.data?.order && (data.event_time && data.type?.includes("WEBHOOK"))) {
      const orderId = data.data.order.order_id;
      
      if (!orderId) {
        console.warn('Payment webhook received without an order_id.');
        return NextResponse.json({ status: 'error', message: 'Missing order_id' }, { status: 400 });
      }

      // Find the transaction in Firestore using the orderId. In our app, our internal transactionId is the orderId.
      const transactionRef = doc(db, "transactions", orderId);
      
      if (data.type === "PAYMENT_SUCCESS_WEBHOOK") {
         await updateDoc(transactionRef, {
            status: 'Funded',
            fundedAt: Timestamp.now(),
            paymentGatewayOrderId: data.data.order.order_id, // Redundant but good for audit
        });
        console.log(`[Webhook] Transaction ${orderId} successfully marked as 'Funded'.`);
      } else if (data.type === "PAYMENT_FAILED_WEBHOOK") {
         await updateDoc(transactionRef, {
            status: 'Failed',
            failedAt: Timestamp.now(),
        });
        console.log(`[Webhook] Transaction ${orderId} marked as 'Failed'.`);
      }
      
      return NextResponse.json({ status: 'success' });
    }

    // 2. Handle Payouts/Transfers Webhook (includes Easy Split settlements)
    if (data.event) {
        const { event, data: eventData } = data;
        
        // Handle Transfer (Payout/Refund) events
        if (event.startsWith('transfer_')) {
            const transferId = eventData?.transfer?.transferId;
            if (!transferId) {
                console.warn(`[Webhook] Payout event '${event}' received without a transferId.`);
                return NextResponse.json({ status: 'success', message: 'Acknowledged, but missing transferId.' });
            }
            
            // A transfer can be a payout or a refund, so we check both fields.
            const q = query(collection(db, 'transactions'), 
              where(transferId.startsWith('REFUND_') ? 'refundTransferId' : 'payoutTransferId', '==', transferId)
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.warn(`[Webhook] Payout/Refund for unknown transfer ID: ${transferId}`);
                return NextResponse.json({ status: 'success', message: 'Acknowledged, but no matching transfer found.' });
            }
            
            const transactionDoc = querySnapshot.docs[0];

            if (event === 'transfer_success') {
                const isRefund = transferId.startsWith('REFUND_');
                await updateDoc(transactionDoc.ref, {
                    status: isRefund ? 'Refunded' : 'Released',
                    [isRefund ? 'refundedAt' : 'releasedAt']: Timestamp.now(),
                });
                console.log(`[Webhook] Transaction for transfer ${transferId} successfully marked as '${isRefund ? 'Refunded' : 'Released'}'.`);
            } else if (event === 'transfer_failed' || event === 'transfer_reversed') {
                await updateDoc(transactionDoc.ref, {
                    status: 'Failed', // Mark as failed for admin review
                    failedAt: Timestamp.now(),
                });
                console.error(`[Webhook] Payout/Refund for transfer ${transferId} has failed or been reversed.`);
            }

            return NextResponse.json({ status: 'success' });
        }
        
        // Handle Beneficiary Validation events
        if (event.startsWith('bene_')) {
            const beneId = eventData?.beneficiary?.beneId;
            console.log(`[Webhook] Received beneficiary event '${event}' for beneId: ${beneId}`);
            // In a larger system, you might update the user's document here to reflect validation status.
            // e.g., updateDoc(userRef, { 'payouts.isVerified': true });
            return NextResponse.json({ status: 'success' });
        }
    }


    // If it's none of the above formats
    console.warn('[Webhook] Received webhook with unknown format or missing key fields.');
    return NextResponse.json({ status: 'success', message: 'Acknowledged, but format not recognized.' });

  } catch (error) {
    console.error('[Webhook] Error processing Cashfree webhook:', error);
    return NextResponse.json({ status: 'error', message: (error as Error).message }, { status: 500 });
  }
}
