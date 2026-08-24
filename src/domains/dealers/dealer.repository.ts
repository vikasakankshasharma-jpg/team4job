import { getAdminDb } from '@/infrastructure/firebase/admin';
import { COLLECTIONS } from '@/infrastructure/firebase/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { Dealer, DealerCustomer, ServiceSite, InstallerPrivateMemory } from './dealer.types';

import * as crypto from 'crypto';

export type IdempotencyRecord = {
    dealerId: string;
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
    payloadHash: string;
    result?: any;
    createdAt: Timestamp;
    expiresAt: Timestamp;
};

export class DealerRepository {
    private hashPayload(payload: any): string {
        return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    }

    /**
     * Acquire an idempotency key.
     * Enforces payload matching, dealer matching, and concurrent processing locks.
     */
    async acquireIdempotencyKey(key: string, dealerId: string, payload: any): Promise<{status: 'NEW' | 'COMPLETED', result?: any}> {
        const db = getAdminDb();
        const docRef = db.collection('idempotency_keys').doc(key);
        const payloadHash = this.hashPayload(payload);
        
        try {
            return await db.runTransaction(async (t) => {
                const doc = await t.get(docRef);
                if (doc.exists) {
                    const data = doc.data() as IdempotencyRecord;
                    if (data.dealerId !== dealerId) {
                        throw new Error('Duplicate request: Key belongs to a different dealer');
                    }
                    if (data.payloadHash !== payloadHash) {
                        throw new Error('Duplicate request: Key reused with different payload');
                    }
                    if (data.status === 'PROCESSING') {
                        throw new Error('Duplicate request: Operation is currently processing');
                    }
                    if (data.status === 'FAILED') {
                        // Allow retry on failure
                        t.update(docRef, { status: 'PROCESSING', createdAt: Timestamp.now() });
                        return { status: 'NEW' };
                    }
                    if (data.status === 'COMPLETED') {
                        return { status: 'COMPLETED', result: data.result };
                    }
                }

                t.set(docRef, {
                    dealerId,
                    status: 'PROCESSING',
                    payloadHash,
                    createdAt: Timestamp.now(),
                    expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)) // 24 hours TTL
                });
                return { status: 'NEW' };
            });
        } catch (error) {
            console.error('[DealerRepository] Idempotency lock failed', error);
            throw error;
        }
    }

    async completeIdempotencyKey(key: string, result: any): Promise<void> {
        const db = getAdminDb();
        const docRef = db.collection('idempotency_keys').doc(key);
        await docRef.update({ status: 'COMPLETED', result });
    }

    async failIdempotencyKey(key: string): Promise<void> {
        const db = getAdminDb();
        const docRef = db.collection('idempotency_keys').doc(key);
        await docRef.update({ status: 'FAILED' });
    }

    /**
     * Get Service Site by ID
     */
    async getServiceSite(dealerId: string, siteId: string): Promise<ServiceSite | null> {
        const db = getAdminDb();
        const doc = await db.collection('dealers').doc(dealerId).collection('serviceSites').doc(siteId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as ServiceSite;
    }

    /**
     * Fetch Dealer Customers
     */
    async getCustomers(dealerId: string, limit = 50): Promise<DealerCustomer[]> {
        const db = getAdminDb();
        const snapshot = await db.collection('dealers').doc(dealerId)
            .collection('customers')
            .orderBy('updatedAt', 'desc')
            .limit(limit).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DealerCustomer));
    }
    
    /**
     * Fetch Dealer Sites
     */
    async getServiceSites(dealerId: string, limit = 50): Promise<ServiceSite[]> {
        const db = getAdminDb();
        const snapshot = await db.collection('dealers').doc(dealerId)
            .collection('serviceSites')
            .orderBy('updatedAt', 'desc')
            .limit(limit).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceSite));
    }

    /**
     * Fetch Installer Private Memory
     */
    async getInstallerMemory(dealerId: string, installerId: string): Promise<InstallerPrivateMemory | null> {
        const db = getAdminDb();
        const doc = await db.collection('dealers').doc(dealerId).collection('operationalMemory').doc(installerId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as InstallerPrivateMemory;
    }
}

export const dealerRepository = new DealerRepository();
