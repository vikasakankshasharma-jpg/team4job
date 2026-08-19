export interface TicketReply {
    id: string;
    authorId: string;
    authorName: string;
    authorRole: 'user' | 'admin';
    message: string;
    createdAt: string;
}

export interface SupportTicket {
    id: string;
    userId: string;
    userName: string;
    userEmail?: string;
    subject: string;
    category: 'Billing' | 'Technical' | 'Dispute' | 'General';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    replies: TicketReply[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateTicketInput {
    userId: string;
    userName: string;
    userEmail?: string;
    subject: string;
    category: 'Billing' | 'Technical' | 'Dispute' | 'General';
    message: string;
    priority?: 'low' | 'medium' | 'high';
}
