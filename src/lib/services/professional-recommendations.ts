import { collection, query, where, getDocs, limit, orderBy, Timestamp } from "firebase/firestore";
import { Firestore } from "firebase/firestore";
import { User, Job } from "@/lib/types";

interface RecommendationOptions {
    maxResults?: number;
    categoryPreference?: string[];
}

/**
 * Get recommended Professionals for a Client based on:
 * 1. Recent hires who are currently available
 * 2. Favorited Professionals with high ratings
 * 3. Top-rated Professionals matching job categories
 */
export async function getRecommendedProfessionals(
    db: Firestore,
    userId: string,
    currentUser: User,
    options: RecommendationOptions = {}
): Promise<User[]> {
    const { maxResults = 3 } = options;
    const recommendations: User[] = [];
    const seenIds = new Set<string>();

    try {
        // Priority 1: Recently hired Professionals who are available
        const recentlyHired = await getRecentlyHiredAvailable(db, userId, seenIds);
        recommendations.push(...recentlyHired.slice(0, maxResults));
        recentlyHired.forEach(Professional => seenIds.add(Professional.id));

        // If we have enough, return
        if (recommendations.length >= maxResults) {
            return recommendations.slice(0, maxResults);
        }

        // Priority 2: Favorite Professionals with high ratings
        if (currentUser.favoriteProfessionalIds && currentUser.favoriteProfessionalIds.length > 0) {
            const favoriteProfessionals = await getHighRatedFavorites(
                db,
                currentUser.favoriteProfessionalIds,
                seenIds
            );
            const needed = maxResults - recommendations.length;
            recommendations.push(...favoriteProfessionals.slice(0, needed));
            favoriteProfessionals.forEach(Professional => seenIds.add(Professional.id));
        }

        // If we have enough, return
        if (recommendations.length >= maxResults) {
            return recommendations.slice(0, maxResults);
        }

        // Priority 3: Top-rated Professionals matching client's common categories
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
        return [];
    }
}

/**
 * Get Professionals this Client hired in last 6 months who are currently available
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
        where("clientId", "==", userId),
        where("status", "==", "Completed"),
        where("completionTimestamp", ">=", Timestamp.fromDate(sixMonthsAgo)),
        orderBy("completionTimestamp", "desc"),
        limit(20)
    );

    const jobsSnapshot = await getDocs(jobsQuery);
    const professionalIds = new Set<string>();

    jobsSnapshot.docs.forEach(doc => {
        const job = doc.data() as Job;
        if (job.awardedProfessionalId && !seenIds.has(job.awardedProfessionalId)) {
            professionalIds.add(job.awardedProfessionalId);
        }
    });

    if (professionalIds.size === 0) return [];

    // Fetch these Professionals
    const Professionals: User[] = [];
    const professionalIdsArray = Array.from(professionalIds);

    // Firestore 'in' query supports max 10 items, so batch
    for (let i = 0; i < professionalIdsArray.length; i += 10) {
        const batch = professionalIdsArray.slice(i, i + 10);
        const usersQuery = query(
            collection(db, "public_profiles"),
            where("__name__", "in", batch),
            where("roles", "array-contains", "Professional")
        );
        const usersSnapshot = await getDocs(usersQuery);

        usersSnapshot.docs.forEach(doc => {
            const user = { id: doc.id, ...doc.data() } as User;
            // Filter for available Professionals
            if (
                user.professionalProfile?.availability?.status === "available" ||
                !user.professionalProfile?.availability // No status = assume available
            ) {
                Professionals.push(user);
            }
        });
    }

    return Professionals;
}

/**
 * Get favorited Professionals with rating >= 4.5
 */
async function getHighRatedFavorites(
    db: Firestore,
    favoriteIds: string[],
    seenIds: Set<string>
): Promise<User[]> {
    const unseenFavorites = favoriteIds.filter(id => !seenIds.has(id));
    if (unseenFavorites.length === 0) return [];

    const Professionals: User[] = [];

    // Batch fetch in groups of 10
    for (let i = 0; i < unseenFavorites.length; i += 10) {
        const batch = unseenFavorites.slice(i, i + 10);
        const usersQuery = query(
            collection(db, "public_profiles"),
            where("__name__", "in", batch),
            where("roles", "array-contains", "Professional")
        );
        const usersSnapshot = await getDocs(usersQuery);

        usersSnapshot.docs.forEach(doc => {
            const user = { id: doc.id, ...doc.data() } as User;
            if (user.professionalProfile?.rating && user.professionalProfile.rating >= 4.5) {
                Professionals.push(user);
            }
        });
    }

    // Sort by rating descending
    return Professionals.sort((a, b) =>
        (b.professionalProfile?.rating || 0) - (a.professionalProfile?.rating || 0)
    );
}

/**
 * Get Client's most common job categories from last 10 jobs
 */
async function getCommonJobCategories(
    db: Firestore,
    userId: string
): Promise<string[]> {
    const jobsQuery = query(
        collection(db, "jobs"),
        where("clientId", "==", userId),
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
 * Get top-rated Professionals who have skills matching the given categories
 */
async function getTopRatedByCategory(
    db: Firestore,
    categories: string[],
    seenIds: Set<string>
): Promise<User[]> {
    // Query for Professionals with Gold or Platinum tier
    const ProfessionalsQuery = query(
        collection(db, "public_profiles"),
        where("roles", "array-contains", "Professional"),
        where("professionalProfile.tier", "in", ["Gold", "Platinum"]),
        limit(20)
    );

    const ProfessionalsSnapshot = await getDocs(ProfessionalsQuery);
    const matchingProfessionals: User[] = [];

    ProfessionalsSnapshot.docs.forEach(doc => {
        const user = { id: doc.id, ...doc.data() } as User;

        // Skip already seen
        if (seenIds.has(user.id)) return;

        // Check if Professional has skills matching categories
        const hasMatchingSkill = user.professionalProfile?.skills?.some(skill =>
            categories.some(cat =>
                skill.toLowerCase().includes(cat.toLowerCase()) ||
                cat.toLowerCase().includes(skill.toLowerCase())
            )
        );

        if (hasMatchingSkill && user.professionalProfile?.rating && user.professionalProfile.rating >= 4.5) {
            matchingProfessionals.push(user);
        }
    });

    // Sort by rating and review count
    return matchingProfessionals.sort((a, b) => {
        const ratingDiff = (b.professionalProfile?.rating || 0) - (a.professionalProfile?.rating || 0);
        if (Math.abs(ratingDiff) > 0.1) return ratingDiff;
        return (b.professionalProfile?.reviews || 0) - (a.professionalProfile?.reviews || 0);
    });
}

