import { getAdminDb } from '@/infrastructure/firebase/admin';
import { ImportBatch, StagedImportRow } from './bulk-import.types';
import * as admin from 'firebase-admin';

export class BulkImportRepository {
    private get db() {
        return getAdminDb();
    }

    async getBatch(dealerId: string, batchId: string): Promise<ImportBatch | null> {
        const doc = await this.db.collection('dealers').doc(dealerId).collection('import_batches').doc(batchId).get();
        if (!doc.exists) return null;
        return doc.data() as ImportBatch;
    }

    async createBatch(batch: ImportBatch): Promise<void> {
        await this.db.collection('dealers').doc(batch.dealerId).collection('import_batches').doc(batch.id).set({
            ...batch,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    async updateBatchStatus(dealerId: string, batchId: string, updates: Partial<ImportBatch>): Promise<void> {
        await this.db.collection('dealers').doc(dealerId).collection('import_batches').doc(batchId).update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    async saveStagedRow(dealerId: string, batchId: string, row: StagedImportRow): Promise<void> {
        await this.db.collection('dealers').doc(dealerId)
            .collection('import_batches').doc(batchId)
            .collection('rows').doc(row.id).set(row);
    }

    async getStagedRows(dealerId: string, batchId: string, lastDocId?: string, limit: number = 500): Promise<StagedImportRow[]> {
        let query = this.db.collection('dealers').doc(dealerId)
            .collection('import_batches').doc(batchId)
            .collection('rows')
            .orderBy('__name__')
            .limit(limit);
            
        if (lastDocId) {
            const lastDoc = await this.db.collection('dealers').doc(dealerId)
                .collection('import_batches').doc(batchId)
                .collection('rows').doc(lastDocId).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }
        
        const snap = await query.get();
        return snap.docs.map(d => d.data() as StagedImportRow);
    }

    async saveRowAudit(dealerId: string, batchId: string, rowId: string, audit: { status: 'IMPORTED' | 'FAILED' | 'SKIPPED'; jobId?: string; errorCode?: string; errorMessage?: string }): Promise<void> {
        await this.db.collection('dealers').doc(dealerId)
            .collection('import_batches').doc(batchId)
            .collection('audit_rows').doc(rowId).set({
                rowId,
                ...audit,
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            });
    }

    async getRowAudit(dealerId: string, batchId: string, rowId: string) {
        const doc = await this.db.collection('dealers').doc(dealerId)
            .collection('import_batches').doc(batchId)
            .collection('audit_rows').doc(rowId).get();
        return doc.exists ? doc.data() : null;
    }
}

export const bulkImportRepository = new BulkImportRepository();
