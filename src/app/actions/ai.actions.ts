'use server';

import { aiService } from '@/domains/ai/ai.service';
import {
    GenerateJobDescriptionInput,
    GenerateJobDescriptionOutput,
    ModerateContentInput,
    ModerateContentOutput,
    GeneratePriceEstimateInput,
    GeneratePriceEstimateOutput,
    InitiateAadharInput,
    InitiateAadharOutput,
    ConfirmAadharInput,
    ConfirmAadharOutput,
    VerifyPanInput,
    VerifyPanOutput,
    RecommendJobsInput,
    RecommendJobsOutput,
    AiAssistedBidCreationInput,
    AiAssistedBidCreationOutput,
    VerifyGstInput,
    VerifyGstOutput,
    RewardTopPerformersInput,
    RewardTopPerformersOutput
} from '@/domains/ai/ai.types';

/**
 * Server Action for Content Moderation
 */
export async function moderateContentAction(input: ModerateContentInput): Promise<{ success: boolean; data?: ModerateContentOutput; error?: string }> {
    try {
        const result = await aiService.moderateContent(input);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action for Job Description Generation
 */
export async function generateJobDescriptionAction(input: GenerateJobDescriptionInput): Promise<{ success: boolean; data?: GenerateJobDescriptionOutput; error?: string }> {
    try {
        const result = await aiService.generateJobDescription(input);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action for Price Estimation
 */
export async function generatePriceEstimateAction(input: GeneratePriceEstimateInput): Promise<{ success: boolean; data?: GeneratePriceEstimateOutput; error?: string }> {
    try {
        const result = await aiService.generatePriceEstimate(input);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action for Aadhar Verification Initiation
 */
export async function initiateAadharVerificationAction(input: InitiateAadharInput): Promise<{ success: boolean; data?: InitiateAadharOutput; error?: string }> {
    try {
        const result = await aiService.initiateAadharVerification(input);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action for Aadhar Verification Confirmation
 */
export async function confirmAadharVerificationAction(input: ConfirmAadharInput): Promise<{ success: boolean; data?: ConfirmAadharOutput; error?: string }> {
    try {
        const result = await aiService.confirmAadharVerification(input);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action for PAN Verification
 */
export async function verifyPanAction(input: VerifyPanInput): Promise<{ success: boolean; data?: VerifyPanOutput; error?: string }> {
    try {
        const result = await aiService.verifyPan(input);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action for Job Recommendations
 */
export async function recommendJobsAction(input: RecommendJobsInput): Promise<{ success: boolean; data?: RecommendJobsOutput; error?: string }> {
    try {
        const result = await aiService.recommendJobs(input);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action for AI Assisted Bid Creation
 */
export async function aiAssistedBidCreationAction(input: AiAssistedBidCreationInput): Promise<{ success: boolean; data?: AiAssistedBidCreationOutput; error?: string }> {
    try {
        const result = await aiService.aiAssistedBidCreation(input);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action for GST Verification
 */
export async function verifyGstAction(input: VerifyGstInput): Promise<{ success: boolean; data?: VerifyGstOutput; error?: string }> {
    try {
        const result = await aiService.verifyGst(input);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action for Monthly Reward Automation
 */
export async function rewardTopPerformersAction(input: RewardTopPerformersInput): Promise<{ success: boolean; data?: RewardTopPerformersOutput; error?: string }> {
    try {
        const result = await aiService.rewardTopPerformers(input);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
