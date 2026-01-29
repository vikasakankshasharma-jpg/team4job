'use server';

import { userService } from '@/domains/users/user.service';
import { revalidatePath } from 'next/cache';

/**
 * Server Action to update user profile
 */
export async function updateProfileAction(userId: string, data: any) {
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
