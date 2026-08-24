'use server';

import { getAuthDealerId } from '@/infrastructure/auth/server-auth';
import { dealerAnalyticsService } from '@/domains/analytics/dealer-analytics.service';

export async function getDealerOperationalKPIsAction() {
    const dealerId = await getAuthDealerId();
    if (!dealerId) throw new Error('Unauthorized');
    
    // Defaulting to all-time for now, can be extended with date ranges
    return await dealerAnalyticsService.getOperationalKPIs(dealerId);
}

export async function getDealerFinancialKPIsAction() {
    const dealerId = await getAuthDealerId();
    if (!dealerId) throw new Error('Unauthorized');

    return await dealerAnalyticsService.getFinancialKPIs(dealerId);
}

export async function getInstallerEarningsAction(installerId: string) {
    const dealerId = await getAuthDealerId();
    if (!dealerId) throw new Error('Unauthorized');

    return await dealerAnalyticsService.getInstallerEarningsForDealer(dealerId, installerId);
}
