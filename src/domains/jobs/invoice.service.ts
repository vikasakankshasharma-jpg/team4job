// domains/jobs/invoice.service.ts

import { getAdminDb } from '@/infrastructure/firebase/admin';
import { Job, Transaction, User } from '@/lib/types';

export type InvoiceData = {
    job: Job & { client?: User; awardedProfessional?: User };
    transaction: Transaction | null;
};

export class InvoiceService {
    /**
     * Fetch all data required for generating or displaying an invoice
     */
    async getInvoiceData(jobId: string): Promise<InvoiceData> {
        const db = getAdminDb();
        const jobDoc = await db.collection('jobs').doc(jobId).get();

        if (!jobDoc.exists) {
            throw new Error('Job not found');
        }

        const jobData = jobDoc.data() as Job;

        // 1. Fetch Transaction (if it exists)
        // Check for statuses that usually have transactions associated
        let transaction = null;
        const relevantStatuses = ['completed', 'Completed', 'Pending Funding', 'funded', 'In Progress', 'work_submitted', 'Pending Confirmation', 'disputed'];

        if (relevantStatuses.includes(jobData.status)) {
            const txSnapshot = await db.collection('transactions')
                .where('jobId', '==', jobId)
                .limit(1)
                .get();

            if (!txSnapshot.empty) {
                transaction = txSnapshot.docs[0].data() as Transaction;
            }
        }

        // 2. Expand Client and Professional for Invoice Details
        const expandedJob = { ...jobData } as any;

        if (jobData.clientId) {
            const giverSnap = await db.collection('users').doc(jobData.clientId).get();
            if (giverSnap.exists) {
                expandedJob.client = { id: giverSnap.id, ...giverSnap.data() } as User;
            }
        }

        const professionalId = jobData.awardedProfessionalId || (typeof jobData.awardedProfessional === 'string' ? jobData.awardedProfessional : jobData.awardedProfessional?.id);

        if (professionalId) {
            const ProfessionalSnap = await db.collection('users').doc(professionalId).get();
            if (ProfessionalSnap.exists) {
                expandedJob.awardedProfessional = { id: ProfessionalSnap.id, ...ProfessionalSnap.data() } as User;
            }
        }

        return {
            job: expandedJob,
            transaction
        };
    }

    /**
     * Future placeholder for PDF generation
     */
    async generateInvoicePdf(jobId: string): Promise<Buffer> {
        throw new Error('Not implemented');
    }
}

export const invoiceService = new InvoiceService();
