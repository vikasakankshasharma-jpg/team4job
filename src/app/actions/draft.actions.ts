'use server';

import { draftService } from '@/domains/jobs/draft.service';
import { JobDraft, JobTemplate } from '@/lib/api/drafts';
import { logger } from '@/lib/system-logger';
import { revalidatePath } from 'next/cache';

export async function getLatestDraftAction(userId: string): Promise<{ success: boolean; draft?: JobDraft; error?: string }> {
    try {
        const draft = await draftService.getLatestDraft(userId);
        return { success: true, draft: draft ? JSON.parse(JSON.stringify(draft)) : undefined };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function saveDraftAction(
    userId: string,
    data: Partial<JobDraft>,
    draftId?: string
): Promise<{ success: boolean; draftId?: string; error?: string }> {
    try {
        const id = await draftService.saveDraft(userId, data, draftId);
        return { success: true, draftId: id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteDraftAction(userId: string, draftId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await draftService.deleteDraft(userId, draftId);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getTemplatesAction(userId: string): Promise<{ success: boolean; templates: JobTemplate[]; error?: string }> {
    try {
        const templates = await draftService.getTemplates(userId);
        return { success: true, templates: JSON.parse(JSON.stringify(templates)) };
    } catch (error: any) {
        return { success: false, templates: [], error: error.message };
    }
}

export async function incrementTemplateUsageAction(userId: string, templateId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await draftService.incrementTemplateUsage(userId, templateId);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
