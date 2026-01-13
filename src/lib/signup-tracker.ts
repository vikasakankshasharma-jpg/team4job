/**
 * Pending Signup Tracker
 * Helper functions for tracking incomplete signups
 */

import { collection, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Firestore, Timestamp } from 'firebase/firestore';
import { PendingSignup, SignupStep } from './types';

/**
 * Create or update a pending signup record
 */
export async function trackSignupProgress(
    db: Firestore,
    mobile: string,
    step: SignupStep,
    data?: Partial<PendingSignup>
): Promise<void> {
    const pendingSignupsRef = collection(db, 'pending_signups');
    const docRef = doc(pendingSignupsRef, mobile); // Use mobile as document ID

    try {
        const existing = await getDoc(docRef);

        if (existing.exists()) {
            // Update existing record
            const updates: Partial<PendingSignup> = {
                currentStep: step,
                lastActiveAt: serverTimestamp() as any,
                [`stepDetails.step${step}.completed`]: true,
                [`stepDetails.step${step}.timestamp`]: serverTimestamp() as any,
                ...data,
            };

            await updateDoc(docRef, updates);
        } else {
            // Create new record
            const newSignup: PendingSignup = {
                id: mobile,
                mobile,
                currentStep: step,
                stepDetails: {
                    step1: { completed: step >= 1, timestamp: step === 1 ? (serverTimestamp() as any) : undefined },
                    step2: { completed: step >= 2, timestamp: step === 2 ? (serverTimestamp() as any) : undefined },
                    step3: { completed: step >= 3, timestamp: step === 3 ? (serverTimestamp() as any) : undefined },
                    step4: { completed: step >= 4, timestamp: step === 4 ? (serverTimestamp() as any) : undefined },
                },
                startedAt: serverTimestamp() as any,
                lastActiveAt: serverTimestamp() as any,
                attemptCount: 1,
                contacted: false,
                converted: false,
                // CRM fields
                status: 'new',
                priority: 'medium',
                activityLog: [],
                totalContactAttempts: 0,
                ...data,
            };

            await setDoc(docRef, newSignup);
        }
    } catch (error) {
        console.error('Error tracking signup progress:', error);
        throw error;
    }
}

/**
 * Mark signup as complete and remove from pending
 */
export async function markSignupComplete(
    db: Firestore,
    mobile: string,
    userId: string
): Promise<void> {
    const docRef = doc(db, 'pending_signups', mobile);

    try {
        // Option 1: Mark as converted (for analytics)
        await updateDoc(docRef, {
            converted: true,
            convertedAt: serverTimestamp(),
            convertedUserId: userId,
            status: 'converted',
        });

        // Option 2: Delete after a delay (for cleanup)
        // Uncomment if you want to auto-delete converted signups
        // setTimeout(async () => {
        //   await deleteDoc(docRef);
        // }, 7 * 24 * 60 * 60 * 1000); // Delete after 7 days

    } catch (error) {
        console.error('Error marking signup complete:', error);
        throw error;
    }
}

/**
 * Mark a pending signup as contacted by admin
 */
export async function markUserContacted(
    db: Firestore,
    mobile: string,
    adminId: string,
    notes?: string
): Promise<void> {
    const docRef = doc(db, 'pending_signups', mobile);

    try {
        await updateDoc(docRef, {
            contacted: true,
            contactedAt: serverTimestamp(),
            contactedBy: adminId,
            contactNotes: notes || '',
        });
    } catch (error) {
        console.error('Error marking user as contacted:', error);
        throw error;
    }
}

/**
 * Get all pending signups
 */
export async function getPendingSignups(db: Firestore): Promise<PendingSignup[]> {
    // This will be implemented in the admin dashboard component
    // Left as a placeholder for reference
    return [];
}

/**
 * Delete a pending signup (e.g., spam or duplicate)
 */
export async function deletePendingSignup(
    db: Firestore,
    mobile: string
): Promise<void> {
    const docRef = doc(db, 'pending_signups', mobile);
    await deleteDoc(docRef);
}
