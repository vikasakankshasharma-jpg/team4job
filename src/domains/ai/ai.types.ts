
export interface ModerateContentInput {
    content: string;
    userId?: string;
    limitType?: 'ai_chat' | 'ai_bio';
}

export interface ModerateContentOutput {
    isFlagged: boolean;
    reason?: string;
}

export interface GenerateJobDescriptionInput {
    jobTitle: string;
}

export interface GenerateJobDescriptionOutput {
    jobDescription: string;
    suggestedSkills: string[];
}

export interface GeneratePriceEstimateInput {
    jobTitle: string;
    jobDescription: string;
    jobCategory: string;
}

export interface GeneratePriceEstimateOutput {
    priceEstimate: {
        min: number;
        max: number;
        currency: string;
    };
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    factors: string[];
}

export interface InitiateAadharInput {
    aadharNumber: string;
}

export interface InitiateAadharOutput {
    success: boolean;
    verificationId: string;
    message: string;
}

export interface ConfirmAadharInput {
    verificationId: string;
    otp: string;
}

export interface ConfirmAadharOutput {
    isVerified: boolean;
    message: string;
    kycData?: {
        name: string;
        mobile: string;
        pincode: string;
    };
}

export interface VerifyPanInput {
    pan: string;
    name?: string;
}

export interface VerifyPanOutput {
    isValid: boolean;
    registeredName?: string;
    message: string;
}

export interface RecommendJobsInput {
    installerSkills: string[];
    installerLocation?: string;
    jobs: Array<{
        id: string;
        title: string;
        description: string;
        location: string;
        skills?: string[];
    }>;
}

export interface RecommendJobsOutput {
    recommendations: Array<{
        jobId: string;
        score: number;
        reason: string;
    }>;
}

export interface AiAssistedBidCreationInput {
    jobDescription: string;
    installerSkills: string;
    installerExperience: string;
    bidContext?: string;
    userId: string;
}

export interface AiAssistedBidCreationOutput {
    bidProposal: string;
    reasoning: string;
}

export interface VerifyGstInput {
    gstin: string;
    businessName?: string;
}

export interface VerifyGstOutput {
    isValid: boolean;
    legalName?: string;
    message: string;
}

export interface RewardTopPerformersInput {
}

export interface RewardTopPerformersOutput {
    success: boolean;
    summary: string;
    rewardedUsers: Array<{ id: string; name: string }>;
}
