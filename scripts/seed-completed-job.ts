
import { config } from 'dotenv';

if (!process.env.CI) {
    const result = config({ path: '.env.local' });
    if (result.error) console.error("Dotenv error:", result.error);
}

async function seedCompletedJob() {
    const { getAdminDb } = await import('../src/lib/firebase/server-init');
    const { getAuth } = await import('firebase-admin/auth');
    const { Timestamp } = await import('firebase-admin/firestore');

    try {
        const db = getAdminDb();
        const auth = getAuth();

        // Fetch real UIDs for test accounts
        const giverRecord = await auth.getUserByEmail('giver_vip_v3@team4job.com');
        const giverId = giverRecord.uid;

        const installerRecord = await auth.getUserByEmail('installer_pro_v3@team4job.com');
        const installerId = installerRecord.uid;

        const jobId = `JOB-COMPLETED-${Date.now()}`;
        const jobRef = db.collection('jobs').doc(jobId);

        const mockBid = {
            id: `BID-${Date.now()}`,
            jobId: jobId,
            installer: { id: installerId, name: 'Pro Installer', email: 'installer_pro_v3@team4job.com' },
            amount: 15000,
            status: 'Accepted',
            createdAt: Timestamp.now()
        };

        const jobData = {
            id: jobId,
            title: `Completed Job for Review ${Date.now()}`,
            description: "A seeded job for testing review/rating flow.",
            status: 'Completed',
            jobGiverId: giverId,
            jobGiver: db.collection('users').doc(giverId),
            priceEstimate: { min: 8000, max: 15000 },
            postedAt: Timestamp.now(),
            deadline: Timestamp.fromDate(new Date(Date.now() + 86400000)),
            location: '560001',
            fullAddress: '123 Test St, Bangalore 560001',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            bids: [mockBid],
            bidderIds: [installerId],
            awardedInstallerId: installerId,
            awardedBid: mockBid,
            budget: { min: 15000, max: 15000 }
        };

        await jobRef.set(jobData);

        const bidRef = jobRef.collection('bids').doc(mockBid.id);
        await bidRef.set(mockBid);

        const transactionId = `TXN-${jobId}`;
        const transactionRef = db.collection('transactions').doc(transactionId);
        const transactionData = {
            id: transactionId,
            jobId: jobId,
            jobTitle: jobData.title,
            payerId: giverId,
            payeeId: installerId,
            amount: 15000,
            status: 'released',
            transactionType: 'JOB',
            createdAt: Timestamp.now(),
            fundedAt: Timestamp.now(),
            releasedAt: Timestamp.now(),
            paymentGatewayOrderId: `SEED_ORDER_${Date.now()}`,
            paymentGatewaySessionId: `SEED_SESSION_${Date.now()}`,
            totalPaidByGiver: 17700,
            payoutToInstaller: 13500,
            platformFee: 0,
            jobGiverFee: 2700
        };
        await transactionRef.set(transactionData);

        console.log(jobId);
        process.exit(0);

    } catch (error) {
        console.error('Error seeding completed job:', error);
        process.exit(1);
    }
}

seedCompletedJob();
