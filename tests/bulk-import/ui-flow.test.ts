import { stageCsvUploadAction, getImportPreviewAction, confirmImportAction, commitImportAction, getBatchResultAction } from '@/app/actions/bulk-import.actions';
import { getAdminDb } from '@/infrastructure/firebase/admin';

jest.mock('@/infrastructure/auth/server-auth', () => ({
    getAuthDealerId: jest.fn().mockResolvedValue('dealer_ui_flow_1')
}));

describe('Bulk Import - Phase 8C UI Flow (E2E)', () => {
    process.env.NEXT_PUBLIC_USE_EMULATOR = 'true';
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.FIREBASE_PROJECT_ID = 'demo-stitch-test';

    const db = getAdminDb();
    const dealerId = 'dealer_ui_flow_1';
    let batchId: string;

    beforeAll(async () => {
        await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-stitch-test/databases/(default)/documents', { method: 'DELETE' });
    });

    it('Step 1: Upload CSV and Stage', async () => {
        const rows = [
            { title: 'Job 1', description: 'Desc 1', category: 'HVAC', scheduledDate: '2027-01-01', customerName: 'Alice', customerPhone: '111', siteName: 'Home', siteAddress: '123 St' },
            { title: 'Job 2', description: 'Desc 2', category: 'HVAC', scheduledDate: '2027-01-01', b2bPrice: '500', customerName: 'Bob', customerPhone: '222', siteName: 'Home2', siteAddress: '456 St' }
        ];

        const res = await stageCsvUploadAction('test.csv', rows);
        expect(res.batchId).toBeDefined();
        batchId = res.batchId;
    });

    it('Step 2: Preview Validation', async () => {
        const preview = await getImportPreviewAction(batchId);
        expect(preview.batch.status).toBe('STAGED');
        expect(preview.batch.rowCount).toBe(2);
        expect(preview.batch.validCount).toBe(1);
        expect(preview.batch.rejectedCount).toBe(1);
        expect(preview.rows.length).toBe(2);
        
        // Find rejected row
        const rejectedRow = preview.rows.find((r: any) => !r.isReadyForCommit);
        expect(rejectedRow?.validationErrors.join(',')).toContain('Unknown column detected');
    });

    it('Step 3 & 4: Confirm and Commit', async () => {
        // 3. Confirm
        await confirmImportAction(batchId);
        const confirmCheck = await getImportPreviewAction(batchId);
        expect(confirmCheck.batch.status).toBe('CONFIRMED');

        // 4. Commit
        await commitImportAction(batchId);
        
        // 5. Result
        const result = await getBatchResultAction(batchId);
        expect(result.batch?.status).toBe('PARTIALLY_COMPLETED'); // because row 2 was skipped due to validation errors (wait, if it was rejected in staging, it is SKIPPED during commit, which sets HAS_FAILURES = true)
        
        // Verify Jobs created
        const jobs = await db.collection('jobs').where('dealerId', '==', dealerId).get();
        expect(jobs.size).toBe(1);
        expect(jobs.docs[0].data().status).toBe('DRAFT');
    });
});
