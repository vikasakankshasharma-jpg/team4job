const fs = require('fs');
const file = 'src/app/actions/dealer.actions.ts';
let code = fs.readFileSync(file, 'utf8');

const newCode = \
import { dealerMemoryService } from '@/domains/dealers/dealer-memory.service';

export async function createCustomerAction(payload: any) {
    try {
        const { uid: dealerId } = await requireAuth();
        const customer = await dealerMemoryService.createCustomer(dealerId, payload);
        revalidatePath('/dashboard/dealer-workspace/customers');
        return { success: true, data: JSON.parse(JSON.stringify(customer)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function listCustomersAction() {
    try {
        const { uid: dealerId } = await requireAuth();
        const customers = await dealerMemoryService.getCustomersByDealer(dealerId);
        return { success: true, data: JSON.parse(JSON.stringify(customers)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createServiceSiteAction(payload: any) {
    try {
        const { uid: dealerId } = await requireAuth();
        const site = await dealerMemoryService.createServiceSite(dealerId, payload);
        revalidatePath('/dashboard/dealer-workspace/customers');
        return { success: true, data: JSON.parse(JSON.stringify(site)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function listServiceSitesAction() {
    try {
        const { uid: dealerId } = await requireAuth();
        const sites = await dealerMemoryService.getServiceSitesByDealer(dealerId);
        return { success: true, data: JSON.parse(JSON.stringify(sites)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getCustomerWithSitesAction(customerId: string) {
    try {
        const { uid: dealerId } = await requireAuth();
        
        // Parallel fetch customer and sites
        const { getAdminDb } = await import('@/infrastructure/firebase/admin');
        const db = getAdminDb();
        
        const [customerSnap, sites] = await Promise.all([
            db.collection('dealers').doc(dealerId).collection('customers').doc(customerId).get(),
            dealerMemoryService.getServiceSitesByCustomer(dealerId, customerId)
        ]);
        
        if (!customerSnap.exists) {
            throw new Error("Customer not found");
        }
        
        const customer = customerSnap.data();
        
        return { success: true, data: JSON.parse(JSON.stringify({ customer, sites })) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
\;

fs.writeFileSync(file, code + newCode);
console.log('Appended actions');
