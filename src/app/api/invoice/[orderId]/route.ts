import { NextResponse } from 'next/server';
import { getAdminDb } from '@/infrastructure/firebase/admin';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const db = getAdminDb();
        const resolvedParams = await params;
        const orderId = resolvedParams.orderId;

        // Fetch transaction details
        const txSnapshot = await db.collection('transactions').where('orderId', '==', orderId).limit(1).get();
        if (txSnapshot.empty) {
            return new NextResponse('Transaction not found', { status: 404 });
        }

        const tx = txSnapshot.docs[0].data();

        // Very basic stub for invoice PDF generation
        // In a real app, you would use jspdf or @react-pdf/renderer here
        // to generate a buffer of PDF data and return it with 'application/pdf' content type.

        const htmlInvoice = `
        <html>
            <head>
                <title>Invoice ${orderId}</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; }
                    .header { text-align: center; margin-bottom: 40px; }
                    .table { width: 100%; border-collapse: collapse; }
                    .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    .table th { background-color: #f8f9fa; }
                    .total { text-align: right; font-weight: bold; margin-top: 20px; font-size: 1.2em; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>INVOICE</h1>
                    <p>Order ID: ${orderId}</p>
                    <p>Date: ${new Date((tx.createdAt?._seconds || Date.now()/1000) * 1000).toLocaleDateString()}</p>
                </div>
                
                <table class="table">
                    <tr>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>
                    <tr>
                        <td>Payment for Job #${tx.jobId}</td>
                        <td>₹${tx.amount}</td>
                    </tr>
                </table>
                
                <div class="total">
                    Total Paid: ₹${tx.amount}
                </div>
                
                <div style="margin-top: 50px; font-size: 0.9em; color: #666; text-align: center;">
                    <p>Thank you for using Team4Job!</p>
                </div>
            </body>
        </html>
        `;

        return new NextResponse(htmlInvoice, {
            headers: {
                'Content-Type': 'text/html',
                // 'Content-Disposition': `attachment; filename="invoice-${orderId}.pdf"` // If it was PDF
            }
        });
    } catch (error: any) {
        console.error('Invoice error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
