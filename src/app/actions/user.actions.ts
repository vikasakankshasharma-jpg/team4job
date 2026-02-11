'use server';

import { userService } from '@/domains/users/user.service';
import { revalidatePath } from 'next/cache';
import { User } from '@/lib/types';
import { UpdateProfileInput } from '@/domains/users/user.types';

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
        console.error('updateProfileAction error:', error);
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
        console.error('getProfileAction error:', error);
        return { success: false, error: error.message || 'Failed to fetch profile' };
    }
}


/**
 * Server Action to get related installers for "My Installers" page
 * Fetches installers from completed jobs + favorites + blocked
 */
export async function getRelatedInstallersAction(userId: string) {
    try {
        const { jobService } = await import('@/domains/jobs/job.service');

        // 1. Get unique installer IDs from completed jobs
        const hiredInstallerIds = await jobService.getRelatedInstallerIds(userId);

        // 2. Get User Profile to check favorites/blocked
        // We can't trust client-side user object for security, so fetch from service or use what's passed if we verify auth
        // Use service to get user's lists
        const user = await userService.getProfile(userId);

        const allIds = new Set([
            ...hiredInstallerIds,
            ...(user.favoriteInstallerIds || []),
            ...(user.blockedInstallerIds || [])
        ]);

        if (allIds.size === 0) {
            return { success: true, installers: [] };
        }

        // 3. Fetch Public Profiles
        // We need array of User objects. userService.getPublicProfiles returns a Map currently?
        // Let's check user.service definition: Returns Map<string, any>
        // But the MyInstallersClient needs an Array of User objects.
        // I will use userRepository directly or add listUsers(ids) to service.
        // user.service.ts had listInstallers but that takes filters.
        // Let's use `userRepository.fetchPublicProfiles` which returns Map, and convert to array.
        // Or better: use `userService.getPublicProfiles` which calls repo.

        const profileMap = await userService.getPublicProfiles(Array.from(allIds));
        const installers = Array.from(profileMap.values()).map((p: any) => ({ ...p, id: p.id || p.uid } as User));
        // Ensure ID is present. MyInstallersClient expects User[].

        return { success: true, installers: JSON.parse(JSON.stringify(installers)) };

    } catch (error: any) {
        console.error('getRelatedInstallersAction error:', error);
        return { success: false, error: error.message || 'Failed to fetch installers' };
    }
}

/**
 * Server Action to list installers with pagination
 * @param limit - Number of installers per page (default 50)
 * @param lastMemberSince - ISO string of last installer's memberSince for cursor pagination
 * @param verified - Filter by verified status (default true)
 */
export async function listInstallersAction(limit = 50, lastMemberSince?: string, verified = true) {
    try {
        const installers = await userService.listInstallersWithPagination(
            limit,
            lastMemberSince ? new Date(lastMemberSince) : undefined,
            verified
        );
        return { success: true, data: JSON.parse(JSON.stringify(installers)) };
    } catch (error: any) {
        console.error('listInstallersAction error:', error);
        return { success: false, data: [], error: error.message || 'Failed to list installers' };
    }
}

