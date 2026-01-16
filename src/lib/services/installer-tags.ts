import { doc, updateDoc, getDoc } from "firebase/firestore";
import { Firestore } from "firebase/firestore";
import { User } from "@/lib/types";

/**
 * Add a tag to an installer for the current user
 */
export async function addInstallerTag(
    db: Firestore,
    userId: string,
    installerId: string,
    tag: string
): Promise<void> {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            throw new Error("User not found");
        }

        const userData = userSnap.data() as User;
        const currentTags = userData.installerTags || {};
        const installerTags = currentTags[installerId] || [];

        // Don't add duplicate tags
        if (installerTags.includes(tag)) {
            return;
        }

        const updatedTags = {
            ...currentTags,
            [installerId]: [...installerTags, tag],
        };

        await updateDoc(userRef, {
            installerTags: updatedTags,
        });
    } catch (error) {
        console.error("Error adding installer tag:", error);
        throw error;
    }
}

/**
 * Remove a tag from an installer for the current user
 */
export async function removeInstallerTag(
    db: Firestore,
    userId: string,
    installerId: string,
    tag: string
): Promise<void> {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            throw new Error("User not found");
        }

        const userData = userSnap.data() as User;
        const currentTags = userData.installerTags || {};
        const installerTags = currentTags[installerId] || [];

        const updatedInstallerTags = installerTags.filter(t => t !== tag);

        const updatedTags = {
            ...currentTags,
            [installerId]: updatedInstallerTags,
        };

        // Remove installer entry if no tags left
        if (updatedInstallerTags.length === 0) {
            delete updatedTags[installerId];
        }

        await updateDoc(userRef, {
            installerTags: updatedTags,
        });
    } catch (error) {
        console.error("Error removing installer tag:", error);
        throw error;
    }
}

/**
 * Get all tags for a specific installer
 */
export function getInstallerTags(
    user: User,
    installerId: string
): string[] {
    return user.installerTags?.[installerId] || [];
}

/**
 * Get all unique tags used by this user across all installers
 */
export function getAllUniqueTags(user: User): string[] {
    if (!user.installerTags) {
        return [];
    }

    const allTagsSet = new Set<string>();
    Object.values(user.installerTags).forEach(tags => {
        tags.forEach(tag => allTagsSet.add(tag));
    });

    return Array.from(allTagsSet).sort();
}

/**
 * Get all installers that have a specific tag
 */
export function getInstallersByTag(
    user: User,
    tag: string
): string[] {
    if (!user.installerTags) {
        return [];
    }

    const installerIds: string[] = [];
    Object.entries(user.installerTags).forEach(([installerId, tags]) => {
        if (tags.includes(tag)) {
            installerIds.push(installerId);
        }
    });

    return installerIds;
}

/**
 * Common tag suggestions
 */
export const COMMON_INSTALLER_TAGS = [
    "Trusted",
    "Budget-Friendly",
    "Responsive",
    "Quality Work",
    "Fast",
    "Professional",
    "Electrical",
    "CCTV Specialist",
    "Commercial",
    "Residential",
    "Emergency",
    "Warranty Included",
];
