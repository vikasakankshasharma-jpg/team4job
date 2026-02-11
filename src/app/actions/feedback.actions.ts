'use server';

import { getAdminDb } from '@/infrastructure/firebase/admin';
import { BetaFeedback } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

export async function saveFeedbackAction(
    userId: string,
    userName: string,
    role: string,
    rating: number,
    category: BetaFeedback['category'],
    message: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const feedbackRef = getAdminDb().collection('beta_feedback').doc();

        const feedbackData: BetaFeedback = {
            id: feedbackRef.id,
            userId,
            userName,
            role,
            rating,
            category,
            message,
            createdAt: FieldValue.serverTimestamp() as any, // Admin SDK timestamp
            status: 'new'
        };

        await feedbackRef.set(feedbackData);

        return { success: true };
    } catch (error: any) {
        console.error('Error saving feedback:', error);
        return { success: false, error: 'Failed to submit feedback. Please try again.' };
    }
}
