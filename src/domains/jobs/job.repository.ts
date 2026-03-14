// domains/jobs/job.repository.ts

import { getAdminDb } from '@/infrastructure/firebase/admin';
import { COLLECTIONS, getDocData } from '@/infrastructure/firebase/firestore';

import { Job, JobFilters, JobStats, InstallerStats } from './job.types';
import { Timestamp } from 'firebase-admin/firestore';
import { toDate } from '@/lib/utils';

/**
 * Job Repository - Data access layer for jobs
 * Only handles Firestore reads/writes, no business logic
 */
export class JobRepository {
    /**
     * Create a new job
     */
    async create(job: Partial<Job>): Promise<string> {
        try {
            const db = getAdminDb();

            // Generate custom job ID with JOB- prefix
            const timestamp = Date.now().toString(36).toUpperCase();
            const random = Math.random().toString(36).substring(2, 8).toUpperCase();
            const customJobId = `JOB-${timestamp}-${random}`;

            const docRef = db.collection(COLLECTIONS.JOBS).doc(customJobId);
            await docRef.set({
                ...job,
                postedAt: Timestamp.now(),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                bids: [],
                comments: [],
                statusHistory: [],
            });


            return customJobId;
        } catch (error) {

            throw error;
        }
    }

    /**
     * Get job by ID
     */
    async fetchById(jobId: string): Promise<Job | null> {
        try {
            const db = getAdminDb();
            const doc = await db.collection(COLLECTIONS.JOBS).doc(jobId).get();

            if (!doc.exists) {
                return null;
            }

            return { id: doc.id, ...doc.data() } as Job;
        } catch (error) {

            throw error;
        }
    }

    /**
     * Get jobs for a job giver
     */
    async fetchByJobGiver(jobGiverId: string, limit = 50): Promise<Job[]> {
        try {
            const db = getAdminDb();
            const snapshot = await db
                .collection(COLLECTIONS.JOBS)
                .where('jobGiverId', '==', jobGiverId)
                .limit(limit)
                .get();

            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Job))
                .sort((a, b) => toDate(b.postedAt).getTime() - toDate(a.postedAt).getTime());
        } catch (error) {

            throw error;
        }
    }

    /**
     * Get completed jobs for a job giver (for finding related installers)
     */
    async fetchCompletedJobsForJobGiver(jobGiverId: string): Promise<Job[]> {
        try {
            const db = getAdminDb();
            const snapshot = await db
                .collection(COLLECTIONS.JOBS)
                .where('jobGiverId', '==', jobGiverId)
                .where('status', 'in', ['Completed', 'completed']) // Handle case sensitivity
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
        } catch (error) {

            throw error;
        }
    }

    /**
     * Get jobs for a job giver filtered by date
     */
    async fetchByJobGiverSince(jobGiverId: string, sinceDate: Date): Promise<Job[]> {
        try {
            const db = getAdminDb();
            const snapshot = await db
                .collection(COLLECTIONS.JOBS)
                .where('jobGiverId', '==', jobGiverId)
                .where('postedAt', '>=', Timestamp.fromDate(sinceDate))
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
        } catch (error) {

            throw error;
        }
    }

    /**
     * Get open jobs (public browsing)
     */
    async fetchOpen(filters?: JobFilters, limit = 50, lastPostedAt?: Date): Promise<Job[]> {
        try {
            const db = getAdminDb();
            let query = db
                .collection(COLLECTIONS.JOBS)
                .where('status', '==', 'open')
                .orderBy('postedAt', 'desc');

            // Apply filters
            if (filters?.jobCategory) {
                query = query.where('jobCategory', '==', filters.jobCategory);
            }

            if (filters?.pincode) {
                query = query.where('address.cityPincode', '==', filters.pincode);
            }

            if (filters?.isUrgent) {
                query = query.where('isUrgent', '==', true);
            }

            if (lastPostedAt) {
                query = query.startAfter(Timestamp.fromDate(lastPostedAt));
            }

            const snapshot = await query.limit(limit).get();
            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Job))
                .sort((a, b) => toDate(b.postedAt).getTime() - toDate(a.postedAt).getTime());
        } catch (error) {

            throw error;
        }
    }

    /**
     * Get jobs for an installer (where they bid or were awarded)
     */
    async fetchByInstaller(installerId: string, limit = 50): Promise<Job[]> {
        try {
            const db = getAdminDb();

            // Fetch jobs where installer bid
            const biddedSnapshot = await db
                .collection(COLLECTIONS.JOBS)
                .where('bidderIds', 'array-contains', installerId)
                .limit(limit)
                .get();

            // Fetch jobs awarded to installer
            const awardedSnapshot = await db
                .collection(COLLECTIONS.JOBS)
                .where('awardedInstallerId', '==', installerId)
                .limit(limit)
                .get();

            // Merge and deduplicate
            const jobMap = new Map<string, Job>();

            biddedSnapshot.docs.forEach(doc => {
                jobMap.set(doc.id, { id: doc.id, ...doc.data() } as Job);
            });

            awardedSnapshot.docs.forEach(doc => {
                jobMap.set(doc.id, { id: doc.id, ...doc.data() } as Job);
            });

            return Array.from(jobMap.values());
        } catch (error) {

            throw error;
        }
    }

    /**
     * Update job status
     */
    async updateStatus(
        jobId: string,
        newStatus: string,
        updatedBy: string,
        reason?: string
    ): Promise<void> {
        try {
            const db = getAdminDb();
            const jobRef = db.collection(COLLECTIONS.JOBS).doc(jobId);

            // Get current job to add to history
            const currentJob = await jobRef.get();
            const currentStatus = currentJob.data()?.status;

            await jobRef.update({
                status: newStatus,
                updatedAt: Timestamp.now(),
                statusHistory: (currentJob.data()?.statusHistory || []).concat([{
                    oldStatus: currentStatus,
                    newStatus: newStatus,
                    timestamp: Timestamp.now(),
                    changedBy: updatedBy,
                    reason,
                }]),
            });


        } catch (error) {

            throw error;
        }
    }

    /**
     * Update job fields
     */
    async update(jobId: string, updates: Partial<Job>): Promise<void> {
        try {
            const db = getAdminDb();

            await db.collection(COLLECTIONS.JOBS).doc(jobId).update({
                ...updates,
                updatedAt: Timestamp.now(),
            });


        } catch (error) {

            throw error;
        }
    }

    /**
     * Get job statistics for a user
     */
    async getStatsForJobGiver(jobGiverId: string): Promise<JobStats> {
        try {
            const db = getAdminDb();

            // Parallel aggregation queries
            const [activeSnap, completedSnap, cancelledSnap, allJobsSnap] = await Promise.all([
                // Active jobs: status in ['open', 'Open for Bidding', 'in_progress', 'Pending Confirmation', 'Pending Funding']
                // This might be tricky with 'in' limit of 10. Let's simplify or do multiple counts if needed.
                // Or just count total - (completed + cancelled).
                db.collection(COLLECTIONS.JOBS)
                    .where('jobGiverId', '==', jobGiverId)
                    .where('status', 'in', ['open', 'Open for Bidding', 'in_progress', 'In Progress', 'Pending Funding', 'Pending Confirmation'])
                    .count()
                    .get(),

                db.collection(COLLECTIONS.JOBS)
                    .where('jobGiverId', '==', jobGiverId)
                    .where('status', 'in', ['Completed', 'completed'])
                    .count()
                    .get(),

                db.collection(COLLECTIONS.JOBS)
                    .where('jobGiverId', '==', jobGiverId)
                    .where('status', 'in', ['Cancelled', 'cancelled'])
                    .count()
                    .get(),

                db.collection(COLLECTIONS.JOBS)
                    .where('jobGiverId', '==', jobGiverId)
                    .count()
                    .get()
            ]);

            // Fetch user for cached totalBids
            const userDoc = await db.collection(COLLECTIONS.USERS).doc(jobGiverId).get();
            const userData = userDoc.data();

            return {
                totalJobs: allJobsSnap.data().count,
                openJobs: activeSnap.data().count,
                inProgressJobs: 0,
                completedJobs: completedSnap.data().count,
                cancelledJobs: cancelledSnap.data().count,
                totalBids: userData?.totalBids || 0
            };
        } catch (error) {

            throw error;
        }
    }

    /**
     * Delete a job (soft delete - archive)
     */
    async archive(jobId: string): Promise<void> {
        try {
            const db = getAdminDb();
            await db.collection(COLLECTIONS.JOBS).doc(jobId).update({
                archived: true,
                updatedAt: Timestamp.now(),
            });


        } catch (error) {

            throw error;
        }
    }
    /**
     * Get statistics for an installer
     */
    async getStatsForInstaller(installerId: string): Promise<InstallerStats> {
        try {
            const db = getAdminDb();

            // Parallelize the queries for performance
            const [openJobsSnap, myBidsSnap, jobsWonSnap, activeJobsSnap, completedJobsSnap, userDoc] = await Promise.all([
                db.collection(COLLECTIONS.JOBS).where('status', 'in', ['open', 'Open for Bidding']).count().get(),
                db.collection(COLLECTIONS.JOBS).where('bidderIds', 'array-contains', installerId).count().get(),
                db.collection(COLLECTIONS.JOBS).where('awardedInstallerId', '==', installerId).count().get(),
                db.collection(COLLECTIONS.JOBS)
                    .where('awardedInstallerId', '==', installerId)
                    .where('status', 'in', ['in_progress', 'funded', 'bid_accepted'])
                    .count().get(),
                db.collection(COLLECTIONS.JOBS)
                    .where('awardedInstallerId', '==', installerId)
                    .where('status', '==', 'completed')
                    .count().get(),
                db.collection(COLLECTIONS.USERS).doc(installerId).get()
            ]);

            const userData = userDoc.data();

            return {
                openJobs: openJobsSnap.data().count,
                myBids: myBidsSnap.data().count,
                jobsWon: jobsWonSnap.data().count,
                activeJobs: activeJobsSnap.data().count,
                completedJobs: completedJobsSnap.data().count,
                projectedEarnings: userData?.projectedEarnings || 0,
                totalEarnings: userData?.totalEarnings || 0
            };
        } catch (error) {

            throw error;
        }
    }
}

export const jobRepository = new JobRepository();
