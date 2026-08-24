import { dealerMemoryService } from '@/domains/dealers/dealer-memory.service';
import { getAdminDb } from '@/infrastructure/firebase/admin';

describe('Dealer Private Memory Integration & Isolation - 8B.5 Hardening', () => {
    process.env.NEXT_PUBLIC_USE_EMULATOR = 'true';
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.FIREBASE_PROJECT_ID = 'demo-stitch-test';

    const db = getAdminDb();
    const dealerA_Id = 'dealerA_123';
    const dealerB_Id = 'dealerB_456';
    let customerA_Id: string;
    let siteA_Id: string;

    const testPhone = 'phone' + Date.now();
    const testPhone2 = 'phone2' + Date.now();

    beforeAll(async () => {
        // Clear collections for test determinism
        await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-stitch-test/databases/(default)/documents', { method: 'DELETE' });
        
        // Ensure dealers exist
        await db.collection('dealers').doc(dealerA_Id).set({ isDealer: true });
        await db.collection('dealers').doc(dealerB_Id).set({ isDealer: true });
        
        // Ensure an installer exists for preference testing
        await db.collection('users').doc('valid_installer').set({ role: 'Professional', status: 'active' });
    });

    it('Should create a Customer and detect duplicates', async () => {
        const customer = await dealerMemoryService.createCustomer(dealerA_Id, {
            name: 'Test Customer A',
            phone: testPhone
        });
        customerA_Id = customer.id;
        expect(customer.dealerId).toBe(dealerA_Id);

        await expect(dealerMemoryService.createCustomer(dealerA_Id, {
            name: 'Another Name',
            phone: testPhone
        })).rejects.toThrow('Customer with this phone number already exists.');
    });

    it('Should create a Service Site with preferred installer validation and duplicate detection', async () => {
        await expect(dealerMemoryService.createServiceSite(dealerA_Id, {
            customerId: customerA_Id,
            name: 'Site A1',
            address: {
                street: '123 Main',
                city: 'Jaipur',
                zipCode: '302001',
                country: 'India',
                coordinates: { latitude: 26.9, longitude: 75.7 }
            } as any,
            fullAddress: '123 Main, Jaipur',
            preferredInstallerId: 'fake_installer'
        } as any)).rejects.toThrow('Preferred installer does not exist');

        const site = await dealerMemoryService.createServiceSite(dealerA_Id, {
            customerId: customerA_Id,
            name: 'Site A1',
            address: {
                street: '123 Main',
                city: 'Jaipur',
                zipCode: '302001',
                country: 'India',
                coordinates: { latitude: 26.9, longitude: 75.7 }
            } as any,
            fullAddress: '123 Main, Jaipur',
            preferredInstallerId: 'valid_installer'
        } as any);
        siteA_Id = site.id;
        expect(site.history?.preferredInstallerId).toBe('valid_installer');

        await expect(dealerMemoryService.createServiceSite(dealerA_Id, {
            customerId: customerA_Id,
            name: 'Site A1', // duplicate name for same customer
            address: { street: 'abc' } as any,
            fullAddress: 'abc'
        })).rejects.toThrow('Service site with this name already exists for this customer.');
    });

    it('Should prevent updating immutable history/revenue fields', async () => {
        await dealerMemoryService.updateCustomer(dealerA_Id, customerA_Id, {
            name: 'Updated Name',
            totalRevenue: 99999 // malicious
        } as any);

        const custRef = await db.collection('dealers').doc(dealerA_Id).collection('customers').doc(customerA_Id).get();
        expect(custRef.data()?.name).toBe('Updated Name');
        expect(custRef.data()?.totalRevenue).toBe(0); // Ignored
        
        await dealerMemoryService.updateServiceSite(dealerA_Id, siteA_Id, {
            name: 'Updated Site',
            history: { totalJobs: 500 } // malicious
        } as any);

        const siteRef = await db.collection('dealers').doc(dealerA_Id).collection('serviceSites').doc(siteA_Id).get();
        expect(siteRef.data()?.name).toBe('Updated Site');
        expect(siteRef.data()?.history?.totalJobs).toBe(0); // Ignored
    });

    it('Should hide archived documents from normal queries', async () => {
        // Create secondary customer
        const cust2 = await dealerMemoryService.createCustomer(dealerA_Id, { name: 'To Archive', phone: testPhone2 });
        
        let customers = await dealerMemoryService.getCustomersByDealer(dealerA_Id);
        expect(customers.length).toBe(2);

        await dealerMemoryService.archiveCustomer(dealerA_Id, cust2.id);

        customers = await dealerMemoryService.getCustomersByDealer(dealerA_Id);
        expect(customers.length).toBe(1);
        expect(customers[0].id).toBe(customerA_Id);
    });

    it('Adversarial: Dealer B should not fetch Dealer A customers', async () => {
        const customersB = await dealerMemoryService.getCustomersByDealer(dealerB_Id);
        expect(customersB.length).toBe(0);
        
        const sitesB = await dealerMemoryService.getServiceSitesByDealer(dealerB_Id);
        expect(sitesB.length).toBe(0);
    });
});
