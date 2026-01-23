import { collection, query, where, getDocs, limit, orderBy, Timestamp } from "firebase/firestore";
import { Firestore } from "firebase/firestore";
import { User, Job } from "@/lib/types";

interface RecommendationOptions {
    maxResults?: number;
    categoryPreference?: string[];
}

/**
 * Get recommended installers for a Job Giver based on:
 * 1. Recent hires who are currently available
 * 2. Favorited installers with high ratings
 * 3. Top-rated installers matching job categories
 */
export async function getRecommendedInstallers(
    db: Firestore,
    userId: string,
    currentUser: User,
    options: RecommendationOptions = {}
): Promise<User[]> {
    const { maxResults = 3 } = options;
    const recommendations: User[] = [];
    const seenIds = new Set<string>();

    try {
        // Priority 1: Recently hired installers who are available
        const recentlyHired = await getRecentlyHiredAvailable(db, userId, seenIds);
        recommendations.push(...recentlyHired.slice(0, maxResults));
        recentlyHired.forEach(installer => seenIds.add(installer.id));

        // If we have enough, return
        if (recommendations.length >= maxResults) {
            return recommendations.slice(0, maxResults);
        }

        // Priority 2: Favorite installers with high ratings
        if (currentUser.favoriteInstallerIds && currentUser.favoriteInstallerIds.length > 0) {
            const favoriteInstallers = await getHighRatedFavorites(
                db,
                currentUser.favoriteInstallerIds,
                seenIds
            );
            const needed = maxResults - recommendations.length;
            recommendations.push(...favoriteInstallers.slice(0, needed));
            favoriteInstallers.forEach(installer => seenIds.add(installer.id));
        }

        // If we have enough, return
        if (recommendations.length >= maxResults) {
            return recommendations.slice(0, maxResults);
        }

        // Priority 3: Top-rated installers matching job giver's common categories
        const commonCategories = await getCommonJobCategories(db, userId);
        if (commonCategories.length > 0) {
            const categoryMatches = await getTopRatedByCategory(
                db,
                commonCategories,
                seenIds
            );
            const needed = maxResults - recommendations.length;
            recommendations.push(...categoryMatches.slice(0, needed));
        }

        return recommendations.slice(0, maxResults);
    } catch (error) {
        console.error("Error getting recommended installers:", error);
        return [];
    }
}

/**
 * Get installers this Job Giver hired in last 6 months who are currently available
 */
async function getRecentlyHiredAvailable(
    db: Firestore,
    userId: string,
    seenIds: Set<string>
): Promise<User[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const jobsQuery = query(
        collection(db, "jobs"),
        where("jobGiverId", "==", userId),
        where("status", "==", "Completed"),
        where("completionTimestamp", ">=", Timestamp.fromDate(sixMonthsAgo)),
        orderBy("completionTimestamp", "desc"),
        limit(20)
    );

    const jobsSnapshot = await getDocs(jobsQuery);
    const installerIds = new Set<string>();

    jobsSnapshot.docs.forEach(doc => {
        const job = doc.data() as Job;
        if (job.awardedInstallerId && !seenIds.has(job.awardedInstallerId)) {
            installerIds.add(job.awardedInstallerId);
        }
    });

    if (installerIds.size === 0) return [];

    // Fetch these installers
    const installers: User[] = [];
    const installerIdsArray = Array.from(installerIds);

    // Firestore 'in' query supports max 10 items, so batch
    for (let i = 0; i < installerIdsArray.length; i += 10) {
        const batch = installerIdsArray.slice(i, i + 10);
        const usersQuery = query(
            collection(db, "public_profiles"),
            where("__name__", "in", batch),
            where("roles", "array-contains", "Installer")
        );
        const usersSnapshot = await getDocs(usersQuery);

        usersSnapshot.docs.forEach(doc => {
            const user = { id: doc.id, ...doc.data() } as User;
            // Filter for available installers
            if (
                user.installerProfile?.availability?.status === "available" ||
                !user.installerProfile?.availability // No status = assume available
            ) {
                installers.push(user);
            }
        });
    }

    return installers;
}

/**
 * Get favorited installers with rating >= 4.5
 */
async function getHighRatedFavorites(
    db: Firestore,
    favoriteIds: string[],
    seenIds: Set<string>
): Promise<User[]> {
    const unseenFavorites = favoriteIds.filter(id => !seenIds.has(id));
    if (unseenFavorites.length === 0) return [];

    const installers: User[] = [];

    // Batch fetch in groups of 10
    for (let i = 0; i < unseenFavorites.length; i += 10) {
        const batch = unseenFavorites.slice(i, i + 10);
        const usersQuery = query(
            collection(db, "public_profiles"),
            where("__name__", "in", batch),
            where("roles", "array-contains", "Installer")
        );
        const usersSnapshot = await getDocs(usersQuery);

        usersSnapshot.docs.forEach(doc => {
            const user = { id: doc.id, ...doc.data() } as User;
            if (user.installerProfile?.rating && user.installerProfile.rating >= 4.5) {
                installers.push(user);
            }
        });
    }

    // Sort by rating descending
    return installers.sort((a, b) =>
        (b.installerProfile?.rating || 0) - (a.installerProfile?.rating || 0)
    );
}

/**
 * Get Job Giver's most common job categories from last 10 jobs
 */
async function getCommonJobCategories(
    db: Firestore,
    userId: string
): Promise<string[]> {
    const jobsQuery = query(
        collection(db, "jobs"),
        where("jobGiverId", "==", userId),
        orderBy("postedAt", "desc"),
        limit(10)
    );

    const jobsSnapshot = await getDocs(jobsQuery);
    const categoryCount: Record<string, number> = {};

    jobsSnapshot.docs.forEach(doc => {
        const job = doc.data() as Job;
        if (job.jobCategory) {
            categoryCount[job.jobCategory] = (categoryCount[job.jobCategory] || 0) + 1;
        }
    });

    // Sort by frequency and return top 3
    return Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category);
}

/**
 * Get top-rated installers who have skills matching the given categories
 */
async function getTopRatedByCategory(
    db: Firestore,
    categories: string[],
    seenIds: Set<string>
): Promise<User[]> {
    // Query for installers with Gold or Platinum tier
    const installersQuery = query(
        collection(db, "public_profiles"),
        where("roles", "array-contains", "Installer"),
        where("installerProfile.tier", "in", ["Gold", "Platinum"]),
        limit(20)
    );

    const installersSnapshot = await getDocs(installersQuery);
    const matchingInstallers: User[] = [];

    installersSnapshot.docs.forEach(doc => {
        const user = { id: doc.id, ...doc.data() } as User;

        // Skip already seen
        if (seenIds.has(user.id)) return;

        // Check if installer has skills matching categories
        const hasMatchingSkill = user.installerProfile?.skills?.some(skill =>
            categories.some(cat =>
                skill.toLowerCase().includes(cat.toLowerCase()) ||
                cat.toLowerCase().includes(skill.toLowerCase())
            )
        );

        if (hasMatchingSkill && user.installerProfile?.rating && user.installerProfile.rating >= 4.5) {
            matchingInstallers.push(user);
        }
    });

    // Sort by rating and review count
    return matchingInstallers.sort((a, b) => {
        const ratingDiff = (b.installerProfile?.rating || 0) - (a.installerProfile?.rating || 0);
        if (Math.abs(ratingDiff) > 0.1) return ratingDiff;
        return (b.installerProfile?.reviews || 0) - (a.installerProfile?.reviews || 0);
    });
}
