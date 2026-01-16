import {
    collection,
    doc,
    getDocs,
    addDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    Timestamp,
    where,
    increment,
    updateDoc,
    Firestore
} from 'firebase/firestore';

export interface BudgetTemplate {
    id: string;
    userId: string;
    name: string;
    min: number;
    max: number;
    currency: string;
    frequency: 'fixed' | 'hourly';
    useCount: number;
    createdAt: Timestamp;
}

export const BUDGET_TEMPLATES_COLLECTION = 'budgetTemplates';

/**
 * Save a new budget template
 */
export async function saveBudgetTemplate(
    db: Firestore,
    userId: string,
    data: { name: string; min: number; max: number; frequency: 'fixed' | 'hourly' }
): Promise<string> {
    const collectionRef = collection(db, 'users', userId, BUDGET_TEMPLATES_COLLECTION);

    const docRef = await addDoc(collectionRef, {
        ...data,
        userId,
        currency: 'INR',
        useCount: 0,
        createdAt: serverTimestamp(),
    });

    return docRef.id;
}

/**
 * Get all budget templates for a user, sorted by usage
 */
export async function getBudgetTemplates(db: Firestore, userId: string): Promise<BudgetTemplate[]> {
    const collectionRef = collection(db, 'users', userId, BUDGET_TEMPLATES_COLLECTION);
    const q = query(collectionRef, orderBy('createdAt', 'desc')); // Initial sort, client can re-sort by useCount if needed

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as BudgetTemplate));
}

/**
 * Increment usage count for a template
 */
export async function incrementTemplateUsage(db: Firestore, userId: string, templateId: string): Promise<void> {
    const docRef = doc(db, 'users', userId, BUDGET_TEMPLATES_COLLECTION, templateId);
    await updateDoc(docRef, {
        useCount: increment(1)
    });
}

/**
 * Delete a budget template
 */
export async function deleteTemplate(db: Firestore, userId: string, templateId: string): Promise<void> {
    const docRef = doc(db, 'users', userId, BUDGET_TEMPLATES_COLLECTION, templateId);
    await deleteDoc(docRef);
}
