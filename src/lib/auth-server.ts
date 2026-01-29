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
        const decodedToken = await adminAuth.verifyIdToken(token);
        return decodedToken.uid;
    } catch (error) {
        console.error('[AuthServer] Failed to verify ID token:', error);
        return null;
    }
}
