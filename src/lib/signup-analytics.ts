/**
 * Signup Analytics Helper Functions
 * Calculate funnel metrics and outreach effectiveness
 */

import { collection, getDocs, query, where, Firestore } from 'firebase/firestore';
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

/**
 * Calculate signup funnel metrics
 */
export async function calculateFunnelMetrics(db: Firestore): Promise<SignupFunnelData> {
    const pendingRef = collection(db, 'pending_signups');
    const snapshot = await getDocs(pendingRef);

    const allSignups = snapshot.docs.map(doc => doc.data() as PendingSignup);

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
 * Calculate outreach effectiveness
 */
export async function getOutreachEffectiveness(db: Firestore): Promise<OutreachEffectiveness> {
    const pendingRef = collection(db, 'pending_signups');
    const snapshot = await getDocs(pendingRef);

    const allSignups = snapshot.docs.map(doc => doc.data() as PendingSignup);

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
 * Get recent signup trends (last N days)
 */
export async function getSignupTrends(
    db: Firestore,
    days: number = 7
): Promise<Array<{ date: string; started: number; converted: number }>> {
    const pendingRef = collection(db, 'pending_signups');
    const snapshot = await getDocs(pendingRef);

    const allSignups = snapshot.docs.map(doc => doc.data() as PendingSignup);

    // Group by date
    const trends: Record<string, { started: number; converted: number }> = {};

    for (const signup of allSignups) {
        const date = toDate(signup.startedAt).toISOString().split('T')[0];

        if (!trends[date]) {
            trends[date] = { started: 0, converted: 0 };
        }

        trends[date].started++;
        if (signup.converted) {
            trends[date].converted++;
        }
    }

    // Convert to array and sort by date
    return Object.entries(trends)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-days);
}

/**
 * Get role distribution
 */
export async function getRoleDistribution(
    db: Firestore
): Promise<{ Installer: number; 'Job Giver': number; unknown: number }> {
    const pendingRef = collection(db, 'pending_signups');
    const snapshot = await getDocs(pendingRef);

    const allSignups = snapshot.docs.map(doc => doc.data() as PendingSignup);

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
