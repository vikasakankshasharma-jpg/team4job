import { getAdminDb } from '@/infrastructure/firebase/admin';
import { JobEvent, DealerOperationalKPIs, DealerFinancialKPIs } from './analytics.types';

export class DealerAnalyticsService {
    private get db() {
        return getAdminDb();
    }

    private async getEventsForDealer(dealerId: string, startDate?: Date, endDate?: Date): Promise<JobEvent[]> {
        let query = this.db.collection('job_events').where('dealerId', '==', dealerId);
        
        if (startDate) query = query.where('timestamp', '>=', startDate);
        if (endDate) query = query.where('timestamp', '<=', endDate);
        
        const snap = await query.get();
        return snap.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
            } as JobEvent;
        });
    }

    async getOperationalKPIs(dealerId: string, startDate?: Date, endDate?: Date): Promise<DealerOperationalKPIs> {
        const events = await this.getEventsForDealer(dealerId, startDate, endDate);
        
        let created = 0, awarded = 0, completed = 0, disputed = 0;
        
        // Tracking times per job
        const jobCreatedTimes: Record<string, number> = {};
        const jobAwardedTimes: Record<string, number> = {};
        const jobCompletedTimes: Record<string, number> = {};
        const jobPaidTimes: Record<string, number> = {};

        for (const e of events) {
            const time = (e.timestamp as Date).getTime();
            if (e.eventType === 'JOB_CREATED') {
                created++;
                jobCreatedTimes[e.jobId] = time;
            }
            if (e.eventType === 'JOB_AWARDED') {
                awarded++;
                jobAwardedTimes[e.jobId] = time;
            }
            if (e.eventType === 'JOB_COMPLETED') {
                completed++;
                jobCompletedTimes[e.jobId] = time;
            }
            if (e.eventType === 'JOB_DISPUTED') {
                disputed++;
            }
            if (e.eventType === 'PAYMENT_RELEASED') {
                jobPaidTimes[e.jobId] = time;
            }
        }

        // Calculate Conversion Rates
        const matchToAwardRate = created > 0 ? (awarded / created) * 100 : 0;
        const awardToCompletionRate = awarded > 0 ? (completed / awarded) * 100 : 0;

        // Calculate Velocities
        let totalTimeToAward = 0, awardCount = 0;
        for (const jid in jobAwardedTimes) {
            if (jobCreatedTimes[jid]) {
                totalTimeToAward += (jobAwardedTimes[jid] - jobCreatedTimes[jid]);
                awardCount++;
            }
        }

        let totalTimeToComplete = 0, completeCount = 0;
        for (const jid in jobCompletedTimes) {
            if (jobAwardedTimes[jid]) {
                totalTimeToComplete += (jobCompletedTimes[jid] - jobAwardedTimes[jid]);
                completeCount++;
            }
        }

        let totalTimeToPay = 0, payCount = 0;
        for (const jid in jobPaidTimes) {
            if (jobCompletedTimes[jid]) {
                totalTimeToPay += (jobPaidTimes[jid] - jobCompletedTimes[jid]);
                payCount++;
            }
        }

        const msToHrs = (ms: number) => ms / (1000 * 60 * 60);

        return {
            totalJobsCreated: created,
            jobsAwarded: awarded,
            jobsCompleted: completed,
            jobsDisputed: disputed,
            matchToAwardRate,
            awardToCompletionRate,
            avgTimeToAwardHrs: awardCount > 0 ? msToHrs(totalTimeToAward / awardCount) : 0,
            avgTimeToCompletionHrs: completeCount > 0 ? msToHrs(totalTimeToComplete / completeCount) : 0,
            avgPaymentReleaseHrs: payCount > 0 ? msToHrs(totalTimeToPay / payCount) : 0
        };
    }

    async getFinancialKPIs(dealerId: string, startDate?: Date, endDate?: Date): Promise<DealerFinancialKPIs> {
        const events = await this.getEventsForDealer(dealerId, startDate, endDate);
        
        let totalRevenue = 0, totalMargin = 0, totalInstallerPayouts = 0;

        for (const e of events) {
            if (e.eventType === 'JOB_COMPLETED' || e.eventType === 'PAYMENT_RELEASED') {
                // We consider revenue officially realized upon completion or payment.
                // Using PAYMENT_RELEASED for strict financial counting.
                if (e.eventType === 'PAYMENT_RELEASED') {
                    if (e.b2bPrice) totalRevenue += e.b2bPrice;
                    if (e.dealerMargin) totalMargin += e.dealerMargin;
                    if (e.b2bPrice && e.dealerMargin) totalInstallerPayouts += (e.b2bPrice - e.dealerMargin);
                }
            }
        }

        return {
            totalRevenue,
            totalMargin,
            totalInstallerPayouts
        };
    }

    async getInstallerEarningsForDealer(dealerId: string, installerId: string): Promise<number> {
        // STRICT PRIVACY: Query filtered by dealerId FIRST, then installerId.
        // Prevents Dealer A from seeing what Installer earned from Dealer B.
        const snap = await this.db.collection('job_events')
            .where('dealerId', '==', dealerId)
            .where('installerId', '==', installerId)
            .where('eventType', '==', 'PAYMENT_RELEASED')
            .get();
        
        let earnings = 0;
        snap.docs.forEach(d => {
            const e = d.data();
            if (e.b2bPrice && e.dealerMargin) {
                earnings += (e.b2bPrice - e.dealerMargin);
            }
        });

        return earnings;
    }
}

export const dealerAnalyticsService = new DealerAnalyticsService();
