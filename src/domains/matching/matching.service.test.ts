import { matchingService } from './matching.service';
import { jobRepository } from '@/domains/jobs/job.repository';
import { userRepository } from '@/domains/users/user.repository';
import { Job, User } from '@/lib/types';

jest.mock('@/domains/jobs/job.repository');
jest.mock('@/domains/users/user.repository');

describe('Smart Matching Service - Reputation Gate v2', () => {
    let mockJob: Partial<Job>;
    let mockCandidates: Partial<User>[];
    let mockHistory: Partial<Job>[];

    beforeEach(() => {
        jest.clearAllMocks();

        mockJob = {
            id: 'job-1',
            jobCategory: 'CCTV Installation',
            address: { cityPincode: '400001' } as any,
            serviceLocationId: 'loc-123',
            requesterType: 'DEALER'
        } as any;

        (jobRepository.fetchById as jest.Mock).mockResolvedValue(mockJob);
        
        mockCandidates = [];
        (userRepository.queryProfessionals as jest.Mock).mockImplementation(() => Promise.resolve(mockCandidates));
        
        mockHistory = [];
        (jobRepository.getServiceHistory as jest.Mock).mockImplementation(() => Promise.resolve(mockHistory));
    });

    const addCandidate = (id: string, rating: number, tier: string, reviews: number, points: number, pincode: string) => {
        const c: Partial<User> = {
            id,
            name: "Installer " + id,
            status: 'active',
            address: { cityPincode: pincode } as any,
            professionalProfile: {
                rating,
                reviews,
                points,
                activeCyclePoints: points, // Map for testing current performance
                tier: tier as any,
                availability: { status: 'available' },
                skills: ['CCTV Installation']
            } as any
        };
        mockCandidates.push(c);
        return c;
    };

    it('TC4: Segregation of Quality and Experience (Confidence Engine)', async () => {
        // Very Low Confidence (1 review)
        addCandidate('New', 5.0, 'Bronze', 1, 50, '400001');
        // High Potential Engine (3 reviews, perfect rating)
        addCandidate('HighPot', 5.0, 'Bronze', 3, 150, '400001');
        // Medium Confidence (15 reviews)
        addCandidate('Med', 4.5, 'Silver', 15, 600, '400001');
        // High Confidence Veteran (150 reviews)
        addCandidate('Vet', 4.8, 'Platinum', 150, 2500, '400001');

        const matches = await matchingService.getSmartMatches('job-1');
        expect(matches).toHaveLength(4);
        
        const mNew = matches.find(m => m.professionalId === 'New');
        const mHighPot = matches.find(m => m.professionalId === 'HighPot');
        const mMed = matches.find(m => m.professionalId === 'Med');
        const mVet = matches.find(m => m.professionalId === 'Vet');
        
        // Quality checks
        expect(mNew?.scoreBreakdown?.ratingQuality).toBe(6); // (5/5)*20 * 0.3
        expect(mHighPot?.scoreBreakdown?.ratingQuality).toBe(18); // (5/5)*20 * 0.9 (Boosted)
        expect(mMed?.scoreBreakdown?.ratingQuality).toBe(14.4); // (4.5/5)*20 * 0.8
        expect(mVet?.scoreBreakdown?.ratingQuality).toBe(19.2); // (4.8/5)*20 * 1.0 (No penalty)
        
        // Reputation Tier
        expect(mNew?.scoreBreakdown?.reputationTier).toBe(0);
        expect(mHighPot?.scoreBreakdown?.reputationTier).toBe(0);
        expect(mMed?.scoreBreakdown?.reputationTier).toBe(5);
        expect(mVet?.scoreBreakdown?.reputationTier).toBe(15);
    });
});
