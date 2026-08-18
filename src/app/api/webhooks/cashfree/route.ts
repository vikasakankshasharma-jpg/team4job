import { NextRequest, NextResponse } from 'next/server';
import { cashfreeClient } from '@/domains/payments/cashfree.client';
import { paymentService } from '@/domains/payments/payment.service';


export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('x-webhook-signature');
        const timestamp = req.headers.get('x-webhook-timestamp');

        if (!signature || !timestamp) {
            // Cashfree UI Test pings might not include a valid signature
            return NextResponse.json({ message: 'Ping acknowledged' }, { status: 200 });
        }

        const isValid = cashfreeClient.verifyWebhookSignature(signature, rawBody, timestamp);

        if (!isValid) {
            // Soft fail: Return 200 so Cashfree UI tests pass, but safely ignore the payload
            return NextResponse.json({ message: 'Ignored invalid signature' }, { status: 200 });
        }

        const body = JSON.parse(rawBody);
        const eventType = body.event_type;



        // Handle Payment Success
        if (eventType === 'PAYMENT_SUCCESS_WEBHOOK') {
            const orderId = body.data.order.order_id;
            await paymentService.verifyPayment(orderId);

            // Note: verifyPayment fetches the latest state from Cashfree API for extra safety

        }

        // Handle Payout Updates (Optional but recommended for Phase 8)
        if (eventType === 'TRANSFER_SUCCESS') {
            const transferId = body.data.transfer_id;
            await paymentService.recordPayoutSuccess(transferId);

        }

        return NextResponse.json({ status: 'OK' });

    } catch (error: any) {

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
