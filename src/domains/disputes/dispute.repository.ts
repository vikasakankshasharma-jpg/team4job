
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { Dispute, CreateDisputeInput, DisputeMessage } from './dispute.types';
import { Timestamp } from 'firebase-admin/firestore';

export class DisputeRepository {
    private collection = getAdminDb().collection('disputes');

    async create(data: CreateDisputeInput): Promise<string> {
        const docRef = await this.collection.add({
            ...data,
            status: 'Open',
            messages: [
                {
                    authorId: data.requesterId,
                    authorRole: 'User', // Simplified, will be enriched in service
                    content: `Dispute opened: ${data.reason}`,
                    timestamp: Timestamp.now()
                }
            ],
            createdAt: Timestamp.now()
        });
        return docRef.id;
    }

    async fetchById(id: string): Promise<Dispute | null> {
        const doc = await this.collection.doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as Dispute;
    }

    async fetchByRequester(requesterId: string): Promise<Dispute[]> {
        const snapshot = await this.collection.where('requesterId', '==', requesterId).orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dispute));
    }

    async addMessage(disputeId: string, message: DisputeMessage): Promise<void> {
        const { FieldValue } = await import('firebase-admin/firestore');
        await this.collection.doc(disputeId).update({
            messages: FieldValue.arrayUnion(message),
            status: 'Under Review' // Optional: auto-update status when message added
        });
    }

    async updateStatus(id: string, status: Dispute['status'], resolution?: string): Promise<void> {
        const updates: any = { status };
        if (resolution) {
            updates.resolution = resolution;
            updates.resolvedAt = Timestamp.now();
        }
        await this.collection.doc(id).update(updates);
    }
}

export const disputeRepository = new DisputeRepository();
