
import { config } from 'dotenv';
const result = config({ path: '.env.local' });
if (result.error) console.error("Dotenv error:", result.error);

async function seedJob() {
    // Dynamic import to ensure env vars are loaded first
    const { getAdminDb } = await import('../src/lib/firebase/server-init');
    const { getAuth } = await import('firebase-admin/auth');
    const { Timestamp } = await import('firebase-admin/firestore');

    try {
        const db = getAdminDb(); // Initialize Admin App first
        const userRecord = await getAuth().getUserByEmail('giver_vip@team4job.com');
        const userId = userRecord.uid;

        const jobId = `JOB-SEED-${Date.now()}`;
        const jobRef = db.collection('jobs').doc(jobId);

        // 1. Create Job
        const mockBid = {
            id: `BID-${Date.now()}`,
            jobId: jobId,
            installer: { id: 'INSTALLER_MOCK_123', name: 'Mock Installer', email: 'mock@installer.com' },
            amount: 15000,
            status: 'Accepted',
            createdAt: Timestamp.now()
        };

        const jobData = {
            id: jobId,
            title: `Seeded Milestone Job ${Date.now()}`,
            description: "A seeded job for testing milestones.",
            status: 'In Progress', // Skip to In Progress
            jobGiverId: userId,
            jobGiver: db.collection('users').doc(userId),
            priceEstimate: { min: 8000, max: 15000 },
            postedAt: Timestamp.now(),
            deadline: Timestamp.fromDate(new Date(Date.now() + 86400000)), // tomorrow
            jobStartDate: Timestamp.fromDate(new Date(Date.now() + 86400000)),
            location: '560001',
            fullAddress: '123 Test St, Bangalore 560001',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            bids: [mockBid],
            bidderIds: ['INSTALLER_MOCK_123'],
            awardedInstaller: 'INSTALLER_MOCK_123',
            awardedBid: mockBid,
            budget: { min: 15000, max: 15000 } // Ensure budget is defined for validation logic
        };

        await jobRef.set(jobData);

        // 1.1 Add Bid to Subcollection (Required for Client SDK Subscription)
        const bidRef = jobRef.collection('bids').doc(mockBid.id);
        await bidRef.set(mockBid);

        // 2. Fund Job (Transaction)
        const transactionId = `TXN-${jobId}`;
        const transactionRef = db.collection('transactions').doc(transactionId);
        const transactionData = {
            id: transactionId,
            jobId: jobId,
            jobTitle: jobData.title,
            payerId: userId,
            payeeId: 'ESCROW_HOLD',
            amount: 15000, // Sufficient for milestones
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
