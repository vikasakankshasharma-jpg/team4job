import { getAdminDb } from '@/infrastructure/firebase/admin';
import { JobDraft, JobTemplate } from '@/lib/api/drafts';
import { FieldValue } from 'firebase-admin/firestore';

export class DraftService {
    private get db() {
        return getAdminDb();
    }

    async getLatestDraft(userId: string): Promise<JobDraft | null> {
        const draftsRef = this.db.collection('users').doc(userId).collection('jobDrafts');
        const snapshot = await draftsRef.orderBy('lastSaved', 'desc').limit(1).get();

        if (snapshot.empty) return null;
        
        const data = snapshot.docs[0].data();
        return {
            ...data,
            id: snapshot.docs[0].id,
            lastSaved: data.lastSaved?.toDate ? data.lastSaved.toDate() : data.lastSaved,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        } as JobDraft;
    }

    async saveDraft(userId: string, data: Partial<JobDraft>, draftId?: string): Promise<string> {
        const id = draftId || `draft_${Date.now()}`;
        const draftRef = this.db.collection('users').doc(userId).collection('jobDrafts').doc(id);

        const draftData = {
            ...data,
            id,
            userId,
            lastSaved: FieldValue.serverTimestamp(),
            createdAt: data.createdAt || FieldValue.serverTimestamp(),
        };

        // Remove undefined fields
        const cleanedData = Object.entries(draftData).reduce((acc, [key, value]) => {
            if (value !== undefined) acc[key] = value;
            return acc;
        }, {} as any);

        await draftRef.set(cleanedData, { merge: true });
        return id;
    }

    async deleteDraft(userId: string, draftId: string): Promise<void> {
        await this.db.collection('users').doc(userId).collection('jobDrafts').doc(draftId).delete();
    }

    async getTemplates(userId: string): Promise<JobTemplate[]> {
        const templatesRef = this.db.collection('users').doc(userId).collection('jobTemplates');
        const snapshot = await templatesRef.orderBy('createdAt', 'desc').get();

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
                lastUsed: data.lastUsed?.toDate ? data.lastUsed.toDate() : data.lastUsed,
            } as JobTemplate;
        });
    }

    async incrementTemplateUsage(userId: string, templateId: string): Promise<void> {
        const templateRef = this.db.collection('users').doc(userId).collection('jobTemplates').doc(templateId);
        await templateRef.update({
            useCount: FieldValue.increment(1),
            lastUsed: FieldValue.serverTimestamp(),
        });
    }
}

export const draftService = new DraftService();
