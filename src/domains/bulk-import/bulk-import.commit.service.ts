import { getAdminDb } from '@/infrastructure/firebase/admin';
import { bulkImportRepository } from './bulk-import.repository';
import { dealerMemoryService } from '@/domains/dealers/dealer-memory.service';
import { StagedImportRow, CommitCommand } from './bulk-import.types';
import * as crypto from 'crypto';

export class BulkImportCommitService {
    private get db() {
        return getAdminDb();
    }

    async commitBatch(dealerId: string, batchId: string, idempotencyKey: string): Promise<void> {
        // Idempotency lock
        const batchRef = this.db.collection('dealers').doc(dealerId).collection('import_batches').doc(batchId);
        
        const success = await this.db.runTransaction(async (t) => {
            const doc = await t.get(batchRef);
            if (!doc.exists) throw new Error("Batch not found");
            const batch = doc.data();
            
            if (batch?.status === 'PROCESSING' || batch?.status === 'COMPLETED') {
                return false; // Already processing/completed
            }
            
            // Check preview hash to prevent IMPORT_STALE (simulated by checking status CONFIRMED)
            if (batch?.status !== 'CONFIRMED' && batch?.status !== 'PARTIALLY_COMPLETED') {
                throw new Error("Batch must be explicitly CONFIRMED before commit. IMPORT_STALE.");
            }
            
            t.update(batchRef, { status: 'PROCESSING', idempotencyKey });
            return true;
        });

        if (!success) return; // Silent return for idempotency

        let lastDocId: string | undefined = undefined;
        let hasFailures = false;
        
        while (true) {
            const rows = await bulkImportRepository.getStagedRows(dealerId, batchId, lastDocId, 500);
            if (rows.length === 0) break;
            
            for (const row of rows) {
                // If row already has an audit record, skip it (Resuming after partial failure)
                const existingAudit = await bulkImportRepository.getRowAudit(dealerId, batchId, row.id);
                if (existingAudit && existingAudit.status === 'IMPORTED') continue;

                if (!row.isReadyForCommit || row.validationErrors.length > 0) {
                    await bulkImportRepository.saveRowAudit(dealerId, batchId, row.id, {
                        status: 'SKIPPED',
                        errorMessage: 'Row not ready or has validation errors'
                    });
                    hasFailures = true;
                    continue;
                }

                try {
                    await this.commitSingleRow(dealerId, row);
                    await bulkImportRepository.saveRowAudit(dealerId, batchId, row.id, {
                        status: 'IMPORTED'
                    });
                } catch (e: any) {
                    hasFailures = true;
                    await bulkImportRepository.saveRowAudit(dealerId, batchId, row.id, {
                        status: 'FAILED',
                        errorMessage: e.message
                    });
                }
            }
            
            lastDocId = rows[rows.length - 1].id;
        }

        await bulkImportRepository.updateBatchStatus(dealerId, batchId, {
            status: hasFailures ? 'PARTIALLY_COMPLETED' : 'COMPLETED',
            completedAt: new Date() as any
        });
    }

    private async commitSingleRow(dealerId: string, row: StagedImportRow): Promise<string> {
        // Re-resolve or just use the staging intent. 
        // We will execute the intent securely.

        let finalCustomerId = row.resolvedCustomerId;
        if (row.customerResolutionStatus === 'NEW') {
            if (!row.customerName || !row.customerPhone) throw new Error("Missing required customer info");
            // Check if it got created by a previous row in this batch
            try {
                const newCust = await dealerMemoryService.createCustomer(dealerId, {
                    name: row.customerName,
                    phone: row.customerPhone,
                    email: '',
                    externalRef: row.customerExternalRef || ''
                });
                finalCustomerId = newCust.id;
            } catch (e: any) {
                // if it failed because it already exists (from another row), we must fetch it
                if (e.message.includes("already exists")) {
                    const snap = await this.db.collection('dealers').doc(dealerId).collection('customers')
                        .where('phone', '==', row.customerPhone).limit(1).get();
                    if (!snap.empty) finalCustomerId = snap.docs[0].id;
                    else throw e;
                } else {
                    throw e;
                }
            }
        }

        let finalSiteId = row.resolvedSiteId;
        if (row.siteResolutionStatus === 'NEW') {
            if (!row.siteName || !row.siteAddress) throw new Error("Missing required site info");
            try {
                const newSite = await dealerMemoryService.createServiceSite(dealerId, {
                    name: row.siteName,
                    address: { street: '', city: row.siteAddress, zipCode: '', country: '', coordinates: {latitude:0, longitude:0} },
                    fullAddress: row.siteAddress,
                    externalRef: row.siteExternalRef || '',
                    customerId: finalCustomerId
                });
                finalSiteId = newSite.id;
            } catch (e: any) {
                if (e.message.includes("already exists")) {
                    const snap = await this.db.collection('dealers').doc(dealerId).collection('serviceSites')
                        .where('customerId', '==', finalCustomerId).where('name', '==', row.siteName).limit(1).get();
                    if (!snap.empty) finalSiteId = snap.docs[0].id;
                    else throw e;
                } else {
                    throw e;
                }
            }
        }

        // Job Generation
        // FORCE SERVER-CONTROLLED DRAFT, OVERRIDE ANYTHING ELSE
        const schedDate = (row.scheduledDate as any).toDate ? (row.scheduledDate as any).toDate() : new Date(row.scheduledDate);
        const dateStr = schedDate.toISOString().split('T')[0];
        const fingerprint = crypto.createHash('sha256').update(`${dealerId}_${finalCustomerId}_${finalSiteId}_${row.category}_${dateStr}`).digest('hex');

        // Check fingerprint again to be strictly idempotent
        const exist = await this.db.collection('jobs').where('dealerId', '==', dealerId).where('fingerprint', '==', fingerprint).limit(1).get();
        if (!exist.empty && exist.docs[0].data().externalRef === row.jobExternalRef) {
            // Already created
            return exist.docs[0].id;
        }

        const jobRef = this.db.collection('jobs').doc(); // Server generated ID. Ignore CSV jobId.
        await jobRef.set({
            id: jobRef.id,
            dealerId,
            serviceLocationId: finalSiteId,
            title: row.title,
            description: row.description,
            jobCategory: row.category,
            scheduledDate: row.scheduledDate,
            externalRef: row.jobExternalRef || null,
            fingerprint,
            
            // SECURITY FIREWALL: Hardcode Draft State
            status: 'DRAFT',
            paymentStatus: 'not_applicable',
            awardedProfessionalId: null,
            budget: null,
            b2bPrice: null,
            dealerMargin: null,
            
            createdAt: new Date(),
            updatedAt: new Date()
        });

        return jobRef.id;
    }
}

export const bulkImportCommitService = new BulkImportCommitService();
