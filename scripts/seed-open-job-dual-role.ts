import { config } from 'dotenv';

if (!process.env.CI) {
    const result = config({ path: '.env.local' });
    if (result.error) console.error("Dotenv error:", result.error);
}

async function seedOpenJob() {
    const { getAdminDb, getAdminAuth } = await import('../src/infrastructure/firebase/admin');
    const { Timestamp } = await import('firebase-admin/firestore');

    try {
        const db = getAdminDb();
        const auth = getAdminAuth();

        let giverId = 'anita_dual_id';
        try {
            const giverRecord = await auth.getUserByEmail('anita.dual@team4job.com');
            giverId = giverRecord.uid;
        } catch (e) { console.log('Dual role user not found in auth, using hardcoded ID'); }

        const jobId = `JOB-OPEN-${Date.now()}`;
        const jobRef = db.collection('jobs').doc(jobId);

        const jobData = {
            id: jobId,
            title: `Open Job for Dual Role ${Date.now()}`,
            description: "A seeded job for testing self-bid protection.",
            status: 'Open',
            clientId: giverId,
            client: db.collection('users').doc(giverId),
            priceEstimate: { min: 8000, max: 15000 },
            postedAt: Timestamp.now(),
            deadline: Timestamp.fromDate(new Date(Date.now() + 86400000)),
            location: '110001',
            fullAddress: '123 Test St, Delhi 110001',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            bids: [],
            bidderIds: [],
            budget: { min: 15000, max: 15000 }
        };

        await jobRef.set(jobData);

        console.log(jobId);
        process.exit(0);

    } catch (error) {
        console.error('Error seeding open job:', error);
        process.exit(1);
    }
}

seedOpenJob();
