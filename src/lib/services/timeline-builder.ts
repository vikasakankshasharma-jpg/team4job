/**
 * Timeline Builder Service
 * Aggregates job events from multiple sources into a unified timeline
 */

import { Job, User } from "@/lib/types";
import { toDate } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";

export interface TimelineEvent {
    id: string;
    type: 'status_change' | 'bid' | 'message' | 'payment' | 'review' | 'system';
    timestamp: Date | Timestamp;
    title: string;
    description?: string;
    actor?: string;  // User ID or 'system'
    actorName?: string;
    metadata?: Record<string, any>;
    icon?: string;  // Icon name for rendering
    color?: string;  // Color class for visual distinction
}

export interface CommunicationItem {
    id: string;
    jobId: string;
    type: 'job_giver_message' | 'installer_message' | 'system_update';
    content: string;
    author: string | 'system';  // User ID or 'system'
    authorName?: string;
    timestamp: Date | Timestamp;
    read: boolean;
    attachments?: string[];
}

/**
 * Build complete timeline from job data and communications
 */
export function buildJobTimeline(
    job: Job,
    communications: CommunicationItem[] = []
): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    let eventId = 0;

    // 1. Job creation
    events.push({
        id: `event-${eventId++}`,
        type: 'status_change',
        title: 'Job Posted',
        description: job.title,
        timestamp: job.postedAt,
        actor: job.jobGiverId,
        icon: 'CheckCircle',
        color: 'green',
    });

    // 2. Bids received
    if (job.bids && job.bids.length > 0) {
        job.bids.forEach((bid, idx) => {
            events.push({
                id: `event-${eventId++}`,
                type: 'bid',
                title: 'New Bid Received',
                description: `₹${bid.amount.toLocaleString()}`,
                timestamp: bid.timestamp,
                actor: bid.installerId || 'unknown',
                actorName: (bid.installer as any).name || 'Installer',
                metadata: { bidAmount: bid.amount },
                icon: 'DollarSign',
                color: 'blue',
            });
        });
    }

    // 3. Bidding deadline
    if (job.deadline) {
        const deadline = toDate(job.deadline);
        const now = new Date();
        if (deadline > now) {
            events.push({
                id: `event-${eventId++}`,
                type: 'system',
                title: 'Bidding Deadline',
                description: `Closes ${deadline.toLocaleDateString()}`,
                timestamp: job.deadline,
                actor: 'system',
                icon: 'Clock',
                color: 'amber',
            });
        }
    }

    // 4. Status changes from statusHistory
    if (job.statusHistory && job.statusHistory.length > 0) {
        job.statusHistory.forEach((change) => {
            events.push({
                id: `event-${eventId++}`,
                type: 'status_change',
                title: `Status Changed`,
                description: `${change.oldStatus} → ${change.newStatus}`,
                timestamp: change.timestamp,
                actor: change.changedBy,
                metadata: { oldStatus: change.oldStatus, newStatus: change.newStatus, reason: change.reason },
                icon: 'ArrowRight',
                color: 'green',
            });
        });
    }

    // 5. Award event (if no statusHistory)
    if (job.awardedInstallerId && !job.statusHistory?.some(h => h.newStatus === 'Awarded')) {
        events.push({
            id: `event-${eventId++}`,
            type: 'status_change',
            title: 'Job Awarded',
            description: 'Installer selected',
            timestamp: job.postedAt, // Fallback as awardedAt is not available
            actor: job.jobGiverId,
            icon: 'Award',
            color: 'green',
        });
    }

    // 6. Payment events
    if (job.invoice?.id) {
        events.push({
            id: `event-${eventId++}`,
            type: 'payment',
            title: 'Payment Completed',
            description: job.invoice.totalAmount ? `₹${job.invoice.totalAmount.toLocaleString()}` : '',
            timestamp: job.invoice.date || job.postedAt,
            actor: job.jobGiverId,
            icon: 'Wallet',
            color: 'blue',
        });
    }

    // 7. Work started
    if (job.workStartedAt) {
        events.push({
            id: `event-${eventId++}`,
            type: 'status_change',
            title: 'Work Started',
            description: 'Installer began work',
            timestamp: job.workStartedAt,
            actor: typeof job.awardedInstaller === 'string' ? job.awardedInstaller : 'installer',
            icon: 'PlayCircle',
            color: 'green',
        });
    }

    // 8. Work submitted
    if (job.workSubmittedAt) {
        events.push({
            id: `event-${eventId++}`,
            type: 'status_change',
            title: 'Work Completed',
            description: 'Installer marked as complete',
            timestamp: job.workSubmittedAt,
            actor: typeof job.awardedInstaller === 'string' ? job.awardedInstaller : 'installer',
            icon: 'CheckCircle2',
            color: 'green',
        });
    }

    // 9. Reviews exchanged
    if (job.jobGiverReview) {
        events.push({
            id: `event-${eventId++}`,
            type: 'review',
            title: 'Review Given',
            description: `${job.jobGiverReview.rating} stars`,
            timestamp: job.jobGiverReview.createdAt,
            actor: job.jobGiverId,
            icon: 'Star',
            color: 'yellow',
        });
    }

    if (job.installerReview) {
        events.push({
            id: `event-${eventId++}`,
            type: 'review',
            title: 'Review Received',
            description: `${job.installerReview.rating} stars`,
            timestamp: job.installerReview.createdAt,
            actor: job.installerReview.authorId,
            icon: 'Star',
            color: 'yellow',
        });
    }

    // 10. Communications
    communications.forEach((comm) => {
        events.push({
            id: `event-${eventId++}`,
            type: 'message',
            title: comm.type === 'system_update' ? comm.content : 'New Message',
            description: comm.type !== 'system_update' ? comm.content.substring(0, 100) : undefined,
            timestamp: comm.timestamp,
            actor: comm.author,
            actorName: comm.authorName,
            icon: comm.type === 'system_update' ? 'Bell' : 'MessageCircle',
            color: comm.type === 'system_update' ? 'gray' : 'purple',
        });
    });

    // Sort by timestamp (newest first)
    return events.sort((a, b) => {
        const timeA = toDate(a.timestamp).getTime();
        const timeB = toDate(b.timestamp).getTime();
        return timeB - timeA;
    });
}

/**
 * Get icon component name for event type
 */
export function getEventIcon(event: TimelineEvent): string {
    if (event.icon) return event.icon;

    switch (event.type) {
        case 'status_change': return 'CheckCircle';
        case 'bid': return 'DollarSign';
        case 'message': return 'MessageCircle';
        case 'payment': return 'Wallet';
        case 'review': return 'Star';
        case 'system': return 'Bell';
        default: return 'Circle';
    }
}

/**
 * Get color class for event type
 */
export function getEventColor(event: TimelineEvent): string {
    if (event.color) return event.color;

    switch (event.type) {
        case 'status_change': return 'green';
        case 'bid': return 'blue';
        case 'message': return 'purple';
        case 'payment': return 'blue';
        case 'review': return 'yellow';
        case 'system': return 'gray';
        default: return 'gray';
    }
}
