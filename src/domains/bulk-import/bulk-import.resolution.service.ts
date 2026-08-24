import { getAdminDb } from '@/infrastructure/firebase/admin';
import { ValidatedImportRow, ResolutionStatus } from './bulk-import.types';
import { normalizePhone, normalizeAddress } from './bulk-import.normalizer';

export class BulkImportResolutionService {
    private get db() {
        return getAdminDb();
    }

    async resolveCustomer(dealerId: string, row: ValidatedImportRow): Promise<{ status: ResolutionStatus; id?: string }> {
        const customersRef = this.db.collection('dealers').doc(dealerId).collection('customers');
        
        // 1. External Ref match
        if (row.customerExternalRef) {
            const snap = await customersRef.where('externalRef', '==', row.customerExternalRef).limit(1).get();
            if (!snap.empty) {
                return { status: 'EXISTING', id: snap.docs[0].id };
            }
        }

        // 2. Normalized Phone match
        if (row.customerPhone) {
            const normPhone = normalizePhone(row.customerPhone);
            // In a real app we'd search against a normalized field.
            // For now, doing an exact match on phone.
            const snap = await customersRef.where('phone', '==', row.customerPhone).limit(1).get();
            if (!snap.empty) {
                return { status: 'EXISTING', id: snap.docs[0].id };
            }
        }

        return { status: 'NEW' };
    }

    async resolveSite(dealerId: string, customerId: string | undefined, row: ValidatedImportRow): Promise<{ status: ResolutionStatus; id?: string }> {
        const sitesRef = this.db.collection('dealers').doc(dealerId).collection('serviceSites');

        // 1. External Ref match
        if (row.siteExternalRef) {
            const snap = await sitesRef.where('externalRef', '==', row.siteExternalRef).limit(1).get();
            if (!snap.empty) {
                return { status: 'EXISTING', id: snap.docs[0].id };
            }
        }

        // 2. We do NOT silent merge addresses without externalRef.
        // If externalRef didn't match, we assume it's NEW. (Or we could flag NEEDS_REVIEW if address is similar).
        // The contract says: "Never silently merge two sites ????? similar address ?????."
        return { status: 'NEW' };
    }
}

export const bulkImportResolutionService = new BulkImportResolutionService();
