import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    DocumentReference,
} from 'firebase/firestore';
import { Address, JobAttachment } from '@/lib/types';

export interface JobDraft {
    id: string;
    userId: string;
    title?: string;
    description?: string;
    jobCategory?: string;
    budget?: { min: number; max: number };
    location?: string;
    address?: Address;
    fullAddress?: string;
    jobStartDate?: Date | Timestamp;
    directAwardInstallerId?: string;
    travelTip?: number;
    skills?: string[];
    attachments?: JobAttachment[];
    isGstInvoiceRequired?: boolean;
    lastSaved: Date | Timestamp;
    createdAt: Date | Timestamp;
}

export interface JobTemplate {
    id: string;
    userId: string;
    name: string;
    category: string;
    fields: Partial<JobDraft>;
    useCount: number;
    lastUsed?: Date | Timestamp;
    createdAt: Date | Timestamp;
}

/**
 * Save or update a job draft
 */
export async function saveDraft(
    db: any,
    userId: string,
    draftData: Partial<JobDraft>,
    draftId?: string
): Promise<string> {
    try {
        const id = draftId || `draft_${Date.now()}`;
        const draftRef = doc(db, 'users', userId, 'jobDrafts', id);

        const draftToSave: Partial<JobDraft> = {
            ...draftData,
            id,
            userId,
            lastSaved: Timestamp.now(),
            createdAt: draftData.createdAt || Timestamp.now(),
        };

        await setDoc(draftRef, draftToSave, { merge: true });
        return id;
    } catch (error) {
        console.error('Error saving draft:', error);
        throw error;
    }
}

/**
 * Get the most recent draft for a user
 */
export async function getLatestDraft(
    db: any,
    userId: string
): Promise<JobDraft | null> {
    try {
        const draftsRef = collection(db, 'users', userId, 'jobDrafts');
        const q = query(draftsRef, orderBy('lastSaved', 'desc'), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const draftDoc = snapshot.docs[0];
        return { id: draftDoc.id, ...draftDoc.data() } as JobDraft;
    } catch (error) {
        console.error('Error getting latest draft:', error);
        return null;
    }
}

/**
 * Get all drafts for a user
 */
export async function getAllDrafts(
    db: any,
    userId: string
): Promise<JobDraft[]> {
    try {
        const draftsRef = collection(db, 'users', userId, 'jobDrafts');
        const q = query(draftsRef, orderBy('lastSaved', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as JobDraft)
        );
    } catch (error) {
        console.error('Error getting all drafts:', error);
        return [];
    }
}

/**
 * Delete a draft
 */
export async function deleteDraft(
    db: any,
    userId: string,
    draftId: string
): Promise<void> {
    try {
        const draftRef = doc(db, 'users', userId, 'jobDrafts', draftId);
        await deleteDoc(draftRef);
    } catch (error) {
        console.error('Error deleting draft:', error);
        throw error;
    }
}

/**
 * Delete old drafts (older than 30 days)
 */
export async function deleteOldDrafts(db: any, userId: string): Promise<void> {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const draftsRef = collection(db, 'users', userId, 'jobDrafts');
        const q = query(
            draftsRef,
            where('createdAt', '<', Timestamp.fromDate(thirtyDaysAgo))
        );
        const snapshot = await getDocs(q);

        const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
    } catch (error) {
        console.error('Error deleting old drafts:', error);
    }
}

/**
 * Save a job template
 */
export async function saveTemplate(
    db: any,
    userId: string,
    templateData: Omit<JobTemplate, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
    try {
        const id = `template_${Date.now()}`;
        const templateRef = doc(db, 'users', userId, 'jobTemplates', id);

        const template: JobTemplate = {
            ...templateData,
            id,
            userId,
            createdAt: Timestamp.now(),
        };

        await setDoc(templateRef, template);
        return id;
    } catch (error) {
        console.error('Error saving template:', error);
        throw error;
    }
}

/**
 * Get all templates for a user
 */
export async function getTemplates(
    db: any,
    userId: string
): Promise<JobTemplate[]> {
    try {
        const templatesRef = collection(db, 'users', userId, 'jobTemplates');
        const q = query(templatesRef, orderBy('lastUsed', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as JobTemplate)
        );
    } catch (error) {
        console.error('Error getting templates:', error);
        return [];
    }
}

/**
 * Update template usage count and last used timestamp
 */
export async function incrementTemplateUsage(
    db: any,
    userId: string,
    templateId: string
): Promise<void> {
    try {
        const templateRef = doc(db, 'users', userId, 'jobTemplates', templateId);
        const templateDoc = await getDoc(templateRef);

        if (templateDoc.exists()) {
            const currentCount = templateDoc.data().useCount || 0;
            await setDoc(
                templateRef,
                {
                    useCount: currentCount + 1,
                    lastUsed: Timestamp.now(),
                },
                { merge: true }
            );
        }
    } catch (error) {
        console.error('Error incrementing template usage:', error);
    }
}

/**
 * Delete a template
 */
export async function deleteTemplate(
    db: any,
    userId: string,
    templateId: string
): Promise<void> {
    try {
        const templateRef = doc(db, 'users', userId, 'jobTemplates', templateId);
        await deleteDoc(templateRef);
    } catch (error) {
        console.error('Error deleting template:', error);
        throw error;
    }
}

/**
 * Update a template
 */
export async function updateTemplate(
    db: any,
    userId: string,
    templateId: string,
    updates: Partial<Omit<JobTemplate, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
    try {
        const templateRef = doc(db, 'users', userId, 'jobTemplates', templateId);
        await setDoc(templateRef, updates, { merge: true });
    } catch (error) {
        console.error('Error updating template:', error);
        throw error;
    }
}
