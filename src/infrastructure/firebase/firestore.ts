// infrastructure/firebase/firestore.ts

import {
    DocumentData,
    QueryDocumentSnapshot,
    Timestamp,
    FirestoreDataConverter,
    WithFieldValue,
    DocumentSnapshot,
} from 'firebase/firestore';

/**
 * Generic Firestore converter for automatic timestamp conversion
 * Converts Firestore Timestamps to JavaScript Dates
 */
export function createConverter<T>(): FirestoreDataConverter<T> {
    return {
        toFirestore(data: WithFieldValue<T>): DocumentData {
            return data as DocumentData;
        },
        fromFirestore(snapshot: QueryDocumentSnapshot): T {
            const data = snapshot.data();
            return convertTimestamps(data) as T;
        },
    };
}

/**
 * Recursively convert Timestamp objects to Date objects
 */
function convertTimestamps(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Handle Timestamp objects
    if (obj instanceof Timestamp) {
        return obj.toDate();
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(convertTimestamps);
    }

    // Handle plain objects
    if (typeof obj === 'object' && obj.constructor === Object) {
        const converted: any = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                converted[key] = convertTimestamps(obj[key]);
            }
        }
        return converted;
    }

    return obj;
}

/**
 * Safely extract data from a document snapshot
 */
export function getDocData<T>(doc: DocumentSnapshot): T | null {
    if (!doc.exists()) {
        return null;
    }
    const data = doc.data();
    return convertTimestamps({ id: doc.id, ...data }) as T;
}

/**
 * Convert a Date to Firestore Timestamp
 */
export function toTimestamp(date: Date | Timestamp): Timestamp {
    if (date instanceof Timestamp) {
        return date;
    }
    return Timestamp.fromDate(date);
}

/**
 * Collection names - centralized to avoid typos
 */
export const COLLECTIONS = {
    USERS: 'users',
    JOBS: 'jobs',
    BIDS: 'bids',
    DISPUTES: 'disputes',
    TRANSACTIONS: 'transactions',
    NOTIFICATIONS: 'notifications',
    AUDIT_LOGS: 'auditLogs',
    SUBSCRIPTION_PLANS: 'subscriptionPlans',
    COUPONS: 'coupons',
    BLACKLIST: 'blacklist',
    SAVED_SEARCHES: 'savedSearches',
    PENDING_SIGNUPS: 'pendingSignups',
    PUBLIC_PROFILES: 'public_profiles',
} as const;
