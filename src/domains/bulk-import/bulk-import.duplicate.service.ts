import { getAdminDb } from '@/infrastructure/firebase/admin';
import { ValidatedImportRow } from './bulk-import.types';
import * as crypto from 'crypto';

export class BulkImportDuplicateService {
    private get db() {
        return getAdminDb();
    }

    async checkDuplicate(dealerId: string, row: ValidatedImportRow, resolvedCustomerId?: string, resolvedSiteId?: string): Promise<{ isDuplicate: boolean; reason?: string }> {
        // Level 2: External Reference Match
        if (row.jobExternalRef) {
            const snap = await this.db.collection('jobs')
                .where('dealerId', '==', dealerId)
                .where('externalRef', '==', row.jobExternalRef)
                .limit(1)
                .get();
                
            if (!snap.empty) {
                return { isDuplicate: true, reason: 'Level 2: Job with this externalRef already exists' };
            }
        }

        // Level 3: Content Fingerprint Match
        if (resolvedCustomerId && resolvedSiteId) {
            const dateStr = row.scheduledDate.toISOString().split('T')[0]; // Just the date part
            const fingerprintString = `${dealerId}_${resolvedCustomerId}_${resolvedSiteId}_${row.category}_${dateStr}`;
            const hash = crypto.createHash('sha256').update(fingerprintString).digest('hex');

            const snap = await this.db.collection('jobs')
                .where('dealerId', '==', dealerId)
                .where('fingerprint', '==', hash)
                .limit(1)
                .get();

            if (!snap.empty) {
                return { isDuplicate: true, reason: 'Level 3: Probable duplicate based on content fingerprint' };
            }
        }

        // Level 4: Semantic / Business Duplicate Match
        if (resolvedCustomerId && resolvedSiteId) {
            // Check for any job at this site with same category around the same scheduled date (+/- 3 days)
            // Note: Since Firestore doesn't support complex OR / multiple inequality queries easily without composite indexes,
            // we will query by siteId and category, and filter dates in memory to avoid index requirements for now.
            const snap = await this.db.collection('jobs')
                .where('dealerId', '==', dealerId)
                .where('serviceLocationId', '==', resolvedSiteId)
                .where('jobCategory', '==', row.category)
                .get();

            const targetTime = row.scheduledDate.getTime();
            const threeDays = 3 * 24 * 60 * 60 * 1000;
            for (const doc of snap.docs) {
                const data = doc.data();
                if (data.scheduledDate) {
                    const jobTime = (data.scheduledDate.toDate ? data.scheduledDate.toDate() : new Date(data.scheduledDate)).getTime();
                    if (Math.abs(jobTime - targetTime) <= threeDays) {
                        return { isDuplicate: true, reason: 'Level 4: Possible existing job detected (Semantic Duplicate)' };
                    }
                }
            }
        }

        return { isDuplicate: false };
    }

    generateFingerprint(dealerId: string, customerId: string, siteId: string, category: string, date: Date): string {
        const dateStr = date.toISOString().split('T')[0];
        const fingerprintString = `${dealerId}_${customerId}_${siteId}_${category}_${dateStr}`;
        return crypto.createHash('sha256').update(fingerprintString).digest('hex');
    }
}

export const bulkImportDuplicateService = new BulkImportDuplicateService();
