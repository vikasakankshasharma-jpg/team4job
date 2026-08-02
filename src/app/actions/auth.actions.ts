"use server";

import { cookies } from 'next/headers';

/**
 * Sets the auth-token cookie with HttpOnly flag for security
 */
export async function updateSessionTokenAction(token: string) {
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 3600 // 1 hour
    });
}

import { getAdminDb } from '@/infrastructure/firebase/admin';
import { User } from '@/lib/types';

/**
 * Clears the auth-token cookie
 */
export async function removeSessionTokenAction() {
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
}

/**
 * Fetches user profile from server side using Admin SDK
 */
export async function getUserProfileAction(uid: string): Promise<User | null> {
    const startTime = Date.now();
    console.log(`[AuthAction] Fetching profile for UID: ${uid}`);
    try {
        const db = getAdminDb();
        
        // Add a race to prevent indefinite hanging in slow dev environments
        const profileDoc = await Promise.race([
            db.collection('users').doc(uid).get(),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 10000))
        ]);

        if (profileDoc.exists) {
            const data = profileDoc.data();
            console.log(`[AuthAction] Profile found for ${uid} in ${Date.now() - startTime}ms`);
            
            // Helper to recursively serialize timestamps
            const serializeTimestamps = (obj: any): any => {
                if (!obj || typeof obj !== 'object') return obj;
                
                if (obj._seconds !== undefined || obj.seconds !== undefined) {
                    return {
                        seconds: obj._seconds ?? obj.seconds,
                        nanoseconds: obj._nanoseconds ?? obj.nanoseconds ?? 0
                    };
                }

                if (Array.isArray(obj)) {
                    return obj.map(serializeTimestamps);
                }

                const result: any = {};
                for (const key in obj) {
                    result[key] = serializeTimestamps(obj[key]);
                }
                return result;
            };

            const userData = { 
                id: profileDoc.id, 
                ...serializeTimestamps(data)
            };
            return userData as User;
        }
        console.log(`[AuthAction] Profile NOT found for ${uid} in ${Date.now() - startTime}ms`);
        return null;
    } catch (error: any) {
        console.error(`[AuthAction] Error fetching user profile [${Date.now() - startTime}ms]:`, error.message);
        return null;
    }
}
