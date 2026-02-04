import { getAdminDb } from "@/infrastructure/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export type LogLevel = 'info' | 'warn' | 'error' | 'critical';

export interface SystemLog {
    level: LogLevel;
    message: string;
    context: Record<string, any>;
    timestamp: Timestamp;
    environment: string;
    actorId?: string;
    actorRole?: string;
}

export interface BusinessEvent {
    eventType: 'JOB_POSTED' | 'BID_PLACED' | 'BID_ACCEPTED' | 'PAYMENT_FUNDED' | 'PAYMENT_RELEASED' | 'DISPUTE_RAISED' | 'JOB_COMPLETED';
    actorId: string;
    entityId: string;
    entityType: 'JOB' | 'BID' | 'TRANSACTION' | 'DISPUTE';
    metadata?: Record<string, any>;
    timestamp: Timestamp;
}

const IS_DEV = process.env.NODE_ENV === 'development';

export async function captureError(
    error: Error | any,
    context: Record<string, any> = {},
    actor?: { id: string; role: string }
) {
    const logEntry: SystemLog = {
        level: 'error',
        message: error.message || String(error),
        context: {
            stack: error.stack,
            ...context
        },
        timestamp: Timestamp.now(),
        environment: process.env.NODE_ENV || 'unknown',
        actorId: actor?.id,
        actorRole: actor?.role
    };

    // 1. Console Log (Always)
    console.error(`[SystemError] ${logEntry.message}`, JSON.stringify(logEntry, null, 2));

    // 2. Persist to Firestore (Production or explicit Dev)
    try {
        const db = getAdminDb();
        await db.collection('system_logs').add(logEntry);
    } catch (e) {
        console.error("Failed to persist error log:", e);
    }
}

export async function logBusinessEvent(event: Omit<BusinessEvent, 'timestamp'>) {
    const entry: BusinessEvent = {
        ...event,
        timestamp: Timestamp.now()
    };

    console.log(`[BusinessEvent] ${entry.eventType}`, JSON.stringify(entry, null, 2));

    try {
        const db = getAdminDb();
        await db.collection('business_audit_logs').add(entry);
    } catch (e) {
        console.error("Failed to persist business log:", e);
    }
}

export const logger = {
    error: captureError,
    business: logBusinessEvent
};
