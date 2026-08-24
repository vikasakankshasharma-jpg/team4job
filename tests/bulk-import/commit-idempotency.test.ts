import { bulkImportCommitService } from '@/domains/bulk-import/bulk-import.commit.service';
import { bulkImportRepository } from '@/domains/bulk-import/bulk-import.repository';
import { getAdminDb } from '@/infrastructure/firebase/admin';

describe('Bulk Import - Phase 8C Commit & Idempotency Engine', () => {
    process.env.NEXT_PUBLIC_USE_EMULATOR = 'true';
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.FIREBASE_PROJECT_ID = 'demo-stitch-test';

    const db = getAdminDb();
    const dealerId = 'dealerCommit1';
    const batchId = 'batchId1';

    beforeAll(async () => {
        await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-stitch-test/databases/(default)/documents', { method: 'DELETE' });
        
        await bulkImportRepository.createBatch({
            id: batchId,
            dealerId,
            uploadedBy: 'user1',
            fileName: 'test.csv',
            rowCount: 2,
            validCount: 2,
            rejectedCount: 0,
            duplicateCount: 0,
            status: 'CONFIRMED', // Needs to be CONFIRMED for commit
            createdAt: new Date()
        });

        // Stage Row 1 (Valid)
        await bulkImportRepository.saveStagedRow(dealerId, batchId, {
            id: 'row1',
            title: 'Fix Sink',
            description: 'Sink leaking',
            category: 'PLUMBING',
            scheduledDate: new Date('2027-01-01') as any,
            customerResolutionStatus: 'NEW',
            customerName: 'Alice',
            customerPhone: '1112223333',
            siteResolutionStatus: 'NEW',
            siteName: 'Alice Home',
            siteAddress: '123 Alice St',
            isDuplicate: false,
            validationErrors: [],
            isReadyForCommit: true
        });

        // Stage Row 2 (Malicious / Invalid)
        await bulkImportRepository.saveStagedRow(dealerId, batchId, {
            id: 'row2',
            title: 'Fix AC',
            description: 'AC broken',
            category: 'HVAC',
            scheduledDate: new Date('2027-01-02') as any,
            customerResolutionStatus: 'NEW',
            customerName: 'Bob',
            customerPhone: '4445556666',
            siteResolutionStatus: 'NEW',
            siteName: 'Bob Home',
            siteAddress: '456 Bob St',
            isDuplicate: false,
            validationErrors: ['Malicious financial field detected'],
            isReadyForCommit: false
        });
    });

    it('should reject commit if batch is not CONFIRMED (IMPORT_STALE check)', async () => {
        const batch2 = 'batchId2';
        await bulkImportRepository.createBatch({
            id: batch2, dealerId, uploadedBy: 'user1', fileName: 'test.csv', rowCount: 1, validCount: 1, rejectedCount: 0, duplicateCount: 0,
            status: 'STAGED', // STAGED, not CONFIRMED
            createdAt: new Date()
        });

        await expect(bulkImportCommitService.commitBatch(dealerId, batch2, 'lock1'))
            .rejects.toThrow('Batch must be explicitly CONFIRMED before commit. IMPORT_STALE.');
    });

    it('should process chunked commit, handle partial failure, and force DRAFT status', async () => {
        await bulkImportCommitService.commitBatch(dealerId, batchId, 'lock1');

        // Verify Batch Status
        const batch = await bulkImportRepository.getBatch(dealerId, batchId);
        expect(batch?.status).toBe('PARTIALLY_COMPLETED');

        // Verify Row Audits
        const audit1 = await bulkImportRepository.getRowAudit(dealerId, batchId, 'row1');
        if (audit1?.status === 'FAILED') console.log('Row 1 Failed:', audit1.errorMessage);
        expect(audit1?.status).toBe('IMPORTED');

        const audit2 = await bulkImportRepository.getRowAudit(dealerId, batchId, 'row2');
        expect(audit2?.status).toBe('SKIPPED');
        expect(audit2?.errorMessage).toContain('not ready');

        // Verify Job was created and forced to DRAFT
        const jobs = await db.collection('jobs').where('dealerId', '==', dealerId).get();
        expect(jobs.size).toBe(1);
        const job = jobs.docs[0].data();
        
        expect(job.status).toBe('DRAFT');
        expect(job.paymentStatus).toBe('not_applicable');
        expect(job.awardedProfessionalId).toBe(null);
        expect(job.b2bPrice).toBe(null);
    });

    it('should be idempotent on double commit attempt', async () => {
        // Attempting to commit again with same lock should silently return (transaction lock will prevent it)
        // Or if status is already PARTIALLY_COMPLETED, it will return false in tx.
        await bulkImportCommitService.commitBatch(dealerId, batchId, 'lock1');
        
        // Ensure no duplicate jobs created
        const jobs = await db.collection('jobs').where('dealerId', '==', dealerId).get();
        expect(jobs.size).toBe(1); // Still 1
    });

    it('Adversarial: Dealer B should not be able to commit Dealer A batch', async () => {
        await expect(bulkImportCommitService.commitBatch('dealerB', batchId, 'lock2'))
            .rejects.toThrow('Batch not found');
    });

    it('Adversarial: Client injecting status=IN_PROGRESS in staging row is forced to DRAFT', async () => {
        const maliciousBatchId = 'batchId_malicious';
        await bulkImportRepository.createBatch({
            id: maliciousBatchId, dealerId, uploadedBy: 'user1', fileName: 'test2.csv', rowCount: 1, validCount: 1, rejectedCount: 0, duplicateCount: 0, status: 'CONFIRMED', createdAt: new Date()
        });

        // Stage row with fake payload
        await bulkImportRepository.saveStagedRow(dealerId, maliciousBatchId, {
            id: 'row1',
            title: 'Fix Roof',
            description: 'Roof leak',
            category: 'ROOFING',
            scheduledDate: new Date('2027-02-01') as any,
            customerResolutionStatus: 'NEW',
            customerName: 'Charlie',
            customerPhone: '7778889999',
            siteResolutionStatus: 'NEW',
            siteName: 'Charlie Home',
            siteAddress: '789 Charlie St',
            isDuplicate: false,
            validationErrors: [],
            isReadyForCommit: true,
            status: 'IN_PROGRESS', // INJECTED
            paymentStatus: 'released' // INJECTED
        } as any);

        await bulkImportCommitService.commitBatch(dealerId, maliciousBatchId, 'lock_malicious');
        
        // Find the job
        const jobs = await db.collection('jobs').where('dealerId', '==', dealerId).where('jobCategory', '==', 'ROOFING').get();
        expect(jobs.size).toBe(1);
        const job = jobs.docs[0].data();
        
        expect(job.status).toBe('DRAFT'); // Forced
        expect(job.paymentStatus).toBe('not_applicable'); // Forced
    });
});
