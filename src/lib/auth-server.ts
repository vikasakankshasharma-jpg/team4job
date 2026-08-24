import { cookies } from 'next/headers';
import { getAdminAuth } from '@/infrastructure/firebase/admin';

/**
 * Utility to get the user ID from the session cookie on the server.
 * This works in Server Components and Server Actions.
 */
export async function getUserIdFromSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) return null;

    try {
        const adminAuth = getAdminAuth();
        // Add timeout to prevent SSR hangs
        const decodedToken = await Promise.race([
            adminAuth.verifyIdToken(token),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 10000))
        ]);
        return decodedToken.uid;
    } catch (error: any) {
        return null;
    }
}

/**
 * Validates the session and ensures the caller is authorized.
 * Prevents IDOR by optionally checking if the session matches the target user ID.
 */
export async function requireAuth(targetUserId?: string): Promise<{ uid: string; isStaff: boolean }> {
    const authUid = await getUserIdFromSession();
    if (!authUid) {
        throw new Error('Unauthenticated: Missing or invalid session token.');
    }

    const { AdminGuard } = await import('@/lib/auth/admin-guard');
    const isStaff = await AdminGuard.isStaff(authUid);

    // Prevent IDOR: If a target ID is provided, the caller must either BE that user, or be a Staff member.
    if (targetUserId && targetUserId !== authUid && !isStaff) {
        throw new Error(`Unauthorized: IDOR attempt blocked. Session UID does not match target ${targetUserId}.`);
    }

    return { uid: authUid, isStaff };
}

/**
 * Strictly requires the caller's session to have Staff privileges.
 */
export async function requireStaffSession(): Promise<{ uid: string }> {
    const { uid, isStaff } = await requireAuth();
    if (!isStaff) {
        throw new Error('Unauthorized: Staff privileges required.');
    }
    return { uid };
}
