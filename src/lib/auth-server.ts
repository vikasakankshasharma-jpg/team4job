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
        const isSessionError = 
            error.code === 'auth/id-token-revoked' || 
            error.code === 'auth/id-token-expired' ||
            error.message?.includes('revoked') ||
            error.message?.includes('expired');

        if (isSessionError) {
            console.warn(`[AuthServer] Session invalid: ${error.message}`);
        } else {
            console.error(`[AuthServer] Error verifying token: ${error.message}`);
        }
        return null;
    }
}
