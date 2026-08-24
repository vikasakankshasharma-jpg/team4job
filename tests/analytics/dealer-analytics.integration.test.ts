import { eventLedgerService } from '@/domains/analytics/event-ledger.service';
import { dealerAnalyticsService } from '@/domains/analytics/dealer-analytics.service';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import * as admin from 'firebase-admin';

describe('Phase 9D - Cross-Dealer Adversarial Analytics & Audit Engine', () => {
    process.env.NEXT_PUBLIC_USE_EMULATOR = 'true';
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.FIREBASE_PROJECT_ID = 'demo-stitch-test';

    const db = getAdminDb();
    const dealerA = 'dealer_a_123';
    const dealerB = 'dealer_b_999';
    const installerX = 'inst_x_456';
    const jobA = 'job_a_1';
    const jobB = 'job_b_1';

    beforeAll(async () => {
        await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-stitch-test/databases/(default)/documents', { method: 'DELETE' });

        // Simulate historical events for Dealer A
        await eventLedgerService.logEvent({ eventType: 'JOB_CREATED', dealerId: dealerA, jobId: jobA, actorId: 'u1' });
        await eventLedgerService.logEvent({ eventType: 'JOB_AWARDED', dealerId: dealerA, jobId: jobA, actorId: 'u1', installerId: installerX });
        await eventLedgerService.logEvent({ eventType: 'JOB_COMPLETED', dealerId: dealerA, jobId: jobA, actorId: installerX });
        
        // This is the immutable event that locks in the financials
        await eventLedgerService.logEvent({ 
            eventType: 'PAYMENT_RELEASED', dealerId: dealerA, jobId: jobA, actorId: 'u1', 
            installerId: installerX, b2bPrice: 500, dealerMargin: 100 
        }); // Installer gets 400

        // Simulate events for Dealer B (Different financials)
        await eventLedgerService.logEvent({ eventType: 'JOB_CREATED', dealerId: dealerB, jobId: jobB, actorId: 'u2' });
        await eventLedgerService.logEvent({ eventType: 'JOB_AWARDED', dealerId: dealerB, jobId: jobB, actorId: 'u2', installerId: installerX });
        await eventLedgerService.logEvent({ eventType: 'JOB_COMPLETED', dealerId: dealerB, jobId: jobB, actorId: installerX });
        
        await eventLedgerService.logEvent({ 
            eventType: 'PAYMENT_RELEASED', dealerId: dealerB, jobId: jobB, actorId: 'u2', 
            installerId: installerX, b2bPrice: 1000, dealerMargin: 200 
        }); // Installer gets 800

        // Orphaned Event (No Dealer)
        try {
            await eventLedgerService.logEvent({ eventType: 'JOB_CREATED', dealerId: '', jobId: 'job_orphan', actorId: 'u1' });
        } catch (e) {}
    });

    it('Cross-Dealer Inference: Dealer A should only see their own financials', async () => {
        const kpisA = await dealerAnalyticsService.getFinancialKPIs(dealerA);
        expect(kpisA.totalRevenue).toBe(500);
        expect(kpisA.totalMargin).toBe(100);
        
        const kpisB = await dealerAnalyticsService.getFinancialKPIs(dealerB);
        expect(kpisB.totalRevenue).toBe(1000);
        expect(kpisB.totalMargin).toBe(200);
    });

    it('Installer Privacy: Dealer A should only see Installer earnings from Dealer A', async () => {
        const earningsFromA = await dealerAnalyticsService.getInstallerEarningsForDealer(dealerA, installerX);
        expect(earningsFromA).toBe(400); // 500 - 100
        
        const earningsFromB = await dealerAnalyticsService.getInstallerEarningsForDealer(dealerB, installerX);
        expect(earningsFromB).toBe(800); // 1000 - 200

        // Dealer A CANNOT query Dealer B's context. The service interface forces dealerId.
    });

    it('Historical Consistency: Mutable Job document changes do not affect Analytics', async () => {
        // Create a mutable job document
        await db.collection('jobs').doc(jobA).set({
            id: jobA,
            dealerId: dealerA,
            b2bPrice: 500 // Original
        });

        // "Malicious" or retroactive admin edit changes the mutable document
        await db.collection('jobs').doc(jobA).update({
            b2bPrice: 9999 // Changed!
        });

        // Analytics query must STILL return 500
        const kpis = await dealerAnalyticsService.getFinancialKPIs(dealerA);
        expect(kpis.totalRevenue).toBe(500); // Tied to immutable event
    });

    it('Operational Metrics: Should accurately track volumes and conversions', async () => {
        const kpis = await dealerAnalyticsService.getOperationalKPIs(dealerA);
        expect(kpis.totalJobsCreated).toBe(1);
        expect(kpis.jobsAwarded).toBe(1);
        expect(kpis.jobsCompleted).toBe(1);
        expect(kpis.matchToAwardRate).toBe(100);
        expect(kpis.awardToCompletionRate).toBe(100);
    });
});
