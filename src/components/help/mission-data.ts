import { ReactNode } from 'react';

export interface TourStep {
    id: string;
    targetId: string; // The CSS ID of the element to highlight
    title: string;
    content: string;
    role?: 'Client' | 'Professional' | 'Admin' | 'Support';
}

export interface MissionTour {
    id: string;
    title: string;
    description: string;
    role: 'Client' | 'Professional' | 'Admin' | 'Support';
    steps: TourStep[];
}

export interface ContextualBrief {
    routePattern: RegExp;
    title: string;
    intelligence: string[];
}

export const MISSION_TOURS: MissionTour[] = [
    {
        id: 'client-full-cycle',
        title: 'Mastering the Engagement Cycle',
        description: 'Command the platform from outreach to terminal payment.',
        role: 'Client',
        steps: [
            {
                id: 'post-job',
                targetId: 'post-job', // Matches data-tour in sidebar-nav
                title: 'Outreach Initiation',
                content: 'Initiate a new production mission by drafting an high-authority job brief.'
            },
            {
                id: 'review-bids',
                targetId: 'posted-jobs', // Matches data-tour in sidebar-nav
                title: 'Intelligence Gathering',
                content: 'Review incoming professional bids and evaluate reputation logistics.'
            },
            {
                id: 'fund-job',
                targetId: 'analytics', // Using analytics link as placeholder if specific fund id is missing
                title: 'Funding Security',
                content: 'Secure the engagement by enabling our enterprise-grade digital deposit protocol.'
            }
        ]
    },
    {
        id: 'pro-full-cycle',
        title: 'The Professional Workflow',
        description: 'From discovery to guaranteed payout.',
        role: 'Professional',
        steps: [
            {
                id: 'find-jobs',
                targetId: 'all-jobs', // Matches data-tour in sidebar-nav
                title: 'Mission Discovery',
                content: 'Locate technical engagements that satisfy your specialized skill parameters.'
            },
            {
                id: 'submit-bid',
                targetId: 'my-bids', // Matches data-tour in sidebar-nav
                title: 'Strategic Proposals',
                content: 'Place high-authority bids to secure premium production contracts.'
            },
            {
                id: 'start-work',
                targetId: 'dashboard-home',
                title: 'In-Situ Verification',
                content: 'Ask the client for the security code upon arrival to initiate the execution phase.'
            }
        ]
    }
];

export const CONTEXTUAL_BRIEFS: ContextualBrief[] = [
    {
        routePattern: /\/dashboard$/,
        title: 'Mission Command Intelligence',
        intelligence: [
            'Monitor your active hiring pipeline in real-time.',
            'High-priority alerts (Intel) appear in the top cluster.',
            'Quick-actions allow for rapid mission initiation.'
        ]
    },
    {
        routePattern: /\/dashboard\/jobs/,
        title: 'Engagement Logistics',
        intelligence: [
            'Filter missions by technical category or priority.',
            'Use the swipe gestures on mobile for rapid triage.',
            'Verified professionals have distinct reputation markers.'
        ]
    }
];
