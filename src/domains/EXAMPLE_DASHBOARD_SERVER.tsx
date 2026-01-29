// Example: Server Component Using Job Service
// app/(dashboard)/job-giver/page.tsx

import { jobService } from '@/domains/jobs/job.service';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Job Giver Dashboard - Server Component
 * ✅ Uses domain service for data fetching
 */
export default async function JobGiverDashboard() {
    // Get current user from session
    const cookieStore = cookies();
    const userId = await getUserIdFromSession(cookieStore);

    if (!userId) {
        redirect('/login');
    }

    // ✅ CORRECT: Server component calls service directly
    const [jobs, stats] = await Promise.all([
        jobService.listJobsForJobGiver(userId),
        jobService.getStatsForJobGiver(userId),
    ]);

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">My Jobs</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Jobs" value={stats.totalJobs} />
                <StatCard label="Open Jobs" value={stats.openJobs} />
                <StatCard label="In Progress" value={stats.inProgressJobs} />
                <StatCard label="Completed" value={stats.completedJobs} />
            </div>

            {/* Jobs List */}
            <div className="space-y-4">
                {jobs.map(job => (
                    <JobCard key={job.id} job={job} />
                ))}
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
        </div>
    );
}

function JobCard({ job }: { job: any }) {
    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-semibold">{job.title}</h3>
                    <p className="text-gray-600 mt-2">{job.description.slice(0, 150)}...</p>
                </div>
                <div className="text-right">
                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                        {job.bids.length} bids
                    </div>
                </div>
            </div>
        </div>
    );
}

function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        draft: 'bg-gray-100 text-gray-800',
        open: 'bg-blue-100 text-blue-800',
        bid_accepted: 'bg-yellow-100 text-yellow-800',
        funded: 'bg-green-100 text-green-800',
        in_progress: 'bg-purple-100 text-purple-800',
        completed: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

async function getUserIdFromSession(cookieStore: any): Promise<string | null> {
    // This would use your actual session management
    // Simplified for example
    return 'user-id-from-session';
}

/**
 * BENEFITS:
 * - ✅ No client-side Firebase
 * - ✅ Fast server-side rendering
 * - ✅ SEO-friendly
 * - ✅ Business logic in service layer
 * - ✅ Easy to test
 */
