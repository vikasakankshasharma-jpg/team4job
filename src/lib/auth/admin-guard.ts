// lib/auth/admin-guard.ts

import { getAdminDb } from '@/infrastructure/firebase/admin';
import { Role } from '@/lib/types';

/**
 * AdminGuard - Utilities for server-side role verification
 */
export class AdminGuard {
    /**
     * Checks if a user has Admin or Support Team privileges
     * @param userId - The user ID from the session/token
     * @returns boolean
     */
    static async isStaff(userId: string): Promise<boolean> {
        try {
            const db = getAdminDb();
            const userDoc = await db.collection('users').doc(userId).get();

            if (!userDoc.exists) return false;

            const roles = userDoc.data()?.roles as Role[] || [];
            return roles.includes('Admin') || roles.includes('Support Team');
        } catch (error) {
            console.error('[AdminGuard] Verification failed:', error);
            return false;
        }
    }

    /**
     * Strictly checks for Admin role
     */
    static async isAdmin(userId: string): Promise<boolean> {
        try {
            const db = getAdminDb();
            const userDoc = await db.collection('users').doc(userId).get();

            if (!userDoc.exists) return false;

            const roles = userDoc.data()?.roles as Role[] || [];
            return roles.includes('Admin');
        } catch (error) {
            console.error('[AdminGuard] Admin verification failed:', error);
            return false;
        }
    }

    /**
     * Throws an error if the user is not staff
     */
    static async requireStaff(userId: string): Promise<void> {
        const staff = await this.isStaff(userId);
        if (!staff) {
            throw new Error('Unauthorized: Staff privileges required');
        }
    }
}
