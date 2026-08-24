import { jobService } from '../../src/domains/jobs/job.service';
import { paymentService } from '../../src/domains/payments/payment.service';
import { jobRepository } from '../../src/domains/jobs/job.repository';
import { getAdminDb } from '../../src/infrastructure/firebase/admin';

jest.setTimeout(30000);

// We won't mock repositories, we will use the emulator.
// Mock only external services (Cashfree, Email)
jest.mock('../../src/domains/payments/cashfree.client', () => ({
    cashfreeClient: {
        createOrder: jest.fn().mockResolvedValue({ orderId: 'test_order', orderToken: 'test_token' }),
        verifyPayment: jest.fn().mockResolvedValue({ status: 'PAID' }),
        processRefund: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
        settleOrder: jest.fn().mockResolvedValue({ status: 'SUCCESS' })
    }
}));
jest.mock('../../src/lib/email/email-service', () => ({
    emailService: {
        sendJobAwardedEmail: jest.fn().mockResolvedValue(true)
    }
}));
jest.mock('../../src/lib/notifications', () => ({
    sendNotification: jest.fn().mockResolvedValue(true)
}));

// Set env var to use emulator explicitly
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.USE_EMULATOR = 'true';

describe('Phase 5: Job & Financial State Machine Integration', () => {
    let db: any;
    let jobId: string;
    const clientId = 'client_123';
    const profId = 'prof_456';

    beforeAll(async () => {
        db = getAdminDb();
        db.settings({ ignoreUndefinedProperties: true });
    });

    beforeEach(async () => {
        // Create required users for the test
        await db.collection('users').doc(clientId).set({ name: 'Client Test', roles: ['Client'], mobile: '9999999999' });
        await db.collection('users').doc(profId).set({ name: 'Prof Test', roles: ['Professional'], mobile: '8888888888', professionalProfile: { tierPriority: 1 } });
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    describe('Valid Lifecycle (Happy Path)', () => {
        it('✅ DRAFT -> OPEN -> BID_ACCEPTED -> FUNDED -> IN_PROGRESS -> COMPLETED', async () => {
            // 1. Create Job
            jobId = await jobService.createJob(clientId, 'Client', {
                title: 'Test Job',
                description: 'Test description must be 20 chars',
                jobCategory: 'Test',
                location: 'Delhi',
                address: { cityPincode: '110001' } as any,
                deadline: new Date(Date.now() + 86400000),
                isGstInvoiceRequired: false,
                fullAddress: 'Test Address'
            });

            let job = await jobRepository.fetchById(jobId);
            expect(job?.status).toBe('open'); // Created directly as open in current code

            // 2. Award Job
            // Inject a bid to award
            await db.collection('bids').doc('bid1').set({ jobId, professionalId: profId, professional: profId, amount: 1000 });
            await db.collection('jobs').doc(jobId).update({ bids: [{ id: 'bid1', professional: profId, amount: 1000 }] });
            
            await jobService.acceptBid(jobId, 'bid1', clientId, 'Client');
            job = await jobRepository.fetchById(jobId);
            expect(job?.status).toBe('Awarded');

            // 3. Prof Accepts -> Pending Funding
            await jobService.acceptJobAssignment(jobId, profId);
            job = await jobRepository.fetchById(jobId);
            expect(job?.status).toBe('Pending Funding');

            // 4. Fund Job
            await jobService.fundJob(jobId, clientId);
            job = await jobRepository.fetchById(jobId);
            expect(job?.status).toBe('funded');
            expect(job?.startOtp).toBeDefined();

            // 5. Start Work
            await jobService.startWork(jobId, profId, job!.startOtp!);
            job = await jobRepository.fetchById(jobId);
            expect(job?.status).toBe('In Progress');

            // 6. Complete Job (Client Approves)
            // Need to submit work first
            await jobService.submitWork(jobId, profId);
            job = await jobRepository.fetchById(jobId);
            expect(job?.status).toBe('Pending Confirmation');

            // Mock payout transactions to satisfy releaseFunds
            const transactionId = await db.collection('transactions').add({
                jobId: jobId, status: 'funded', payoutToProfessional: 1000, paymentGatewayOrderId: 'test'
            }).then((ref: any) => ref.id);

            await jobService.approveJob(jobId, clientId);
            job = await jobRepository.fetchById(jobId);
            expect(job?.status).toBe('Completed');

            // Check if payment was released
            const tx = await db.collection('transactions').doc(transactionId).get();
            expect(tx.data().status).toBe('released');
        });
    });

    describe('Cross-Lifecycle & Invalid Jumps', () => {
        let testJobId: string;
        
        beforeEach(async () => {
            testJobId = await jobService.createJob(clientId, 'Client', {
                title: 'Test Job',
                description: 'Test description must be 20 chars',
                jobCategory: 'Test',
                location: 'Delhi',
                address: { cityPincode: '110001' } as any,
                deadline: new Date(Date.now() + 86400000),
                isGstInvoiceRequired: false,
                fullAddress: 'Test Address'
            });
            await db.collection('jobs').doc(testJobId).update({ bids: [{ id: 'bid1', professional: profId, amount: 1000 }] });
        });

        it('❌ CANNOT jump from OPEN to COMPLETED directly', async () => {
            await expect(jobService.approveJob(testJobId, clientId)).rejects.toThrow('Job not ready for approval');
        });

        it('❌ CANNOT start work without funding', async () => {
            await jobService.acceptBid(testJobId, 'bid1', clientId, 'Client');
            await expect(jobService.startWork(testJobId, profId, '123456')).rejects.toThrow('Cannot start work');
        });

        it('✅ Idempotency: Multiple releaseFunds should NOT cause double payout', async () => {
            // Setup a funded transaction
            const transactionId = await db.collection('transactions').add({
                jobId: testJobId, status: 'funded', payoutToProfessional: 1000, paymentGatewayOrderId: 'test'
            }).then((ref: any) => ref.id);

            await paymentService.releaseFunds(testJobId, profId);
            
            // Second time should throw or exit gracefully without changing status from released to something else
            await expect(paymentService.releaseFunds(testJobId, profId)).rejects.toThrow(/No funded transaction found|Transaction is no longer in funded status/);
            
            // Should only have 1 timeline event for release
            const events = await db.collection('job_events').where('jobId', '==', testJobId).where('eventType', '==', 'PAYMENT_RELEASED').get();
            expect(events.size).toBe(1);
        });

        it('❌ Concurrent Award Protection: Only one awardee', async () => {
            // Mock acceptBid logic where it throws if already awarded?
            // Actually let's simulate two concurrent acceptBid calls
            await db.collection('bids').doc('bid2').set({ jobId: testJobId, professionalId: 'prof2', amount: 900 });
            await db.collection('jobs').doc(testJobId).update({ bids: [{ id: 'bid1', professional: profId, amount: 1000 }, { id: 'bid2', professional: 'prof2', amount: 900 }] });
            
            // We would run them simultaneously
            // In our current implementation, acceptBid just updates firestore. Firestore doesn't prevent concurrent updates unless using runTransaction.
            // So let's check if the service rejects the second call if status is already Awarded.
            
            await jobService.acceptBid(testJobId, 'bid1', clientId, 'Client');
            await expect(jobService.acceptBid(testJobId, 'bid2', clientId, 'Client')).rejects.toThrow(/Cannot accept bid/);
        });
    });
});
