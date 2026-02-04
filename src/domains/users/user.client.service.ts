
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

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
            console.error('Error saving FCM token:', error);
            throw error;
        }
    }
};
