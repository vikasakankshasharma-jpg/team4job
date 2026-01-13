
import { config } from 'dotenv';
const result = config({ path: '.env.local' });
if (result.error) console.error("Dotenv error:", result.error);

async function seedJob() {
    // Dynamic import to ensure env vars are loaded first
    const { getAdminDb } = await import('../src/lib/firebase/server-init');
    const { getAuth } = await import('firebase-admin/auth');
    const { Timestamp } = await import('firebase-admin/firestore');

    try {
        const userRecord = await getAuth().getUserByEmail('jobgiver@example.com');
        const userId = userRecord.uid;

        const jobId = `JOB-SEED-${Date.now()}`;
        const db = getAdminDb();
        const jobRef = db.collection('jobs').doc(jobId);

        // 1. Create Job
        const jobData = {
            id: jobId,
            title: `Seeded Milestone Job ${Date.now()}`,
            description: "A seeded job for testing milestones.",
            status: 'In Progress', // Skip to In Progress
            jobGiverId: userId,
            jobGiver: db.collection('users').doc(userId),
            priceEstimate: { min: 8000, max: 12000 },
            postedAt: Timestamp.now(),
            deadline: Timestamp.fromDate(new Date(Date.now() + 86400000)), // tomorrow
            jobStartDate: Timestamp.fromDate(new Date(Date.now() + 86400000)),
            location: '560001',
            fullAddress: '123 Test St, Bangalore 560001',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            bids: [],
            bidderIds: []
        };

        await jobRef.set(jobData);

        // 2. Fund Job (Transaction)
        const transactionId = `TXN-${jobId}`;
        const transactionRef = db.collection('transactions').doc(transactionId);
        const transactionData = {
            id: transactionId,
            jobId: jobId,
            jobTitle: jobData.title,
            payerId: userId,
            payeeId: 'ESCROW_HOLD',
            amount: 10000, // Sufficient for milestones
            status: 'Funded',
            transactionType: 'JOB',
            createdAt: Timestamp.now(),
            fundedAt: Timestamp.now(),
            paymentGatewayOrderId: `SEED_ORDER_${Date.now()}`,
            paymentGatewaySessionId: `SEED_SESSION_${Date.now()}`,
            totalPaidByGiver: 11800,
            payoutToInstaller: 10000,
            platformFee: 0
        };
        await transactionRef.set(transactionData);

        console.log(jobId); // Output ONLY the ID for the test to capture
        process.exit(0);

    } catch (error) {
        console.error('Error seeding job:', error);
        process.exit(1);
    }
}

seedJob();
