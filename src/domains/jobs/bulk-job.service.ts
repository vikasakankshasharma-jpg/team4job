
import { Firestore, collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { CreateJobInput } from './job.types';
import { JobTemplate } from '@/domains/ai/template.service';


/**
 * Bulk Job Service
 * Handles mass creation, spreadsheet parsing, and sample generation.
 */
export class BulkJobService {

    /**
     * Parses a CSV string into a list of job drafts based on a template
     */
    parseCSV(csvContent: string, template: JobTemplate): Partial<CreateJobInput>[] {
        try {
            const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
            if (lines.length < 2) return [];

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const dataLines = lines.slice(1);

            return dataLines.map(line => {
                const values = line.split(',').map(v => v.trim());
                const job: any = { 
                    ...template.defaultAnswers,
                    jobCategory: template.category,
                    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                };

                headers.forEach((header, index) => {
                    const value = values[index];
                    if (!value) return;

                    if (header.includes('title')) job.title = value;
                    if (header.includes('desc')) job.description = value;
                    if (header.includes('address')) job.fullAddress = value;
                    if (header.includes('budget') || header.includes('price')) {
                        const parts = value.split('-').map(p => parseInt(p.replace(/[^0-9]/g, '')));
                        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                            job.priceEstimate = { min: parts[0], max: parts[1] };
                        }
                    }
                });

                return job;
            });
        } catch (error) {

            throw new Error('Invalid CSV format');
        }
    }

    /**
     * Generates a sample CSV string for a specific template
     */
    generateSampleCSV(template: JobTemplate): string {
        const headers = ['Title', 'Description', 'Pincode', 'Address', 'Budget_Range (Min-Max)'];
        const sampleRow = [
            template.name,
            template.description,
            '110001',
            'Full address here',
            '10000-20000'
        ];
        return [headers.join(','), sampleRow.join(',')].join('\n');
    }

    /**
     * Creates multiple jobs in a single batch (max 500)
     */
    async createBulkJobs(db: Firestore, userId: string, jobs: CreateJobInput[]): Promise<void> {
        const batch = writeBatch(db);
        const jobsRef = collection(db, 'jobs');

        jobs.forEach(job => {
            const newJobData = {
                ...job,
                userId,
                status: 'draft',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            const newDocRef = doc(jobsRef);
            batch.set(newDocRef, newJobData);
        });

        await batch.commit();
    }
}

export const bulkJobService = new BulkJobService();
