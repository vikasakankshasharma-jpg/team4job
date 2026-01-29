
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { Review, CreateReviewInput } from './review.types';
import { Timestamp } from 'firebase-admin/firestore';

export class ReviewRepository {
    private collection = getAdminDb().collection('reviews');

    async create(data: CreateReviewInput): Promise<string> {
        const docRef = await this.collection.add({
            ...data,
            comment: data.comment || '',
            createdAt: Timestamp.now()
        });
        return docRef.id;
    }

    async fetchByTargetUser(targetUserId: string): Promise<Review[]> {
        const snapshot = await this.collection.where('targetUserId', '==', targetUserId).orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    }

    async fetchByJob(jobId: string): Promise<Review[]> {
        const snapshot = await this.collection.where('jobId', '==', jobId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    }
}

export const reviewRepository = new ReviewRepository();
