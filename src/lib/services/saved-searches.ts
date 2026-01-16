/**
 * Saved Searches Service
 * Manages saved search presets in Firestore
 */

import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy, limit } from "firebase/firestore";
import { Firestore } from "firebase/firestore";

export interface SavedSearch {
    id?: string;
    name: string;
    page: 'posted-jobs' | 'installers' | 'my-installers';
    query: string;
    filters?: Record<string, any>;
    createdAt: Timestamp | Date;
}

const MAX_SAVED_SEARCHES = 20;

/**
 * Get all saved searches for a user on a specific page
 */
export async function getSavedSearches(
    db: Firestore,
    userId: string,
    page?: string
): Promise<SavedSearch[]> {
    try {
        let q = query(
            collection(db, "users", userId, "savedSearches"),
            orderBy("createdAt", "desc"),
            limit(MAX_SAVED_SEARCHES)
        );

        if (page) {
            q = query(
                collection(db, "users", userId, "savedSearches"),
                where("page", "==", page),
                orderBy("createdAt", "desc"),
                limit(MAX_SAVED_SEARCHES)
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as SavedSearch));
    } catch (error) {
        console.error("Error fetching saved searches:", error);
        return [];
    }
}

/**
 * Save a new search
 */
export async function saveSearch(
    db: Firestore,
    userId: string,
    search: Omit<SavedSearch, 'id' | 'createdAt'>
): Promise<string> {
    try {
        // Check if we're at the limit
        const existing = await getSavedSearches(db, userId, search.page);
        if (existing.length >= MAX_SAVED_SEARCHES) {
            throw new Error(`Maximum ${MAX_SAVED_SEARCHES} saved searches reached. Please delete some first.`);
        }

        const docRef = await addDoc(collection(db, "users", userId, "savedSearches"), {
            ...search,
            createdAt: Timestamp.now(),
        });

        return docRef.id;
    } catch (error) {
        console.error("Error saving search:", error);
        throw error;
    }
}

/**
 * Update an existing saved search
 */
export async function updateSavedSearch(
    db: Firestore,
    userId: string,
    searchId: string,
    updates: Partial<Omit<SavedSearch, 'id' | 'createdAt'>>
): Promise<void> {
    try {
        const searchRef = doc(db, "users", userId, "savedSearches", searchId);
        await updateDoc(searchRef, updates);
    } catch (error) {
        console.error("Error updating saved search:", error);
        throw error;
    }
}

/**
 * Delete a saved search
 */
export async function deleteSavedSearch(
    db: Firestore,
    userId: string,
    searchId: string
): Promise<void> {
    try {
        const searchRef = doc(db, "users", userId, "savedSearches", searchId);
        await deleteDoc(searchRef);
    } catch (error) {
        console.error("Error deleting saved search:", error);
        throw error;
    }
}
