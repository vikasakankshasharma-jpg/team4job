export interface RecommendedInstallerDTO {
    professionalId: string;
    name: string;
    avatarUrl?: string;
    rating: number;
    reviewsCount: number;
    tier: string;
    matchScore: number; // 0-100
    scoreBreakdown?: {
        currentPerformance: number;
        ratingQuality: number;
        reputationTier: number;
        location: number;
        relationship: number;
        penalty: number;
    };
    aiExplanation: string; // e.g. "Highly rated in your pincode."
    isPreviousInstallerAtSite: boolean;
}
