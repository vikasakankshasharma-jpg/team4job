'use server';

import { dealerService } from '@/domains/dealers/dealer.service';
import { jobRepository } from '@/domains/jobs/job.repository';
import { requireAuth } from '@/lib/auth-server';
import { Job } from '@/lib/types';
import { revalidatePath } from 'next/cache';

/**
 * Fetch a single job safely for a dealer
 */
export async function getDealerJobAction(jobId: string): Promise<{ success: boolean; data?: Job; error?: string }> {
    try {
        const { uid: dealerId } = await requireAuth();
        const job = await jobRepository.fetchById(jobId);
        if (!job || job.dealerId !== dealerId) {
            throw new Error('Not found or unauthorized');
        }
        return { success: true, data: JSON.parse(JSON.stringify(job)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Get Smart Matches for a job
 */
export async function getRecommendedInstallersAction(jobId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
        const { uid: dealerId } = await requireAuth();
        const recommendations = await dealerService.getRecommendedInstallers(dealerId, jobId);
        return { success: true, data: JSON.parse(JSON.stringify(recommendations)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Submit job for matching
 */
export async function submitForMatchingAction(jobId: string, idempotencyKey: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { uid: dealerId } = await requireAuth();
        await dealerService.submitForMatching(dealerId, jobId, idempotencyKey);
        revalidatePath(`/dashboard/dealer-jobs/${jobId}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Award a job to an installer
 */
export async function awardInstallerAction(jobId: string, professionalId: string, idempotencyKey: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { uid: dealerId } = await requireAuth();
        await dealerService.awardInstaller(dealerId, jobId, professionalId, idempotencyKey);
        revalidatePath(`/dashboard/dealer-jobs/${jobId}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Cancel Job
 */
export async function cancelDealerJobAction(jobId: string, reason: string, idempotencyKey: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { uid: dealerId } = await requireAuth();
        await dealerService.cancelJob(dealerId, jobId, reason, idempotencyKey);
        revalidatePath(`/dashboard/dealer-jobs/${jobId}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
import { dealerMemoryService } from '@/domains/dealers/dealer-memory.service';

export async function createCustomerAction(payload: any) {
    try {
        const { uid: dealerId } = await requireAuth();
        const customer = await dealerMemoryService.createCustomer(dealerId, payload);
        revalidatePath('/dashboard/dealer-workspace/customers');
        return { success: true, data: JSON.parse(JSON.stringify(customer)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function listCustomersAction() {
    try {
        const { uid: dealerId } = await requireAuth();
        const customers = await dealerMemoryService.getCustomersByDealer(dealerId);
        return { success: true, data: JSON.parse(JSON.stringify(customers)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createServiceSiteAction(payload: any) {
    try {
        const { uid: dealerId } = await requireAuth();
        const site = await dealerMemoryService.createServiceSite(dealerId, payload);
        revalidatePath('/dashboard/dealer-workspace/customers');
        return { success: true, data: JSON.parse(JSON.stringify(site)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function listServiceSitesAction() {
    try {
        const { uid: dealerId } = await requireAuth();
        const sites = await dealerMemoryService.getServiceSitesByDealer(dealerId);
        return { success: true, data: JSON.parse(JSON.stringify(sites)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getCustomerWithSitesAction(customerId: string) {
    try {
        const { uid: dealerId } = await requireAuth();
        const data = await dealerMemoryService.getCustomerWithSites(dealerId, customerId);
        return { success: true, data: JSON.parse(JSON.stringify(data)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateCustomerAction(customerId: string, payload: any) {
    try {
        const { uid: dealerId } = await requireAuth();
        await dealerMemoryService.updateCustomer(dealerId, customerId, payload);
        revalidatePath('/dashboard/dealer-workspace/customers');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function archiveCustomerAction(customerId: string) {
    try {
        const { uid: dealerId } = await requireAuth();
        await dealerMemoryService.archiveCustomer(dealerId, customerId);
        revalidatePath('/dashboard/dealer-workspace/customers');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateServiceSiteAction(siteId: string, payload: any) {
    try {
        const { uid: dealerId } = await requireAuth();
        await dealerMemoryService.updateServiceSite(dealerId, siteId, payload);
        revalidatePath('/dashboard/dealer-workspace/customers');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function archiveServiceSiteAction(siteId: string) {
    try {
        const { uid: dealerId } = await requireAuth();
        await dealerMemoryService.archiveServiceSite(dealerId, siteId);
        revalidatePath('/dashboard/dealer-workspace/customers');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
export async function getRepeatJobTemplateAction(siteId: string) {
    try {
        const { uid: dealerId } = await requireAuth();
        const template = await dealerMemoryService.getRepeatJobTemplate(dealerId, siteId);
        return { success: true, data: JSON.parse(JSON.stringify(template)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
