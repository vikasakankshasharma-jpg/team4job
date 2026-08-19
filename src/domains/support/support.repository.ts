import { getAdminDb } from "@/infrastructure/firebase/admin";
import { SupportTicket, CreateTicketInput, TicketReply } from "./support.types";

const COLLECTION_NAME = "support_tickets";

function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export const supportRepository = {
    async create(input: CreateTicketInput): Promise<SupportTicket> {
        const db = getAdminDb();
        const ticketId = generateId();
        const now = new Date().toISOString();
        
        const initialReply: TicketReply = {
            id: generateId(),
            authorId: input.userId,
            authorName: input.userName,
            authorRole: 'user',
            message: input.message,
            createdAt: now,
        };

        const ticket: SupportTicket = {
            id: ticketId,
            userId: input.userId,
            userName: input.userName,
            userEmail: input.userEmail,
            subject: input.subject,
            category: input.category,
            status: 'open',
            priority: input.priority || 'medium',
            replies: [initialReply],
            createdAt: now,
            updatedAt: now,
        };

        await db.collection(COLLECTION_NAME).doc(ticketId).set(ticket);
        return ticket;
    },

    async findById(ticketId: string): Promise<SupportTicket | null> {
        const db = getAdminDb();
        const doc = await db.collection(COLLECTION_NAME).doc(ticketId).get();
        if (!doc.exists) return null;
        return doc.data() as SupportTicket;
    },

    async findByUserId(userId: string): Promise<SupportTicket[]> {
        const db = getAdminDb();
        const snapshot = await db.collection(COLLECTION_NAME)
            .where("userId", "==", userId)
            .orderBy("updatedAt", "desc")
            .get();
        
        return snapshot.docs.map((doc: any) => doc.data() as SupportTicket);
    },

    async findAll(status?: SupportTicket['status']): Promise<SupportTicket[]> {
        const db = getAdminDb();
        let query: FirebaseFirestore.Query = db.collection(COLLECTION_NAME);
        
        if (status) {
            query = query.where("status", "==", status);
        }
        
        // Ensure index exists for status + updatedAt if using both, otherwise order in memory for MVP
        const snapshot = await query.get();
        const tickets = snapshot.docs.map((doc: any) => doc.data() as SupportTicket);
        
        return tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    },

    async addReply(ticketId: string, reply: Omit<TicketReply, 'id' | 'createdAt'>): Promise<void> {
        const db = getAdminDb();
        const now = new Date().toISOString();
        const fullReply: TicketReply = {
            ...reply,
            id: generateId(),
            createdAt: now,
        };

        const ticketRef = db.collection(COLLECTION_NAME).doc(ticketId);
        
        // Use a transaction or FieldValue.arrayUnion
        const { FieldValue } = await import('firebase-admin/firestore');
        await ticketRef.update({
            replies: FieldValue.arrayUnion(fullReply),
            updatedAt: now,
            status: reply.authorRole === 'admin' ? 'in_progress' : 'open' // auto-update status based on who replies
        });
    },

    async updateStatus(ticketId: string, status: SupportTicket['status']): Promise<void> {
        const db = getAdminDb();
        await db.collection(COLLECTION_NAME).doc(ticketId).update({
            status,
            updatedAt: new Date().toISOString()
        });
    }
};


