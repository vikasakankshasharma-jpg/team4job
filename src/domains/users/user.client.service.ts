
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/infrastructure/firebase/client';

/**
 * Client-Side User Service
 * Handles client-side user updates and logic isolation.
 */
export const userClientService = {
    /**
     * Save FCM Token to user profile
     */
    async saveFcmToken(userId: string, token: string): Promise<void> {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                fcmTokens: arrayUnion(token)
            });
        } catch (error) {
            throw error;
        }
    }
};
