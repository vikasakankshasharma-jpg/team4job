import { doc, updateDoc, getDoc } from "firebase/firestore";
import { Firestore } from "firebase/firestore";
import { User } from "@/lib/types";

/**
 * Add a tag to an Professional for the current user
 */
export async function addProfessionalTag(
    db: Firestore,
    userId: string,
    professionalId: string,
    tag: string
): Promise<void> {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            throw new Error("User not found");
        }

        const userData = userSnap.data() as User;
        const currentTags = userData.professionalTags || {};
        const professionalTags = currentTags[professionalId] || [];

        // Don't add duplicate tags
        if (professionalTags.includes(tag)) {
            return;
        }

        const updatedTags = {
            ...currentTags,
            [professionalId]: [...professionalTags, tag],
        };

        await updateDoc(userRef, {
            professionalTags: updatedTags,
        });
    } catch (error) {
        throw error;
    }
}

/**
 * Remove a tag from an Professional for the current user
 */
export async function removeProfessionalTag(
    db: Firestore,
    userId: string,
    professionalId: string,
    tag: string
): Promise<void> {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            throw new Error("User not found");
        }

        const userData = userSnap.data() as User;
        const currentTags = userData.professionalTags || {};
        const professionalTags = currentTags[professionalId] || [];

        const updatedProfessionalTags = professionalTags.filter(t => t !== tag);

        const updatedTags = {
            ...currentTags,
            [professionalId]: updatedProfessionalTags,
        };

        // Remove Professional entry if no tags left
        if (updatedProfessionalTags.length === 0) {
            delete updatedTags[professionalId];
        }

        await updateDoc(userRef, {
            professionalTags: updatedTags,
        });
    } catch (error) {
        throw error;
    }
}

/**
 * Get all tags for a specific Professional
 */
export function getProfessionalTags(
    user: User,
    professionalId: string
): string[] {
    return user.professionalTags?.[professionalId] || [];
}

/**
 * Get all unique tags used by this user across all Professionals
 */
export function getAllUniqueTags(user: User): string[] {
    if (!user.professionalTags) {
        return [];
    }

    const allTagsSet = new Set<string>();
    Object.values(user.professionalTags).forEach(tags => {
        tags.forEach(tag => allTagsSet.add(tag));
    });

    return Array.from(allTagsSet).sort();
}

/**
 * Get all Professionals that have a specific tag
 */
export function getProfessionalsByTag(
    user: User,
    tag: string
): string[] {
    if (!user.professionalTags) {
        return [];
    }

    const professionalIds: string[] = [];
    Object.entries(user.professionalTags).forEach(([professionalId, tags]) => {
        if (tags.includes(tag)) {
            professionalIds.push(professionalId);
        }
    });

    return professionalIds;
}

/**
 * Common tag suggestions
 */
export const COMMON_PROFESSIONAL_TAGS = [
    "Trusted",
    "Budget-Friendly",
    "Responsive",
    "Quality Work",
    "Fast",
    "Professional",
    "Electrical",
    "Technical Specialist",
    "Commercial",
    "Residential",
    "Emergency",
    "Warranty Included",
];
