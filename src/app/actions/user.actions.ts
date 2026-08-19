'use server';

import { userService } from '@/domains/users/user.service';
import { userRepository } from '@/domains/users/user.repository';
import { revalidatePath } from 'next/cache';
import { User, UpdateProfileInput } from '@/lib/types';

/**
 * Server Action to update user profile
 */
export async function updateProfileAction(userId: string, data: UpdateProfileInput) {
    try {
        await userService.updateProfile(userId, data);
        revalidatePath('/dashboard/profile');
        revalidatePath(`/dashboard/users/${userId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to update profile' };
    }
}

/**
 * Server Action to get user profile
 */
export async function getProfileAction(userId: string) {
    try {
        const user = await userService.getProfile(userId);
        return { success: true, user: JSON.parse(JSON.stringify(user)) };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to fetch profile' };
    }
}


/**
 * Server Action to get related Professionals for "My Professionals" page
 * Fetches Professionals from completed jobs + favorites + blocked
 */
export async function getRelatedProfessionalsAction(userId: string) {
    try {
        const { jobService } = await import('@/domains/jobs/job.service');

        // 1. Get unique Professional IDs from completed jobs
        const hiredprofessionalIds = await jobService.getRelatedprofessionalIds(userId);

        // 2. Get User Profile to check favorites/blocked
        // We can't trust client-side user object for security, so fetch from service or use what's passed if we verify auth
        // Use service to get user's lists
        const user = await userService.getProfile(userId);

        const allIds = new Set([
            ...hiredprofessionalIds,
            ...(user.favoriteProfessionalIds || []),
            ...(user.blockedProfessionalIds || [])
        ]);

        if (allIds.size === 0) {
            return { success: true, Professionals: [] };
        }

        // 3. Fetch Public Profiles
        // We need array of User objects. userService.getPublicProfiles returns a Map currently?
        // Let's check user.service definition: Returns Map<string, any>
        // But the MyProfessionalsClient needs an Array of User objects.
        // I will use userRepository directly or add listUsers(ids) to service.
        // user.service.ts had listProfessionals but that takes filters.
        // Let's use `userRepository.fetchPublicProfiles` which returns Map, and convert to array.
        // Or better: use `userService.getPublicProfiles` which calls repo.

        const profileMap = await userService.getPublicProfiles(Array.from(allIds));
        const Professionals = Array.from(profileMap.values()).map((p: any) => ({ ...p, id: p.id || p.uid } as User));
        // Ensure ID is present. MyProfessionalsClient expects User[].

        return { success: true, Professionals: JSON.parse(JSON.stringify(Professionals)) };

    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to fetch Professionals' };
    }
}

/**
 * Server Action to list Professionals with pagination
 * @param limit - Number of Professionals per page (default 50)
 * @param lastMemberSince - ISO string of last Professional's memberSince for cursor pagination
 * @param verified - Filter by verified status (default true)
 */
export async function listProfessionalsAction(limit = 50, lastMemberSince?: string, verified = true) {
    try {
        const Professionals = await userService.listProfessionalsWithPagination(
            limit,
            lastMemberSince ? new Date(lastMemberSince) : undefined,
            verified
        );
        return { success: true, data: JSON.parse(JSON.stringify(Professionals)) };
    } catch (error: any) {
        return { success: false, data: [], error: error.message || 'Failed to list Professionals' };
    }
}






export async function addPortfolioItemAction(userId: string, item: any) {
    try {
        const user = await userRepository.fetchById(userId);
        if (!user) throw new Error("User not found");

        const currentProfile = user.professionalProfile || {} as any;
        const currentPortfolio = currentProfile.portfolio || [];
        
        const newItem = {
            ...item,
            id: Math.random().toString(36).substring(7),
            completedAt: new Date().toISOString(),
        };

        const updatedProfile = {
            ...currentProfile,
            portfolio: [newItem, ...currentPortfolio],
        };

        await userRepository.update(userId, {
            professionalProfile: updatedProfile as any,
        });

        return { success: true, id: newItem.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deletePortfolioItemAction(userId: string, itemId: string) {
    try {
        const user = await userRepository.fetchById(userId);
        if (!user || !user.professionalProfile || !user.professionalProfile.portfolio) {
            return { success: true };
        }

        const updatedPortfolio = user.professionalProfile.portfolio.filter((item: any) => item.id !== itemId);
        
        const updatedProfile = {
            ...user.professionalProfile,
            portfolio: updatedPortfolio,
        };

        await userRepository.update(userId, {
            professionalProfile: updatedProfile as any,
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function adminApproveKYCAction(userId: string) {
    try {
        const user = await userRepository.fetchById(userId);
        if (!user) throw new Error("User not found");

        const updatedProfile = {
            ...(user.professionalProfile || {}),
            verified: true,
        };

        await userRepository.update(userId, {
            kycStatus: 'verified',
            professionalProfile: updatedProfile as any,
        });

        revalidatePath('/dashboard/admin/kyc');
        revalidatePath(`/dashboard/users/${userId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to approve KYC' };
    }
}

export async function adminRejectKYCAction(userId: string, reason?: string) {
    try {
        const user = await userRepository.fetchById(userId);
        if (!user) throw new Error("User not found");

        await userRepository.update(userId, {
            kycStatus: 'rejected',
            // optionally we could store the reason, but we'll just set the status for now
        });

        revalidatePath('/dashboard/admin/kyc');
        revalidatePath(`/dashboard/users/${userId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to reject KYC' };
    }
}
