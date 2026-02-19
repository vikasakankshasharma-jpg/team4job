import axios from 'axios';
import { logger } from '@/infrastructure/logger';

type OrderPayload = {
    orderId: string;
    orderAmount: number;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    description?: string;
};

type PayoutPayload = {
    beneficiaryId: string;
    amount: number;
    transferId: string;
    payoutMode?: string;
    remarks?: string;
};

type RefundPayload = {
    orderId: string;
    refundAmount: number;
    refundId: string;
    reason?: string;
};

const paymentsBaseUrl =
    process.env.CASHFREE_ENV === 'production'
        ? 'https://api.cashfree.com'
        : 'https://sandbox.cashfree.com';
const payoutsBaseUrl = 'https://payout-gamma.cashfree.com/payouts';

const getPaymentCredentials = () => {
    const clientId = process.env.CASHFREE_PAYMENTS_CLIENT_ID;
    const secret = process.env.CASHFREE_PAYMENTS_CLIENT_SECRET;

    if (!clientId || !secret) {
        throw new Error('Cashfree payment credentials missing');
    }

    return { clientId, secret };
};

const getPayoutCredentials = () => {
    const clientId = process.env.CASHFREE_PAYOUTS_CLIENT_ID;
    const secret = process.env.CASHFREE_PAYOUTS_CLIENT_SECRET;

    if (!clientId || !secret) {
        throw new Error('Cashfree payout credentials missing');
    }

    return { clientId, secret };
};

let cachedPayoutToken: { value: string; expiresAt: number } | null = null;

async function getPayoutBearerToken(): Promise<string> {
    if (cachedPayoutToken && cachedPayoutToken.expiresAt > Date.now()) {
        return cachedPayoutToken.value;
    }

    const creds = getPayoutCredentials();
    const resp = await axios.post(
        `${payoutsBaseUrl}/auth`,
        {},
        {
            headers: {
                'Content-Type': 'application/json',
                'X-Client-Id': creds.clientId,
                'X-Client-Secret': creds.secret,
            },
        }
    );

    const token = resp.data?.data?.token;
    const expiresIn = resp.data?.data?.expiresIn || 3600; // seconds

    if (!token) {
        throw new Error('Failed to obtain Cashfree payout token');
    }

    cachedPayoutToken = {
        value: token,
        expiresAt: Date.now() + expiresIn * 1000 - 60 * 1000, // refresh 1 min early
    };

    return token;
}

export class CashfreeClient {
    private getPaymentHeaders() {
        const creds = getPaymentCredentials();
        return {
            'Content-Type': 'application/json',
            'x-client-id': creds.clientId,
            'x-client-secret': creds.secret,
        };
    }

    private formatAmount(amount: number) {
        return amount.toFixed(2);
    }

    async createOrder(payload: OrderPayload): Promise<{ orderToken: string; orderId: string }> {
        const requestBody = {
            order_id: payload.orderId,
            order_amount: this.formatAmount(payload.orderAmount),
            order_currency: 'INR',
            order_note: payload.description || 'Team4Job payment',
            customer_details: {
                customer_id: payload.customerEmail,
                customer_email: payload.customerEmail,
                customer_name: payload.customerName,
                customer_phone: payload.customerPhone || '0000000000',
            },
        };

        const resp = await axios.post(`${paymentsBaseUrl}/pg/orders`, requestBody, {
            headers: this.getPaymentHeaders(),
        });

        if (resp.data?.status !== 'OK') {
            logger.error('Cashfree order creation failed', resp.data);
            throw new Error(resp.data?.message || 'Cashfree order creation failed');
        }

        return {
            orderId: resp.data.order_id || payload.orderId,
            orderToken: resp.data.payment_session_id || resp.data.order_token,
        };
    }

    async verifyPayment(orderId: string): Promise<{ status: string; amount: number }> {
        const resp = await axios.get(`${paymentsBaseUrl}/pg/orders/${orderId}`, {
            headers: this.getPaymentHeaders(),
        });

        if (resp.data?.order_status !== 'PAID' && resp.data?.order_status !== 'SUCCESS') {
            logger.warn('Cashfree payment status check returned non-success', resp.data);
        }

        return {
            status: resp.data?.order_status || resp.data?.status || 'UNKNOWN',
            amount: Number(resp.data?.order_amount || 0),
        };
    }

    async createPayout(payload: PayoutPayload): Promise<{ transferId: string; status: string }> {
        const token = await getPayoutBearerToken();

        const resp = await axios.post(
            `${payoutsBaseUrl}/standard`,
            {
                beneId: payload.beneficiaryId,
                amount: this.formatAmount(payload.amount),
                transferId: payload.transferId,
                payoutMode: payload.payoutMode || 'IMPS',
                remarks: payload.remarks || 'Team4Job payout',
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (resp.data?.status !== 'SUCCESS' && resp.data?.status !== 'PAYOUT_INITIATED') {
            logger.warn('Cashfree payout call returned unexpected status', resp.data);
        }

        return {
            transferId: resp.data?.transferId || payload.transferId,
            status: resp.data?.status || 'UNKNOWN',
        };
    }

    async processRefund(payload: RefundPayload): Promise<{ refundId: string; status: string }> {
        const resp = await axios.post(
            `${paymentsBaseUrl}/pg/orders/${payload.orderId}/refunds`,
            {
                refund_amount: this.formatAmount(payload.refundAmount),
                refund_id: payload.refundId,
                refund_note: payload.reason || 'Team4Job refund',
            },
            {
                headers: this.getPaymentHeaders(),
            }
        );

        if (resp.data?.status !== 'OK') {
            logger.error('Cashfree refund failed', resp.data);
            throw new Error(resp.data?.message || 'Cashfree refund failed');
        }

        return {
            refundId: resp.data?.refund_id || payload.refundId,
            status: resp.data?.status,
        };
    }
}

export const cashfreeClient = new CashfreeClient();
