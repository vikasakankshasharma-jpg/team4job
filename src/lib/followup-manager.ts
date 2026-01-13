/**
 * Follow-Up Manager for Pending Signups CRM
 * Handles scheduling, denial tracking, activity logging, and status updates
 */

import {
    doc,
    updateDoc,
    arrayUnion,
    serverTimestamp,
    Firestore,
    collection,
    query,
    where,
    getDocs,
    getDoc,
    Timestamp,
} from 'firebase/firestore';
import type {
    PendingSignup,
    SignupStatus,
    SignupPriority,
    DenialReason,
    ActivityLogEntry,
    ContactOutcome,
} from './types';

/**
 * Schedule a follow-up contact for a pending signup
 */
export async function scheduleFollowUp(
    db: Firestore,
    mobile: string,
    followUpDate: Date,
    priority: SignupPriority,
    adminId: string,
    adminName: string,
    notes: string,
    nextAction?: string
): Promise<void> {
    const signupRef = doc(db, 'pending_signups', mobile);

    const activityEntry: Omit<ActivityLogEntry, 'timestamp'> = {
        id: `activity_${Date.now()}`,
        adminId,
        adminName,
        action: 'note',
        outcome: 'scheduled',
        notes,
        nextAction,
        followUpScheduled: Timestamp.fromDate(followUpDate),
    };

    await updateDoc(signupRef, {
        status: 'follow_up',
        priority,
        followUpDate: Timestamp.fromDate(followUpDate),
        activityLog: arrayUnion({
            ...activityEntry,
            timestamp: serverTimestamp(),
        }),
        lastActiveAt: serverTimestamp(),
    });
}

/**
 * Mark a signup as denied with reason
 */
export async function markAsDenied(
    db: Firestore,
    mobile: string,
    reason: DenialReason,
    customReason: string | undefined,
    adminId: string,
    adminName: string,
    notes: string
): Promise<void> {
    const signupRef = doc(db, 'pending_signups', mobile);

    const activityEntry: Omit<ActivityLogEntry, 'timestamp'> = {
        id: `activity_${Date.now()}`,
        adminId,
        adminName,
        action: 'status_change',
        outcome: 'denied',
        notes: `Denied: ${notes}`,
    };

    await updateDoc(signupRef, {
        status: 'denied',
        denialInfo: {
            denied: true,
            reason,
            customReason: reason === 'other' ? customReason : undefined,
            deniedAt: serverTimestamp(),
            deniedBy: adminId,
        },
        activityLog: arrayUnion({
            ...activityEntry,
            timestamp: serverTimestamp(),
        }),
        lastActiveAt: serverTimestamp(),
    });
}

/**
 * Add an activity log entry
 */
export async function addActivityLog(
    db: Firestore,
    mobile: string,
    adminId: string,
    adminName: string,
    action: ActivityLogEntry['action'],
    outcome: ContactOutcome | undefined,
    notes: string,
    nextAction?: string
): Promise<void> {
    const signupRef = doc(db, 'pending_signups', mobile);

    const activityEntry: Omit<ActivityLogEntry, 'timestamp'> = {
        id: `activity_${Date.now()}`,
        adminId,
        adminName,
        action,
        outcome,
        notes,
        nextAction,
    };

    // Determine new status based on outcome
    let newStatus: SignupStatus | undefined;
    if (outcome === 'busy') {
        newStatus = 'busy';
    } else if (outcome === 'answered' || outcome === 'voicemail') {
        newStatus = 'contacted';
    }

    const updates: any = {
        activityLog: arrayUnion({
            ...activityEntry,
            timestamp: serverTimestamp(),
        }),
        totalContactAttempts: (await getContactAttempts(db, mobile)) + 1,
        lastContactedAt: serverTimestamp(),
        lastContactedBy: adminId,
        lastActiveAt: serverTimestamp(),
    };

    if (newStatus) {
        updates.status = newStatus;
    }

    await updateDoc(signupRef, updates);
}

/**
 * Update signup status and priority
 */
export async function updateSignupStatus(
    db: Firestore,
    mobile: string,
    status: SignupStatus,
    priority?: SignupPriority,
    adminId?: string,
    adminName?: string
): Promise<void> {
    const signupRef = doc(db, 'pending_signups', mobile);

    const updates: any = {
        status,
        lastActiveAt: serverTimestamp(),
    };

    if (priority) {
        updates.priority = priority;
    }

    // Log the status change
    if (adminId && adminName) {
        const activityEntry: Omit<ActivityLogEntry, 'timestamp'> = {
            id: `activity_${Date.now()}`,
            adminId,
            adminName,
            action: 'status_change',
            notes: `Status changed to: ${status}${priority ? `, Priority: ${priority}` : ''}`,
        };

        updates.activityLog = arrayUnion({
            ...activityEntry,
            timestamp: serverTimestamp(),
        });
    }

    await updateDoc(signupRef, updates);
}

/**
 * Get contact attempts count
 */
async function getContactAttempts(db: Firestore, mobile: string): Promise<number> {
    const signupRef = doc(db, 'pending_signups', mobile);
    const snapshot = await getDoc(signupRef);
    const data = snapshot.data();
    return data?.totalContactAttempts || 0;
}

/**
 * Get follow-ups scheduled for today
 */
export async function getTodaysFollowUps(db: Firestore): Promise<PendingSignup[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const q = query(
        collection(db, 'pending_signups'),
        where('followUpDate', '>=', Timestamp.fromDate(today)),
        where('followUpDate', '<', Timestamp.fromDate(tomorrow)),
        where('converted', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as PendingSignup);
}

/**
 * Get overdue follow-ups
 */
export async function getOverdueFollowUps(db: Firestore): Promise<PendingSignup[]> {
    const now = new Date();

    const q = query(
        collection(db, 'pending_signups'),
        where('followUpDate', '<', Timestamp.fromDate(now)),
        where('converted', '==', false),
        where('status', '!=', 'denied')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as PendingSignup);
}

/**
 * Get follow-ups for this week
 */
export async function getThisWeeksFollowUps(db: Firestore): Promise<PendingSignup[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const q = query(
        collection(db, 'pending_signups'),
        where('followUpDate', '>=', Timestamp.fromDate(today)),
        where('followUpDate', '<', Timestamp.fromDate(nextWeek)),
        where('converted', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as PendingSignup);
}

/**
 * Mark user as busy and schedule follow-up
 */
export async function markAsBusyAndSchedule(
    db: Firestore,
    mobile: string,
    followUpDate: Date,
    adminId: string,
    adminName: string,
    notes: string
): Promise<void> {
    await scheduleFollowUp(
        db,
        mobile,
        followUpDate,
        'medium',
        adminId,
        adminName,
        `User was busy. ${notes}`,
        'Call again'
    );

    await updateSignupStatus(db, mobile, 'busy', undefined, adminId, adminName);
}
