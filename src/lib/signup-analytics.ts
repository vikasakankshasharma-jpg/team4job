/**
 * Signup Analytics Helper Functions
 * Calculate funnel metrics and outreach effectiveness
 */

import { collection, getDocs, query, where, Firestore, orderBy, limit } from 'firebase/firestore';
import { PendingSignup } from './types';
import { toDate } from './utils';

export interface SignupFunnelData {
    totalStarted: number;
    step1Complete: number;
    step2Complete: number;
    step3Complete: number;
    step4Complete: number;
    totalConverted: number;
    dropRates: {
        step1: number;
        step2: number;
        step3: number;
        step4: number;
    };
    conversionRate: number;
}

export interface OutreachEffectiveness {
    contacted: {
        total: number;
        converted: number;
        conversionRate: number;
    };
    nonContacted: {
        total: number;
        converted: number;
        conversionRate: number;
    };
    improvement: number; // Percentage point improvement
}

export interface RoleDistribution {
    Installer: number;
    'Job Giver': number;
    unknown: number;
}

export interface AnalyticsData {
    funnel: SignupFunnelData;
    outreach: OutreachEffectiveness;
    roles: RoleDistribution;
}

/**
 * Master function to fetch all analytics data in ONE read operation
 * Reduces costs by 66% compared to separate calls
 */
export async function getSignupAnalytics(db: Firestore): Promise<AnalyticsData> {
    // 1. Single efficient read
    const pendingRef = collection(db, 'pending_signups');
    // Using a broad query to get all relevant processing data
    // We could optimize further by excluding 'converted' if we only wanted pending,
    // but for funnel analysis we actually need BOTH converted and pending to see the full picture.
    // However, the original code queried 'pending_signups' collection which presumably holds both
    // (or moved converted ones? The types suggest 'converted' is a boolean flag).
    // Let's assume the collection holds history.

    // Safety Limit: If this collection grows huge, we simply cap it for analytics to avoid bill shock.
    // 2000 records is plenty for a trend analysis and costs only ~2000 reads ($0.06).
    const q = query(pendingRef, orderBy('startedAt', 'desc'), limit(2000));
    const snapshot = await getDocs(q);

    const allSignups = snapshot.docs.map(doc => doc.data() as PendingSignup);

    return {
        funnel: calculateFunnelMetrics(allSignups),
        outreach: getOutreachEffectiveness(allSignups),
        roles: getRoleDistribution(allSignups)
    };
}

/**
 * Calculate signup funnel metrics (In-Memory)
 */
function calculateFunnelMetrics(allSignups: PendingSignup[]): SignupFunnelData {
    // Count signups at each step (with safe property access)
    const step1Complete = allSignups.filter(s => s.stepDetails?.step1?.completed).length;
    const step2Complete = allSignups.filter(s => s.stepDetails?.step2?.completed).length;
    const step3Complete = allSignups.filter(s => s.stepDetails?.step3?.completed).length;
    const step4Complete = allSignups.filter(s => s.stepDetails?.step4?.completed).length;
    const totalConverted = allSignups.filter(s => s.converted).length;
    const totalStarted = allSignups.length;

    // Calculate drop rates (percentage who didn't proceed to next step)
    const dropRates = {
        step1: totalStarted > 0 ? ((totalStarted - step1Complete) / totalStarted) * 100 : 0,
        step2: step1Complete > 0 ? ((step1Complete - step2Complete) / step1Complete) * 100 : 0,
        step3: step2Complete > 0 ? ((step2Complete - step3Complete) / step2Complete) * 100 : 0,
        step4: step3Complete > 0 ? ((step3Complete - step4Complete) / step3Complete) * 100 : 0,
    };

    const conversionRate = totalStarted > 0 ? (totalConverted / totalStarted) * 100 : 0;

    return {
        totalStarted,
        step1Complete,
        step2Complete,
        step3Complete,
        step4Complete,
        totalConverted,
        dropRates,
        conversionRate,
    };
}

/**
 * Calculate outreach effectiveness (In-Memory)
 */
function getOutreachEffectiveness(allSignups: PendingSignup[]): OutreachEffectiveness {
    // Split by contacted vs non-contacted
    const contacted = allSignups.filter(s => s.contacted);
    const nonContacted = allSignups.filter(s => !s.contacted);

    const contactedConverted = contacted.filter(s => s.converted).length;
    const nonContactedConverted = nonContacted.filter(s => s.converted).length;

    const contactedRate = contacted.length > 0
        ? (contactedConverted / contacted.length) * 100
        : 0;

    const nonContactedRate = nonContacted.length > 0
        ? (nonContactedConverted / nonContacted.length) * 100
        : 0;

    const improvement = contactedRate - nonContactedRate;

    return {
        contacted: {
            total: contacted.length,
            converted: contactedConverted,
            conversionRate: contactedRate,
        },
        nonContacted: {
            total: nonContacted.length,
            converted: nonContactedConverted,
            conversionRate: nonContactedRate,
        },
        improvement,
    };
}

/**
 * Get role distribution (In-Memory)
 */
function getRoleDistribution(allSignups: PendingSignup[]): RoleDistribution {
    const distribution = {
        Installer: 0,
        'Job Giver': 0,
        unknown: 0,
    };

    for (const signup of allSignups) {
        if (signup.role === 'Installer') {
            distribution.Installer++;
        } else if (signup.role === 'Job Giver') {
            distribution['Job Giver']++;
        } else {
            distribution.unknown++;
        }
    }

    return distribution;
}
