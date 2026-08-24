"use server";

import { supportRepository } from "@/domains/support/support.repository";
import { CreateTicketInput, SupportTicket } from "@/domains/support/support.types";

export async function createTicketAction(input: CreateTicketInput) {
    try {
        const ticket = await supportRepository.create(input);
        return { success: true, ticket };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getUserTicketsAction(userId: string) {
    try {
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
        const tickets = await supportRepository.findByUserId(userId);
        return { success: true, tickets };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getAllTicketsAction(status?: SupportTicket['status']) {
    try {
        const tickets = await supportRepository.findAll(status);
        return { success: true, tickets };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function replyToTicketAction(ticketId: string, authorId: string, authorName: string, authorRole: 'user' | 'admin', message: string) {
    try {
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(authorId);
        await supportRepository.addReply(ticketId, {
            authorId,
            authorName,
            authorRole,
            message
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function closeTicketAction(ticketId: string) {
    try {
        await supportRepository.updateStatus(ticketId, 'resolved');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
