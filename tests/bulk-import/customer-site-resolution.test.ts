import { bulkImportResolutionService } from '@/domains/bulk-import/bulk-import.resolution.service';
import { bulkImportDuplicateService } from '@/domains/bulk-import/bulk-import.duplicate.service';
import { getAdminDb } from '@/infrastructure/firebase/admin';

describe('Bulk Import - Phase 8C Resolution & Duplicate Engine', () => {
    process.env.NEXT_PUBLIC_USE_EMULATOR = 'true';
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.FIREBASE_PROJECT_ID = 'demo-stitch-test';

    const db = getAdminDb();
    const dealerId = 'dealerResolv1';
    let existingCustomerId: string;
    let existingSiteId: string;

    beforeAll(async () => {
        await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-stitch-test/databases/(default)/documents', { method: 'DELETE' });
        
        const custRef = await db.collection('dealers').doc(dealerId).collection('customers').add({
            externalRef: 'ERP-CUST-1',
            name: 'Existing Customer',
            phone: '5551112222'
        });
        existingCustomerId = custRef.id;

        const siteRef = await db.collection('dealers').doc(dealerId).collection('serviceSites').add({
            customerId: existingCustomerId,
            externalRef: 'ERP-SITE-1',
            name: 'Existing Site',
            address: { city: 'Pune' }
        });
        existingSiteId = siteRef.id;

        await db.collection('jobs').add({
            dealerId,
            externalRef: 'ERP-JOB-1',
            fingerprint: 'mock_hash',
            status: 'DRAFT'
        });
    });

    it('should resolve existing customer by externalRef', async () => {
        const res = await bulkImportResolutionService.resolveCustomer(dealerId, {
            customerExternalRef: 'ERP-CUST-1',
            title: '', description: '', category: '', scheduledDate: new Date()
        });
        expect(res.status).toBe('EXISTING');
        expect(res.id).toBe(existingCustomerId);
    });

    it('should resolve existing customer by phone if no externalRef', async () => {
        const res = await bulkImportResolutionService.resolveCustomer(dealerId, {
            customerPhone: '5551112222',
            title: '', description: '', category: '', scheduledDate: new Date()
        });
        expect(res.status).toBe('EXISTING');
        expect(res.id).toBe(existingCustomerId);
    });

    it('should return NEW if customer does not match', async () => {
        const res = await bulkImportResolutionService.resolveCustomer(dealerId, {
            customerExternalRef: 'ERP-UNKNOWN',
            title: '', description: '', category: '', scheduledDate: new Date()
        });
        expect(res.status).toBe('NEW');
    });

    it('should resolve existing site by externalRef', async () => {
        const res = await bulkImportResolutionService.resolveSite(dealerId, existingCustomerId, {
            siteExternalRef: 'ERP-SITE-1',
            title: '', description: '', category: '', scheduledDate: new Date()
        });
        expect(res.status).toBe('EXISTING');
        expect(res.id).toBe(existingSiteId);
    });

    it('should not silently merge sites without externalRef', async () => {
        // Even if address is similar, contract says NO SILENT MERGES
        const res = await bulkImportResolutionService.resolveSite(dealerId, existingCustomerId, {
            siteAddress: 'Pune',
            title: '', description: '', category: '', scheduledDate: new Date()
        });
        expect(res.status).toBe('NEW');
    });

    it('should detect Level 2 Duplicate (External Job Ref)', async () => {
        const res = await bulkImportDuplicateService.checkDuplicate(dealerId, {
            jobExternalRef: 'ERP-JOB-1',
            title: '', description: '', category: '', scheduledDate: new Date()
        });
        expect(res.isDuplicate).toBe(true);
        expect(res.reason).toContain('Level 2');
    });
});
