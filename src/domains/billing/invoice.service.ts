import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, User, SubscriptionPlan } from '@/lib/types';
import { format } from 'date-fns';

interface InvoiceData {
    invoiceNumber: string;
    date: Date;
    customerName: string;
    customerAddress?: string;
    customerGstin?: string;
    items: {
        description: string;
        amount: number;
        taxRate?: number; // percentage (e.g., 18 for 18%)
    }[];
    totalAmount: number;
    taxAmount: number;
    subtotal: number;
}

export class InvoiceService {

    generateInvoice(transaction: Transaction, user: User, plan?: SubscriptionPlan): void {
        const doc = new jsPDF();
        const invoiceNumber = `INV-${transaction.id.substring(0, 8).toUpperCase()}`;
        const date = transaction.createdAt ? new Date((transaction.createdAt as any).seconds * 1000) : new Date();

        // Company Logo/Header
        doc.setFontSize(20);
        doc.text('Team4Job', 14, 22);
        doc.setFontSize(10);
        doc.text('A Platform for Professional Services', 14, 28);
        doc.text('GSTIN: 27ABCDE1234F1Z5', 14, 33);
        doc.text('Mumbai, Maharashtra, India', 14, 38);

        // Invoice Details
        doc.setFontSize(10);
        doc.text(`Invoice No: ${invoiceNumber}`, 140, 22);
        doc.text(`Date: ${format(date, 'dd MMM yyyy')}`, 140, 28);
        doc.text(`Status: ${transaction.status.toUpperCase()}`, 140, 33);

        // Bill To
        doc.text('Bill To:', 14, 55);
        doc.setFontSize(11);
        doc.text(user.name, 14, 60);
        doc.setFontSize(10);
        if (user.address?.fullAddress) {
            const addressLines = doc.splitTextToSize(user.address.fullAddress, 80);
            doc.text(addressLines, 14, 65);
        }
        if (user.gstin) {
            doc.text(`GSTIN: ${user.gstin}`, 14, 80);
        }

        // Line Items
        const tableColumn = ["Description", "Amount (INR)"];
        const tableRows = [];

        let description = transaction.description || transaction.jobTitle || 'Service Fee';
        if (transaction.transactionType === 'SUBSCRIPTION' && plan) {
            description = `Subscription: ${plan.name}`;
        }

        tableRows.push([description, transaction.totalPaidByGiver.toFixed(2)]);

        (doc as any).autoTable({
            startY: 90,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { fontSize: 10, cellPadding: 3 },
        });

        // Totals
        const finalY = (doc as any).lastAutoTable.finalY || 90;

        doc.text(`Total Amount: Rs. ${transaction.totalPaidByGiver.toFixed(2)}`, 140, finalY + 10);
        doc.setFontSize(8);
        doc.text('This is a computer generated invoice.', 14, finalY + 30);

        // Save
        doc.save(`Invoice_${invoiceNumber}.pdf`);
    }
}

export const invoiceService = new InvoiceService();
