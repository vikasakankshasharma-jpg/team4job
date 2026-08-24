import { dealerService } from '../../src/domains/dealers/dealer.service';
import { dealerRepository } from '../../src/domains/dealers/dealer.repository';
import { jobService } from '../../src/domains/jobs/job.service';
import { getAdminDb } from '../../src/infrastructure/firebase/admin';

jest.setTimeout(30000);

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.USE_EMULATOR = 'true';

describe('Phase 6: Dealer API & Operating Layer', () => {
    let db: any;
    const dealerA = 'dealer_A';
    const dealerB = 'dealer_B';

    beforeAll(async () => {
        db = getAdminDb();
        db.settings({ ignoreUndefinedProperties: true });
    });

    beforeEach(async () => {
        await db.collection('users').doc(dealerA).set({ roles: ['Dealer'] });
        await db.collection('users').doc(dealerB).set({ roles: ['Dealer'] });
    });

    afterEach(async () => {
        jest.clearAllMocks();
        try {
            await fetch('http://127.0.0.1:8080/emulator/v1/projects/team4job-test/databases/(default)/documents', {
                method: 'DELETE',
            });
        } catch (e) {
            console.error('Failed to clear emulator db', e);
        }
    });

    it('✅ Dealer A creates a job successfully with idempotency', async () => {
        const idempotencyKey = `create_job_${Date.now()}`;
        const payload = {
            title: 'Dealer Job 1',
            description: 'This is a valid dealer job',
            jobCategory: 'CCTV',
            location: 'Jaipur',
            fullAddress: '123 Street',
            address: { cityPincode: '302001' } as any,
            requesterType: 'DEALER',
            deadline: new Date(Date.now() + 86400000),
            isGstInvoiceRequired: false
        };

        const jobId = await dealerService.createJob(dealerA, payload, idempotencyKey);
        expect(jobId).toBeDefined();

        const jobDoc = await db.collection('jobs').doc(jobId).get();
        expect(jobDoc.data().dealerId).toBe(dealerA);

        // Exact same request should return the cached jobId immediately
        const jobIdDuplicate = await dealerService.createJob(dealerA, payload, idempotencyKey);
        expect(jobIdDuplicate).toBe(jobId);

        // Same key + different dealer -> reject
        await expect(dealerService.createJob(dealerB, payload, idempotencyKey))
            .rejects.toThrow('Key belongs to a different dealer');

        // Same key + different payload -> reject
        await expect(dealerService.createJob(dealerA, { ...payload, title: 'Hacked Title' }, idempotencyKey))
            .rejects.toThrow('Key reused with different payload');
    });

    it('❌ Dealer A CANNOT submit a job owned by Dealer B', async () => {
        const jobId = await dealerService.createJob(dealerB, {
            title: 'Dealer Job B',
            description: 'This is a valid dealer job',
            jobCategory: 'CCTV',
            location: 'Jaipur',
            fullAddress: '123 Street',
            address: { cityPincode: '302001' } as any,
            requesterType: 'DEALER',
            deadline: new Date(Date.now() + 86400000),
            isGstInvoiceRequired: false
        }, `key_b_1_${Date.now()}`);

        // Dealer A tries to submit it
        await expect(dealerService.submitForMatching(dealerA, jobId, `key_a_2_${Date.now()}`)).rejects.toThrow('Not authorized');
    });

    it('✅ Smart Matching returns recommendations without giving AI full authority', async () => {
        const jobId = await dealerService.createJob(dealerA, {
            title: 'Dealer Job A Matching',
            description: 'This is a valid dealer job',
            jobCategory: 'CCTV',
            location: 'Jaipur',
            fullAddress: '123 Street',
            address: { cityPincode: '302001' } as any,
            requesterType: 'DEALER',
            deadline: new Date(Date.now() + 86400000),
            isGstInvoiceRequired: false
        }, `match_key_1_${Date.now()}`);

        // Add a dummy verified professional with CCTV skill to emulator
        await db.collection('users').doc('smart_prof_1').set({
            roles: ['Professional'],
            status: 'active',
            address: { cityPincode: '302001' },
            professionalProfile: {
                verified: true,
                skills: ['CCTV'],
                rating: 5,
                reviews: 10,
                tier: 'Gold',
                tierPriority: 2,
                availability: { status: 'available' }
            }
        });

        const recommendations = await dealerService.getRecommendedInstallers(dealerA, jobId);
        expect(recommendations.length).toBeGreaterThan(0);
        expect(recommendations[0]).toHaveProperty('matchScore');
        expect(recommendations[0]).toHaveProperty('aiExplanation');
    });

    it('✅ Concurrency / Award Race: Only one request succeeds', async () => {
        const jobId = await dealerService.createJob(dealerA, {
            title: 'Race Condition Job',
            description: 'This is a valid dealer job',
            jobCategory: 'CCTV',
            location: 'Jaipur',
            fullAddress: '123 Street',
            address: { cityPincode: '302001' } as any,
            requesterType: 'DEALER',
            deadline: new Date(Date.now() + 86400000),
            isGstInvoiceRequired: false
        }, `race_key_1_${Date.now()}`);

        // Submit for matching (skip because createJob makes it open by default)
        // await dealerService.submitForMatching(dealerA, jobId, `race_key_submit_${Date.now()}`);

        // Attempt simultaneous awards using different keys but same job
        // Note: Our jobService.awardJob checks if status is 'open' or 'Open for Bidding'.

        const results = await Promise.allSettled([
            dealerService.awardInstaller(dealerA, jobId, 'prof_1', `award_1_${Date.now()}`),
            dealerService.awardInstaller(dealerA, jobId, 'prof_2', `award_2_${Date.now()}`)
        ]);

        const fulfilled = results.filter(r => r.status === 'fulfilled');
        const rejected = results.filter(r => r.status === 'rejected');
        
        console.log("REJECTED REASONS: ", rejected.map(r => (r as PromiseRejectedResult).reason.message));

        expect(fulfilled.length).toBe(1);
        expect(rejected.length).toBe(1);
        expect((rejected[0] as PromiseRejectedResult).reason.message).toMatch(/Job is not available for awarding/);

        const job = await db.collection('jobs').doc(jobId).get();
        expect(['bid_accepted', 'Awarded']).toContain(job.data().status);
    });
});
