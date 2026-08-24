/**
 * Timeline Builder Service
 * Aggregates job events from multiple sources into a unified timeline
 */

import { Job, User } from "@/lib/types";
import { JobEvent } from "@/domains/jobs/timeline.types";
import { toDate } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";

export interface TimelineEvent {
    id: string;
    type: 'status_change' | 'bid' | 'message' | 'payment' | 'review' | 'system' | 'audit';
    timestamp: Date | Timestamp;
    title: string;
    description?: string;
    actor?: string;  // User ID or 'system'
    actorName?: string;
    metadata?: Record<string, any>;
    icon?: string;  // Icon name for rendering
    color?: string;  // Color class for visual distinction
    attachments?: { fileName: string; fileUrl: string; fileType: string; }[];
}

export interface CommunicationItem {
    id: string;
    jobId: string;
    type: 'job_giver_message' | 'Professional_message' | 'system_update';
    content: string;
    author: string | 'system';  // User ID or 'system'
    authorName?: string;
    timestamp: Date | Timestamp;
    read: boolean;
    attachments?: { fileName: string; fileUrl: string; fileType: string; }[];
}

/**
 * Build complete timeline from job data and communications
 */
export function buildJobTimeline(
    job: Job,
    communications: CommunicationItem[] = [],
    timelineEvents: JobEvent[] = []
): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    let eventId = 0;

    // 1. Core Timeline Events from Root Collection
    if (timelineEvents && timelineEvents.length > 0) {
        timelineEvents.forEach((te) => {
            let icon = 'Activity';
            let color = 'gray';
            let title: string = te.eventType;
            let description = te.metadata?.description || '';

            switch (te.eventType) {
                case 'JOB_CREATED': icon = 'CheckCircle'; color = 'green'; title = 'Job Posted'; break;
                case 'JOB_UPDATED': icon = 'Edit'; color = 'gray'; title = 'Job Updated'; break;
                case 'BID_AWARDED': icon = 'Award'; color = 'green'; title = 'Job Awarded'; break;
                case 'FUNDING_COMPLETED': icon = 'Wallet'; color = 'blue'; title = 'Payment Funded'; break;
                case 'WORK_STARTED': icon = 'PlayCircle'; color = 'green'; title = 'Work Started'; break;
                case 'WORK_COMPLETED': icon = 'CheckCircle2'; color = 'green'; title = 'Work Completed'; break;
                case 'CUSTOMER_APPROVED': icon = 'CheckCircle'; color = 'green'; title = 'Job Approved'; break;
                case 'DISPUTE_OPENED': icon = 'AlertCircle'; color = 'red'; title = 'Dispute Opened'; break;
                case 'JOB_CANCELLED': icon = 'XCircle'; color = 'red'; title = 'Job Cancelled'; break;
                case 'PAYMENT_RELEASED': icon = 'Wallet'; color = 'blue'; title = 'Payment Released'; break;
                case 'BID_PLACED': icon = 'DollarSign'; color = 'blue'; title = 'Bid Placed'; break;
                case 'BID_WITHDRAWN': icon = 'XCircle'; color = 'gray'; title = 'Bid Withdrawn'; break;
            }

            events.push({
                id: te.id || `event-${eventId++}`,
                type: 'status_change',
                title: title,
                description: description,
                timestamp: te.timestamp,
                actor: te.actorId,
                metadata: te.metadata,
                icon: icon,
                color: color,
            });
        });
    }

    // 2. Legacy fallback for old jobs without event history
    if (events.length === 0) {
        events.push({
            id: `event-${eventId++}`,
            type: 'status_change',
            title: 'Job Posted',
            description: job.title,
            timestamp: job.postedAt,
            actor: job.clientId,
            icon: 'CheckCircle',
            color: 'green',
        });
        
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

    // 4. Reviews exchanged
    if (job.clientReview) {
        events.push({
            id: `event-${eventId++}`,
            type: 'review',
            title: 'Review Given',
            description: `${job.clientReview.rating} stars`,
            timestamp: job.clientReview.createdAt,
            actor: job.clientId,
            icon: 'Star',
            color: 'yellow',
        });
    }

    if (job.professionalReview) {
        events.push({
            id: `event-${eventId++}`,
            type: 'review',
            title: 'Review Received',
            description: `${job.professionalReview.rating} stars`,
            timestamp: job.professionalReview.createdAt,
            actor: job.professionalReview.authorId,
            icon: 'Star',
            color: 'yellow',
        });
    }

    // 5. Communications
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
            attachments: comm.attachments,
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
