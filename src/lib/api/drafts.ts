import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    orderBy,
    limit,
    Timestamp,
    updateDoc,
    increment,
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
    console.log('[DEBUG] Entering saveDraft function.');
    console.log('[DEBUG] Initial draftData received:', JSON.stringify(draftData, null, 2));

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

        const cleanedDraft = Object.entries(draftToSave).reduce(
            (acc, [key, value]) => {
                if (value !== undefined) {
                    (acc as any)[key] = value;
                }
                return acc;
            },
            {} as Partial<JobDraft>
        );

        console.log('[DEBUG] Cleaned object before saving:', JSON.stringify(cleanedDraft, null, 2));

        await setDoc(draftRef, cleanedDraft, { merge: true });
        console.log('[DEBUG] Draft saved successfully.');
        return id;
    } catch (error) {
        console.error('[CRITICAL] Error in saveDraft:', error);
        console.error('[CRITICAL] Data that caused the error:', JSON.stringify(draftData, null, 2));
        throw error;
    }
}

/**
 * Get a single job draft
 */
export async function getDraft(
    db: any,
    userId: string,
    draftId: string
): Promise<JobDraft | null> {
    try {
        const draftRef = doc(db, 'users', userId, 'jobDrafts', draftId);
        const docSnap = await getDoc(draftRef);

        if (docSnap.exists()) {
            return docSnap.data() as JobDraft;
        }
        return null;
    } catch (error) {
        console.error('Error getting draft:', error);
        throw error;
    }
}

/**
 * Get all job drafts for a user
 */
export async function getAllDrafts(
    db: any,
    userId: string
): Promise<JobDraft[]> {
    try {
        const draftsRef = collection(db, 'users', userId, 'jobDrafts');
        const q = query(draftsRef, orderBy('lastSaved', 'desc'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map((doc) => doc.data() as JobDraft);
    } catch (error) {
        console.error('Error getting all drafts:', error);
        throw error;
    }
}

/**
 * Delete a job draft
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
 * Get the latest draft for a user
 */
export async function getLatestDraft(
    db: any,
    userId: string
): Promise<JobDraft | null> {
    try {
        const draftsRef = collection(db, 'users', userId, 'jobDrafts');
        const q = query(draftsRef, orderBy('lastSaved', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data() as JobDraft;
        }
        return null;
    } catch (error) {
        console.error('Error getting latest draft:', error);
        throw error;
    }
}

/**
 * Save a job template from a draft
 */
export async function saveTemplate(
    db: any,
    userId: string,
    draft: JobDraft,
    templateName: string
): Promise<string> {
    try {
        const id = `template_${Date.now()}`;
        const templateRef = doc(db, 'users', userId, 'jobTemplates', id);

        const { id: draftId, userId: uId, ...fields } = draft;

        const templateToSave: JobTemplate = {
            id,
            userId,
            name: templateName,
            category: draft.jobCategory || 'Uncategorized',
            fields: fields,
            useCount: 0,
            createdAt: Timestamp.now(),
        };

        await setDoc(templateRef, templateToSave);
        return id;
    } catch (error) {
        console.error('Error saving template:', error);
        throw error;
    }
}

/**
 * Get all job templates for a user
 */
export async function getTemplates(
    db: any,
    userId: string
): Promise<JobTemplate[]> {
    try {
        const templatesRef = collection(db, 'users', userId, 'jobTemplates');
        const q = query(templatesRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map((doc) => doc.data() as JobTemplate);
    } catch (error) {
        console.error('Error getting all templates:', error);
        throw error;
    }
}

/**
 * Delete a job template
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
 * Increment the usage count of a job template
 */
export async function incrementTemplateUsage(
    db: any,
    userId: string,
    templateId: string
): Promise<void> {
    try {
        const templateRef = doc(db, 'users', userId, 'jobTemplates', templateId);
        await updateDoc(templateRef, {
            useCount: increment(1),
            lastUsed: Timestamp.now(),
        });
    } catch (error) {
        console.error('Error incrementing template usage:', error);
        throw error;
    }
}
