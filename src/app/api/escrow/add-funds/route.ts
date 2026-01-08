
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/server-init';
import axios from 'axios';
import { logAdminAlert } from '@/lib/admin-logger';

const CASHFREE_API_BASE = 'https://sandbox.cashfree.com/pg';

export async function POST(req: NextRequest) {
    try {
        const { jobId, amount, description, userId, taskId } = await req.json();

        if (!jobId || !amount || !userId || amount <= 0) {
            return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
        }

        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await jobRef.get();

        if (!jobSnap.exists) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        const job = jobSnap.data();

        // Verify Job Giver
        if (typeof job?.jobGiver === 'string') {
            if (job.jobGiver !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        } else if (job?.jobGiver?.id !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const payload = {
            customer_details: {
                customer_id: userId,
                customer_phone: '9999999999', // In prod, fetch from User profile
                customer_name: 'Job Giver'
            },
            order_meta: {
                return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/jobs/${jobId}?payment=success`
            },
            order_id: transactionId,
            order_amount: amount,
            order_currency: 'INR',
            order_note: `Add-On Funds: ${description}`
        };

        const response = await axios.post(`${CASHFREE_API_BASE}/orders`, payload, {
            headers: {
                'x-client-id': process.env.CASHFREE_PAYMENTS_CLIENT_ID,
                'x-client-secret': process.env.CASHFREE_PAYMENTS_CLIENT_SECRET,
                'x-api-version': '2022-09-01'
            }
        });

        // Fetch Dynamic Platform Settings for Fee
        const settingsSnap = await db.collection('platform_settings').doc('config').get();
        const settings = settingsSnap.exists ? settingsSnap.data() : {};

        const jobGiverFeeRate = settings?.jobGiverFeeRate || 2.5;
        const installerCommissionRate = settings?.installerCommissionRate || 5; // Default 5% commission

        const jobGiverFee = Math.ceil(amount * (jobGiverFeeRate / 100)); // Charged ON TOP
        const commission = Math.ceil(amount * (installerCommissionRate / 100)); // Deducted FROM amount

        const totalPaidByGiver = amount + jobGiverFee;
        const installerPayout = amount - commission;

        // Create "Pending" Transaction Record
        await db.collection('transactions').doc(transactionId).set({
            id: transactionId,
            jobId: jobId,
            amount: amount,
            totalPaidByGiver: totalPaidByGiver,
            jobGiverFee: jobGiverFee,
            commission: commission,
            payoutToInstaller: installerPayout,
            installerAmount: amount, // Keeping purely for ref? Or remove? Types say 'amount' is base.
            status: 'Pending', // Waiting for Webhook
            type: 'AddOn',
            description: description,
            createdAt: new Date(),
            paymentGatewayOrderId: response.data.order_id,
            jobGiverId: userId,
            installerId: job?.awardedInstaller?.id || job?.awardedInstaller || null,
            relatedTaskId: taskId || null // Link to specific task if provided
        });

        // Log
        await logAdminAlert('INFO', `Add-On Funds Initiated: ₹${amount} for Job ${jobId}`, { jobId, amount });

        return NextResponse.json({ payment_session_id: response.data.payment_session_id });

    } catch (error: any) {
        console.error('Add Funds Init Error:', error.response?.data || error);
        return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 });
    }
}
