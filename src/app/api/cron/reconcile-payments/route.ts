import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { cashfreeClient } from '@/domains/payments/cashfree.client';
import { logAdminAlert } from '@/lib/admin-logger';
import { Transaction } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        if (process.env.NODE_ENV === 'production' || process.env.CRON_SECRET) {
            const authHeader = req.headers.get('Authorization');
            if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const db = getAdminDb();
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        const stuckStatuses = ['reconciliation_required', 'payout_initiated', 'refund_initiated'];
        const results = [];
        
        for (const status of stuckStatuses) {
            const snapshot = await db.collection('transactions')
                .where('status', '==', status)
                .get();

            for (const doc of snapshot.docs) {
                const tx = doc.data() as Transaction & { updatedAt?: any };
                
                const updatedAt = tx.updatedAt ? tx.updatedAt.toDate() : (tx.createdAt as any).toDate();
                if (updatedAt > tenMinutesAgo && status !== 'reconciliation_required') {
                    continue; 
                }

                try {
                    let reconciled = false;
                    
                    if (status === 'payout_initiated' || status === 'reconciliation_required') {
                        if (tx.paymentGatewayOrderId) {
                            const settlements = await cashfreeClient.getSettlements(tx.paymentGatewayOrderId).catch(() => []);
                            if (settlements && settlements.length > 0) {
                                await doc.ref.update({ status: 'released', releasedAt: new Date() });
                                reconciled = true;
                                results.push({ id: doc.id, action: 'marked_released' });
                            }
                        }
                    }

                    if (!reconciled && (status === 'refund_initiated' || status === 'reconciliation_required')) {
                        if (tx.paymentGatewayOrderId && tx.id) {
                            const refundId = `refund_${tx.id}`;
                            const refundData = await cashfreeClient.getRefund(tx.paymentGatewayOrderId, refundId).catch(() => null);
                            
                            if (refundData && (refundData.refund_status === 'SUCCESS' || refundData.refund_status === 'PENDING')) {
                                await doc.ref.update({ status: 'refunded', refundedAt: new Date(), refundTransferId: refundId });
                                reconciled = true;
                                results.push({ id: doc.id, action: 'marked_refunded' });
                            }
                        }
                    }

                    if (!reconciled && status === 'reconciliation_required') {
                        await logAdminAlert('CRITICAL', `Transaction ${tx.id} requires manual reconciliation. Ext API check failed or returned negative.`);
                    }

                } catch (err: any) {
                    console.error(`Failed to reconcile ${doc.id}:`, err);
                    results.push({ id: doc.id, error: err.message });
                }
            }
        }

        return NextResponse.json({ success: true, processed: results.length, results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Reconciliation failed' }, { status: 500 });
    }
}
