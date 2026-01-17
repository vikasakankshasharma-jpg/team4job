import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/server-init';

export type AdminActionType =
    | 'USER_SUSPENDED'
    | 'USER_ACTIVATED'
    | 'USER_DELETED'
    | 'USER_VERIFIED'
    | 'JOB_DELETED'
    | 'JOB_FLAGGED'
    | 'DISPUTE_RESOLVED'
    | 'REFUND_PROCESSED'
    | 'SETTINGS_CHANGED'
    | 'TEAM_MEMBER_ADDED'
    | 'TEAM_MEMBER_REMOVED'
    | 'SUBSCRIPTION_GRANTED'
    | 'COUPON_CREATED'
    | 'BLACKLIST_UPDATED'
    | 'IMPERSONATE_USER';

export interface AdminActionLog {
    id: string;
    adminId: string;
    adminName: string;
    adminEmail: string;
    actionType: AdminActionType;
    targetType: 'user' | 'job' | 'dispute' | 'transaction' | 'settings' | 'team' | 'coupon' | 'blacklist';
    targetId?: string;
    targetName?: string;
    details: Record<string, any>;
    timestamp: Timestamp;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Log an admin action to Firestore for audit trail
 * Should be called from API routes (server-side only)
 */
export async function logAdminAction(params: {
    adminId: string;
    adminName: string;
    adminEmail: string;
    actionType: AdminActionType;
    targetType: AdminActionLog['targetType'];
    targetId?: string;
    targetName?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;

}): Promise<void> {
    try {
        const db = getAdminDb();
        const logEntry: Omit<AdminActionLog, 'id'> = {
            adminId: params.adminId,
            adminName: params.adminName,
            adminEmail: params.adminEmail,
            actionType: params.actionType,
            targetType: params.targetType,
            targetId: params.targetId,
            targetName: params.targetName,
            details: params.details || {},
            timestamp: Timestamp.now(),
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
        };

        await db.collection('admin_action_logs').add(logEntry);
    } catch (error) {
        console.error('Failed to log admin action:', error);
        // Don't throw - logging failure shouldn't break the main operation
    }
}

/**
 * Get action type display name
 */
export function getActionTypeLabel(actionType: AdminActionType): string {
    const labels: Record<AdminActionType, string> = {
        USER_SUSPENDED: 'User Suspended',
        USER_ACTIVATED: 'User Activated',
        USER_DELETED: 'User Deleted',
        USER_VERIFIED: 'Installer Verified',
        JOB_DELETED: 'Job Deleted',
        JOB_FLAGGED: 'Job Flagged',
        DISPUTE_RESOLVED: 'Dispute Resolved',
        REFUND_PROCESSED: 'Refund Processed',
        SETTINGS_CHANGED: 'Settings Changed',
        TEAM_MEMBER_ADDED: 'Team Member Added',
        TEAM_MEMBER_REMOVED: 'Team Member Removed',
        SUBSCRIPTION_GRANTED: 'Subscription Granted',
        COUPON_CREATED: 'Coupon Created',
        BLACKLIST_UPDATED: 'Blacklist Updated',
        IMPERSONATE_USER: 'Impersonated User',
    };

    return labels[actionType] || actionType;
}

/**
 * Legacy function: Create admin alerts (for backward compatibility)
 * Creates real-time alerts in admin_alerts collection
 */
export async function logAdminAlert(
    level: 'INFO' | 'WARNING' | 'CRITICAL',
    message: string,
    metadata?: any

): Promise<void> {
    try {
        const db = getAdminDb();
        await db.collection('admin_alerts').add({
            level,
            message,
            metadata: metadata || {},
            timestamp: Timestamp.now(),
            read: false,
        });
    } catch (error) {
        console.error('Failed to create admin alert:', error);
    }
}
