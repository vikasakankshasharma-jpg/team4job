const fs = require('fs');
let code = \

export async function getRepeatJobTemplate(dealerId: string, siteId: string) {
    const { getAdminDb } = await import('@/infrastructure/firebase/admin');
    const db = getAdminDb();
    
    // 1. Get current Site Memory
    const siteSnap = await db.collection('dealers').doc(dealerId).collection('serviceSites').doc(siteId).get();
    if (!siteSnap.exists) throw new Error("Site not found");
    const site = siteSnap.data();

    // 2. Get Customer Memory
    let customer: any = null;
    if (site.customerId) {
        const custSnap = await db.collection('dealers').doc(dealerId).collection('customers').doc(site.customerId).get();
        if (custSnap.exists) customer = custSnap.data();
    }

    // 3. Get latest completed job for this site
    const jobsSnap = await db.collection('jobs')
        .where('dealerId', '==', dealerId)
        .where('serviceLocationId', '==', siteId)
        .where('status', '==', 'completed')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

    let lastJob: any = null;
    if (!jobsSnap.empty) {
        lastJob = jobsSnap.docs[0].data();
    }

    // Current Site Memory > Latest Completed Job
    // Financial fields NEVER copied
    const template: any = {
        title: lastJob ? \Repeat: \\ : 'New Job',
        description: lastJob?.description || '',
        jobCategory: lastJob?.jobCategory || '',
        serviceLocationId: siteId,
        location: site.address?.city || site.fullAddress || '',
        fullAddress: site.fullAddress || '',
        address: site.address || {},
        
        // Contacts
        endCustomerContact: {
            name: customer?.name || lastJob?.endCustomerContact?.name || '',
            phone: customer?.phone || lastJob?.endCustomerContact?.phone || '',
            email: customer?.email || lastJob?.endCustomerContact?.email || ''
        },

        // Preferred Installer from site memory
        recommendedInstallerId: site.history?.preferredInstallerId || lastJob?.awardedProfessionalId || null,

        // Financial fields left empty
        budget: null,
        b2bPrice: null,
        dealerMargin: null
    };

    return template;
}
\;
fs.appendFileSync('src/domains/dealers/dealer-memory.service.ts', code);
