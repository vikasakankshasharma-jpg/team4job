import { NextRequest, NextResponse } from 'next/server';
import { cashfreeClient } from '@/domains/payments/cashfree.client';
import { paymentService } from '@/domains/payments/payment.service';
import { logger } from '@/infrastructure/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('x-webhook-signature');
        const timestamp = req.headers.get('x-webhook-timestamp');

        if (!signature || !timestamp) {
            logger.warn('Missing Cashfree webhook headers');
            return NextResponse.json({ error: 'Missing headers' }, { status: 400 });
        }

        const isValid = cashfreeClient.verifyWebhookSignature(signature, rawBody, timestamp);

        if (!isValid) {
            logger.error('Invalid Cashfree webhook signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const body = JSON.parse(rawBody);
        const eventType = body.event_type;

        logger.info('Cashfree webhook received', { eventType, orderId: body.data?.order?.order_id });

        // Handle Payment Success
        if (eventType === 'PAYMENT_SUCCESS_WEBHOOK') {
            const orderId = body.data.order.order_id;
            await paymentService.verifyPayment(orderId);

            // Note: verifyPayment fetches the latest state from Cashfree API for extra safety
            logger.info('Payment success processed via webhook', { orderId });
        }

        // Handle Payout Updates (Optional but recommended for Phase 8)
        if (eventType === 'TRANSFER_SUCCESS') {
            const transferId = body.data.transfer_id;
            await paymentService.recordPayoutSuccess(transferId);
            logger.info('Payout success processed via webhook', { transferId });
        }

        return NextResponse.json({ status: 'OK' });

    } catch (error: any) {
        logger.error('Cashfree webhook processing failed', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
