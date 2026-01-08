
import { config } from 'dotenv';
config({ path: '.env.local' });

async function fundJob(jobId: string) {
    // Dynamic import
    const { db } = await import('../src/lib/firebase/server-init');
    const { Timestamp } = await import('firebase-admin/firestore');

    if (!jobId) {
        console.error('Job ID is required');
        process.exit(1);
    }

    console.log(`Funding job ${jobId}...`);

    try {
        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await jobRef.get();

        if (!jobSnap.exists) {
            console.error('Job not found');
            process.exit(1);
        }

        const job = jobSnap.data();

        // Create Funded Transaction
        const transactionId = `TXN-${jobId}-${Date.now()}`;
        const transactionRef = db.collection('transactions').doc(transactionId);

        const newTransaction = {
            id: transactionId,
            jobId,
            jobTitle: job?.title || 'Unknown',
            payerId: job?.jobGiverId || (job?.jobGiver ? (job.jobGiver as any).id : 'UNKNOWN'),
            payeeId: job?.awardedInstallerId || (job?.awardedInstaller ? (job.awardedInstaller as any).id : 'ESCROW_HOLD'),
            amount: 1000,
            status: 'Funded',
            transactionType: 'JOB',
            createdAt: Timestamp.now(),
            fundedAt: Timestamp.now(),
            paymentGatewayOrderId: `TEST_ORDER_${Date.now()}`,
            paymentGatewaySessionId: `TEST_SESSION_${Date.now()}`,
            totalPaidByGiver: 2360,
            payoutToInstaller: 2000,
            platformFee: 360
        };

        await transactionRef.set(newTransaction);

        const dummyOtp = Math.floor(100000 + Math.random() * 900000).toString();
        await jobRef.update({
            status: 'In Progress',
            startOtp: dummyOtp,
            fundingDeadline: null
        });

        console.log(`SUCCESS: Job ${jobId} funded. Transaction: ${transactionId}`);
        process.exit(0);

    } catch (error) {
        console.error('Error funding job:', error);
        process.exit(1);
    }
}

const jobId = process.argv[2];
fundJob(jobId);
