const fs = require('fs');
const file = 'src/domains/dealers/dealer-memory.service.ts';
const code = \import { getAdminDb } from '@/infrastructure/firebase/admin';
import { DealerCustomer, ServiceSite } from './dealer.types';
import * as admin from 'firebase-admin';

export class DealerMemoryService {
    private get db() {
        return getAdminDb();
    }

    async createCustomer(dealerId: string, payload: Omit<DealerCustomer, 'id' | 'dealerId' | 'totalJobs' | 'totalRevenue' | 'createdAt' | 'updatedAt'>): Promise<DealerCustomer> {
        if (!dealerId) throw new Error("Dealer ID is required");
        if (!payload.name || !payload.phone) throw new Error("Customer name and phone are required");

        // Duplicate detection by phone
        const existing = await this.db.collection('dealers').doc(dealerId).collection('customers')
            .where('phone', '==', payload.phone).limit(1).get();
            
        if (!existing.empty) {
            throw new Error("Customer with this phone number already exists.");
        }

        const customerRef = this.db.collection('dealers').doc(dealerId).collection('customers').doc();
        
        const newCustomer: DealerCustomer = {
            id: customerRef.id,
            dealerId,
            ...payload,
            totalJobs: 0,
            totalRevenue: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
            updatedAt: admin.firestore.FieldValue.serverTimestamp() as any
        };

        await customerRef.set(newCustomer);
        return newCustomer;
    }

    async updateCustomer(dealerId: string, customerId: string, payload: Partial<Omit<DealerCustomer, 'id' | 'dealerId' | 'totalJobs' | 'totalRevenue' | 'createdAt' | 'updatedAt'>>): Promise<void> {
        if (!dealerId || !customerId) throw new Error("Dealer ID and Customer ID are required");
        const ref = this.db.collection('dealers').doc(dealerId).collection('customers').doc(customerId);
        
        // Ensure we don't accidentally update immutable fields
        const safeUpdate = { ...payload };
        delete (safeUpdate as any).totalJobs;
        delete (safeUpdate as any).totalRevenue;
        
        await ref.update({
            ...safeUpdate,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    async archiveCustomer(dealerId: string, customerId: string): Promise<void> {
        const ref = this.db.collection('dealers').doc(dealerId).collection('customers').doc(customerId);
        await ref.update({
            archived: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    async getCustomersByDealer(dealerId: string): Promise<DealerCustomer[]> {
        const snap = await this.db.collection('dealers').doc(dealerId).collection('customers')
            .where('archived', '!=', true)
            .get();
        return snap.docs.map(doc => doc.data() as DealerCustomer).sort((a: any, b: any) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0));
    }

    async getCustomerWithSites(dealerId: string, customerId: string) {
        const [customerSnap, sitesSnap] = await Promise.all([
            this.db.collection('dealers').doc(dealerId).collection('customers').doc(customerId).get(),
            this.db.collection('dealers').doc(dealerId).collection('serviceSites').where('customerId', '==', customerId).where('archived', '!=', true).get()
        ]);
        
        if (!customerSnap.exists) {
            throw new Error("Customer not found");
        }
        
        const customer = customerSnap.data() as DealerCustomer;
        const sites = sitesSnap.docs.map(doc => doc.data() as ServiceSite);
        
        return { customer, sites };
    }

    private async validatePreferredInstaller(installerId?: string) {
        if (!installerId) return;
        const snap = await this.db.collection('users').doc(installerId).get();
        if (!snap.exists) throw new Error("Preferred installer does not exist");
        const data = snap.data();
        if (data?.role !== 'Professional' || data?.status !== 'active') {
            throw new Error("Preferred installer is not active or valid");
        }
    }

    async createServiceSite(dealerId: string, payload: Omit<ServiceSite, 'id' | 'dealerId' | 'history' | 'createdAt' | 'updatedAt'>): Promise<ServiceSite> {
        if (!dealerId) throw new Error("Dealer ID is required");
        if (!payload.name || !payload.address || !payload.fullAddress) throw new Error("Site name and address are required");

        // Duplicate site detection by name per customer
        if (payload.customerId) {
            const existing = await this.db.collection('dealers').doc(dealerId).collection('serviceSites')
                .where('customerId', '==', payload.customerId)
                .where('name', '==', payload.name)
                .limit(1).get();
            if (!existing.empty) throw new Error("Service site with this name already exists for this customer.");
        }

        await this.validatePreferredInstaller((payload as any).preferredInstallerId); // In case it was passed at root level

        const siteRef = this.db.collection('dealers').doc(dealerId).collection('serviceSites').doc();
        
        const newSite: ServiceSite = {
            id: siteRef.id,
            dealerId,
            ...payload,
            history: {
                totalJobs: 0
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
            updatedAt: admin.firestore.FieldValue.serverTimestamp() as any
        };

        // If preferredInstallerId was passed at root, move it to history
        if ((payload as any).preferredInstallerId) {
            newSite.history.preferredInstallerId = (payload as any).preferredInstallerId;
            delete (newSite as any).preferredInstallerId;
        }

        await siteRef.set(newSite);
        return newSite;
    }

    async updateServiceSite(dealerId: string, siteId: string, payload: Partial<Omit<ServiceSite, 'id' | 'dealerId' | 'history' | 'createdAt' | 'updatedAt'>> & { preferredInstallerId?: string }): Promise<void> {
        if (!dealerId || !siteId) throw new Error("Dealer ID and Site ID are required");
        
        if (payload.preferredInstallerId) {
            await this.validatePreferredInstaller(payload.preferredInstallerId);
        }

        const ref = this.db.collection('dealers').doc(dealerId).collection('serviceSites').doc(siteId);
        
        const safeUpdate: any = { ...payload };
        delete safeUpdate.history; // Prevent manual history override
        
        if (payload.preferredInstallerId) {
            safeUpdate['history.preferredInstallerId'] = payload.preferredInstallerId;
            delete safeUpdate.preferredInstallerId;
        }
        
        await ref.update({
            ...safeUpdate,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    async archiveServiceSite(dealerId: string, siteId: string): Promise<void> {
        const ref = this.db.collection('dealers').doc(dealerId).collection('serviceSites').doc(siteId);
        await ref.update({
            archived: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    async getServiceSitesByDealer(dealerId: string): Promise<ServiceSite[]> {
        const snap = await this.db.collection('dealers').doc(dealerId).collection('serviceSites')
            .where('archived', '!=', true)
            .get();
        return snap.docs.map(doc => doc.data() as ServiceSite).sort((a: any, b: any) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0));
    }

    async getServiceSitesByCustomer(dealerId: string, customerId: string): Promise<ServiceSite[]> {
        const snap = await this.db.collection('dealers').doc(dealerId).collection('serviceSites')
            .where('customerId', '==', customerId)
            .where('archived', '!=', true)
            .get();
        return snap.docs.map(doc => doc.data() as ServiceSite).sort((a: any, b: any) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0));
    }
}

export const dealerMemoryService = new DealerMemoryService();
\;
fs.writeFileSync(file, code);
