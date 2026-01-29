// app/api/cashfree/webhook/route.ts - REFACTORED to use infrastructure

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { logger } from '@/infrastructure/logger';
import { verifyWebhookSignature } from '@/lib/cashfree-utils';
import { Transaction, User, SubscriptionPlan } from '@/lib/types';
import { toDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Cashfree webhook handler for Payments and Payouts
 * ✅ REFACTORED: Uses infrastructure logger and Firebase
 * 
 * CRITICAL: This handles real-time payment verification
 */
export async function POST(req: NextRequest) {
  try {
    const db = getAdminDb();
    const rawBody = await req.text();
    const data = JSON.parse(rawBody);

    logger.info('Cashfree webhook received', { eventType: data.type || data.event });

    const signature = req.headers.get('x-webhook-signature');
    const timestamp = req.headers.get('x-webhook-timestamp');

    if (!signature || !timestamp) {
      logger.error('Webhook signature or timestamp missing');
      return NextResponse.json(
        { status: 'error', message: 'Signature missing' },
        { status: 400 }
      );
    }

    // Verify webhook signature (SECURITY: Critical step)
    const isValid = verifyWebhookSignature(rawBody, signature, timestamp);
    if (!isValid) {
      logger.error('Invalid webhook signature - possible fraud attempt');
      return NextResponse.json(
        { status: 'error', message: 'Invalid signature' },
        { status: 403 }
      );
    }

    // Handle Payment Gateway Webhook
    if (data.data?.order && data.event_time && data.type?.includes('WEBHOOK')) {
      const orderId = data.data.order.order_id;

      if (!orderId) {
        logger.warn('Payment webhook received without order_id');
        return NextResponse.json(
          { status: 'error', message: 'Missing order_id' },
          { status: 400 }
        );
      }

      const transactionRef = db.collection('transactions').doc(orderId);
      const transactionSnap = await transactionRef.get();

      if (!transactionSnap.exists) {
        logger.warn(`Transaction not found for webhook`, { orderId });
        return NextResponse.json(
          { status: 'error', message: 'Transaction not found' },
          { status: 404 }
        );
      }

      const transaction = transactionSnap.data() as Transaction;

      if (data.type === 'PAYMENT_SUCCESS_WEBHOOK') {
        const startOtp = Math.floor(100000 + Math.random() * 900000).toString();

        await transactionRef.update({
          status: 'funded',
          fundedAt: Timestamp.now() as any,
          paymentGatewayOrderId: data.data.order.order_id,
        });

        // Sync job status & generate OTP
        if (transaction.jobId) {
          await db
            .collection('jobs')
            .doc(transaction.jobId)
            .update({
              status: 'In Progress',
              startOtp: startOtp,
            });

          logger.info('Job funded and moved to In Progress', {
            jobId: transaction.jobId,
            orderId,
          });
        }

        // Handle subscription activation
        if (
          transaction.transactionType === 'SUBSCRIPTION' &&
          transaction.planId &&
          transaction.payerId
        ) {
          const userRef = db.collection('users').doc(transaction.payerId);
          const planRef = db.collection('subscriptionPlans').doc(transaction.planId);

          const [userSnap, planSnap] = await Promise.all([
            userRef.get(),
            planRef.get(),
          ]);

          if (userSnap.exists && planSnap.exists) {
            const userData = userSnap.data() as User;
            const planData = planSnap.data() as SubscriptionPlan;

            const now = new Date();
            const currentExpiry =
              userData.subscription && toDate(userData.subscription.expiresAt) > now
                ? toDate(userData.subscription.expiresAt)
                : now;

            const newExpiryDate = new Date(currentExpiry);
            newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);

            await userRef.update({
              'subscription.planId': planData.id,
              'subscription.planName': planData.name,
              'subscription.expiresAt': Timestamp.fromDate(newExpiryDate) as any,
            });

            logger.info('Subscription activated', {
              userId: transaction.payerId,
              planName: planData.name,
            });
          }
        }

        logger.info('Payment successful', { orderId, transactionId: orderId });
      } else if (data.type === 'PAYMENT_FAILED_WEBHOOK') {
        await transactionRef.update({
          status: 'failed',
          failedAt: Timestamp.now() as any,
        });

        logger.error('Payment failed', { orderId });
      }

      return NextResponse.json({ status: 'success' });
    }

    // Handle Payouts/Transfers Webhook
    if (data.event) {
      const { event, data: eventData } = data;

      // Handle transfer events (payouts/refunds)
      if (event.startsWith('transfer_')) {
        const transferId = eventData?.transfer?.transferId;
        if (!transferId) {
          logger.warn(`Payout event '${event}' without transferId`);
          return NextResponse.json({
            status: 'success',
            message: 'Acknowledged, but missing transferId',
          });
        }

        const queryField = transferId.startsWith('REFUND_')
          ? 'refundTransferId'
          : 'payoutTransferId';
        const querySnapshot = await db
          .collection('transactions')
          .where(queryField, '==', transferId)
          .get();

        if (querySnapshot.empty) {
          logger.warn('Unknown transfer ID in webhook', { transferId });
          return NextResponse.json({
            status: 'success',
            message: 'Acknowledged, but no matching transfer found',
          });
        }

        const transactionDoc = querySnapshot.docs[0];

        if (event === 'transfer_success') {
          const isRefund = transferId.startsWith('REFUND_');
          await transactionDoc.ref.update({
            status: isRefund ? 'refunded' : 'released',
            [isRefund ? 'refundedAt' : 'releasedAt']: Timestamp.now() as any,
          });

          logger.info('Transfer successful', {
            transferId,
            type: isRefund ? 'refund' : 'payout',
          });
        } else if (event === 'transfer_failed' || event === 'transfer_reversed') {
          await transactionDoc.ref.update({
            status: 'failed',
            failedAt: Timestamp.now() as any,
          });

          logger.error('Transfer failed or reversed', { transferId, event });
        }

        return NextResponse.json({ status: 'success' });
      }

      // Handle beneficiary validation events
      if (event.startsWith('bene_')) {
        const beneId = eventData?.beneficiary?.beneId;
        logger.info('Beneficiary event received', { event, beneId });
        return NextResponse.json({ status: 'success' });
      }
    }

    // Unknown webhook format
    logger.warn('Webhook with unknown format received', { data });
    return NextResponse.json({
      status: 'success',
      message: 'Acknowledged, but format not recognized',
    });
  } catch (error) {
    logger.error('Cashfree webhook processing error', error);
    return NextResponse.json(
      { status: 'error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
