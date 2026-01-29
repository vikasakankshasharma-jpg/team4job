// domains/jobs/job.repository.ts

import { getAdminDb } from '@/infrastructure/firebase/admin';
import { COLLECTIONS, getDocData } from '@/infrastructure/firebase/firestore';
import { logger } from '@/infrastructure/logger';
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

            logger.info('Job created', { jobId: customJobId });
            return customJobId;
        } catch (error) {
            logger.error('Failed to create job', error);
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
            logger.error('Failed to fetch job by ID', error, { metadata: { jobId } });
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
            logger.error('Failed to fetch jobs by job giver', error, { userId: jobGiverId });
            throw error;
        }
    }

    /**
     * Get open jobs (public browsing)
     */
    async fetchOpen(filters?: JobFilters, limit = 50): Promise<Job[]> {
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

            const snapshot = await query.limit(limit).get();
            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Job))
                .sort((a, b) => toDate(b.postedAt).getTime() - toDate(a.postedAt).getTime());
        } catch (error) {
            logger.error('Failed to fetch open jobs', error, { metadata: { filters } });
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
            logger.error('Failed to fetch jobs by installer', error, { userId: installerId });
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

            logger.info('Job status updated', {
                jobId,
                oldStatus: currentStatus,
                newStatus,
                updatedBy,
            });
        } catch (error) {
            logger.error('Failed to update job status', error, { metadata: { jobId, newStatus } });
            throw error;
        }
    }

    /**
     * Update job fields
     */
    async update(jobId: string, updates: Partial<Job>): Promise<void> {
        try {
            const db = getAdminDb();
            console.log(`[JobRepository.update] Updating job ${jobId}. Fields: ${Object.keys(updates).join(', ')}. awardedInstallerId=${updates.awardedInstallerId}`);
            await db.collection(COLLECTIONS.JOBS).doc(jobId).update({
                ...updates,
                updatedAt: Timestamp.now(),
            });

            logger.info('Job updated', { jobId, fields: Object.keys(updates) });
        } catch (error) {
            logger.error('Failed to update job', error, { metadata: { jobId } });
            throw error;
        }
    }

    /**
     * Get job statistics for a user
     */
    async getStatsForJobGiver(jobGiverId: string): Promise<JobStats> {
        try {
            const db = getAdminDb();
            const snapshot = await db
                .collection(COLLECTIONS.JOBS)
                .where('jobGiverId', '==', jobGiverId)
                .get();

            let active = 0;
            let completed = 0;
            let cancelled = 0;
            let totalBids = 0;

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const status = data.status;

                if (status === 'completed' || status === 'Completed') completed++;
                else if (status === 'cancelled' || status === 'Cancelled') cancelled++;
                else active++; // Assuming anything else is active (draft, open, in_progress, etc)

                if (data.bids && Array.isArray(data.bids)) {
                    totalBids += data.bids.length;
                }
            });

            return {
                totalJobs: snapshot.size,
                openJobs: active, // Mapping 'active' to openJobs for now, or we should clarify the interface
                inProgressJobs: 0, // Simplified for now, or strictly check status
                completedJobs: completed,
                cancelledJobs: cancelled,
                totalBids: totalBids
            };
        } catch (error) {
            logger.error('Failed to get job stats', error, { userId: jobGiverId });
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

            logger.info('Job archived', { jobId });
        } catch (error) {
            logger.error('Failed to archive job', error, { metadata: { jobId } });
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
            const [openJobsSnap, myBidsSnap, jobsWonSnap] = await Promise.all([
                db.collection(COLLECTIONS.JOBS).where('status', 'in', ['open', 'Open for Bidding']).count().get(),
                db.collection(COLLECTIONS.JOBS).where('bidderIds', 'array-contains', installerId).count().get(),
                db.collection(COLLECTIONS.JOBS).where('awardedInstallerId', '==', installerId).count().get()
            ]);

            return {
                openJobs: openJobsSnap.data().count,
                myBids: myBidsSnap.data().count,
                jobsWon: jobsWonSnap.data().count,
                projectedEarnings: 0, // Calculated from transactions in service/client
                totalEarnings: 0      // Calculated from transactions in service/client
            };
        } catch (error) {
            logger.error('Failed to get installer stats', error, { userId: installerId });
            throw error;
        }
    }
}

export const jobRepository = new JobRepository();
