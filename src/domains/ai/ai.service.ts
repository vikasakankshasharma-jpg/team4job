
import {
    ModerateContentInput,
    ModerateContentOutput,
    GenerateJobDescriptionInput,
    GenerateJobDescriptionOutput,
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
} from './ai.types';
import { logger } from '@/infrastructure/logger';

/**
 * AI Service - Domain Entry Point for AI Features
 * Encapsulates GenKit flows and adds domain-level logic (logging, etc.)
 */
export class AIService {

    /**
     * Moderate user content (messages, bios, etc.)
     */
    async moderateContent(input: ModerateContentInput): Promise<ModerateContentOutput> {
        try {
            const { moderateMessageFlow } = await import('@/ai/flows/moderate-message');
            const result = await moderateMessageFlow({
                message: input.content,
                userId: input.userId,
                limitType: input.limitType || 'ai_chat'
            });

            return {
                isFlagged: result.isFlagged,
                reason: result.reason
            };

        } catch (error: any) {
            logger.error('AI Moderation Failed', error, { userId: input.userId });
            return { isFlagged: false };
        }
    }

    /**
     * Generate Job Description from Title
     */
    async generateJobDescription(input: GenerateJobDescriptionInput): Promise<GenerateJobDescriptionOutput> {
        try {
            const { generateJobDetailsFlow } = await import('@/ai/flows/generate-job-details');
            const result = await generateJobDetailsFlow({
                jobTitle: input.jobTitle
            });

            return {
                jobDescription: result.jobDescription,
                suggestedSkills: result.suggestedSkills
            };
        } catch (error: any) {
            logger.error('AI Job Gen Failed', error, { title: input.jobTitle });
            throw new Error('Failed to generate job description');
        }
    }

    /**
     * Generate Price Estimate
     */
    async generatePriceEstimate(input: GeneratePriceEstimateInput): Promise<GeneratePriceEstimateOutput> {
        try {
            const { generatePriceEstimateFlow } = await import('@/ai/flows/generate-price-estimate');
            const result = await generatePriceEstimateFlow({
                jobTitle: input.jobTitle,
                jobDescription: input.jobDescription,
                jobCategory: input.jobCategory
            });

            return result;
        } catch (error: any) {
            logger.error('AI Price Est Failed', error, { title: input.jobTitle });
            throw new Error('Failed to generate price estimate');
        }
    }

    async initiateAadharVerification(input: InitiateAadharInput): Promise<InitiateAadharOutput> {
        try {
            const { initiateAadharVerification } = await import('@/ai/flows/aadhar-verification');
            return await initiateAadharVerification(input);
        } catch (error: any) {
            logger.error('AI Aadhar Init Failed', error);
            throw new Error(error.message || 'Verification initiation failed');
        }
    }

    async confirmAadharVerification(input: ConfirmAadharInput): Promise<ConfirmAadharOutput> {
        try {
            const { confirmAadharVerification } = await import('@/ai/flows/aadhar-verification');
            return await confirmAadharVerification(input);
        } catch (error: any) {
            logger.error('AI Aadhar Confirm Failed', error);
            throw new Error(error.message || 'Verification confirmation failed');
        }
    }

    async verifyPan(input: VerifyPanInput): Promise<VerifyPanOutput> {
        try {
            const { verifyPan } = await import('@/ai/flows/pan-verification');
            return await verifyPan(input);
        } catch (error: any) {
            logger.error('AI PAN Verif Failed', error);
            throw new Error(error.message || 'PAN verification failed');
        }
    }

    async recommendJobs(input: RecommendJobsInput): Promise<RecommendJobsOutput> {
        try {
            const { recommendJobs } = await import('@/ai/flows/recommend-jobs');
            return await recommendJobs(input);
        } catch (error: any) {
            logger.error('AI Recommendation Failed', error);
            return { recommendations: [] };
        }
    }

    async aiAssistedBidCreation(input: AiAssistedBidCreationInput): Promise<AiAssistedBidCreationOutput> {
        try {
            const { aiAssistedBidCreation } = await import('@/ai/flows/ai-assisted-bid-creation');
            return await aiAssistedBidCreation(input);
        } catch (error: any) {
            logger.error('AI Bid Asst Failed', error);
            throw new Error(error.message || 'Bid generation failed');
        }
    }

    async verifyGst(input: VerifyGstInput): Promise<VerifyGstOutput> {
        try {
            const { verifyGst } = await import('@/ai/flows/gst-verification');
            return await verifyGst(input);
        } catch (error: any) {
            logger.error('AI GST Verif Failed', error);
            throw new Error(error.message || 'GST verification failed');
        }
    }

    async rewardTopPerformers(input: RewardTopPerformersInput): Promise<RewardTopPerformersOutput> {
        try {
            const { rewardTopPerformers } = await import('@/ai/flows/reward-top-performers');
            return await rewardTopPerformers(input);
        } catch (error: any) {
            logger.error('AI Reward Top Performers Failed', error);
            throw new Error(error.message || 'Reward automation failed');
        }
    }
}

export const aiService = new AIService();
