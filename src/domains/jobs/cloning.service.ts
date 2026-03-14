
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { Job, CreateJobInput } from './job.types';


/**
 * Job Cloning Service
 * Handles the logic for "Copy-Pasting" an existing job into a new one.
 */
export class JobCloningService {

    /**
     * Prepares a CreateJobInput from an existing jobId
     * Strips out unique identifiers, status, and timestamps.
     */
    async prepareClone(db: Firestore, jobId: string): Promise<CreateJobInput> {
        try {
            const jobSnap = await getDoc(doc(db, 'jobs', jobId));

            if (!jobSnap.exists()) {
                throw new Error('Original job not found');
            }

            const originalJob = jobSnap.data() as Job;

            // Map original job fields to CreateJobInput
            // We EXCLUDE things like status, createdAt, id, and installer-specific data
            const cloneInput: CreateJobInput = {
                title: originalJob.title,
                description: originalJob.description,
                jobCategory: originalJob.jobCategory,
                skills: originalJob.skills || [],
                priceEstimate: originalJob.priceEstimate,
                address: originalJob.address,
                fullAddress: originalJob.fullAddress,
                location: originalJob.location,
                isGstInvoiceRequired: originalJob.isGstInvoiceRequired || false,
                attachments: [],
                travelTip: originalJob.travelTip || 0,
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days from now
            };

            return cloneInput;

        } catch (error) {

            throw new Error('Failed to prepare job clone');
        }
    }
}

export const jobCloningService = new JobCloningService();
