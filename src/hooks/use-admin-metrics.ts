import React from 'react';
import { collection, query, where, Timestamp, getCountFromServer } from "firebase/firestore";
import { startOfDay, startOfWeek } from "date-fns";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { useUser } from "@/hooks/use-user";
import { JOB_STATUS, DISPUTE_STATUS, USER_ROLES } from "@/lib/constants/statuses";

export interface PlatformMetrics {
    activeJobs: number;
    openDisputes: number;
    totalUsers: number;
    newUsersToday: number;
    newJobsToday: number;
    newJobsThisWeek: number;
    completedJobsThisWeek: number;
}

export function useAdminMetrics() {
    const { db } = useFirebase();
    const { user } = useUser();
    const [metrics, setMetrics] = React.useState<PlatformMetrics>({
        activeJobs: 0,
        openDisputes: 0,
        totalUsers: 0,
        newUsersToday: 0,
        newJobsToday: 0,
        newJobsThisWeek: 0,
        completedJobsThisWeek: 0,
    });
    const [statsLoading, setStatsLoading] = React.useState(true);
    const [platformHealth, setPlatformHealth] = React.useState({
        firebase: 'operational',
        overall: 'healthy'
    });

    React.useEffect(() => {
        if (!db || !user || !user.roles.includes(USER_ROLES.admin)) return;

        const fetchMetrics = async () => {
            try {
                setStatsLoading(true);
                const jobsColl = collection(db, 'jobs');
                const usersColl = collection(db, 'users');
                const disputesColl = collection(db, 'disputes');

                const todayStart = Timestamp.fromDate(startOfDay(new Date()));
                const weekStart = Timestamp.fromDate(startOfWeek(new Date()));

                // Active Jobs
                const activeJobsQuery = query(jobsColl, where("status", "in", [JOB_STATUS.IN_PROGRESS, JOB_STATUS.PENDING_CONFIRMATION, JOB_STATUS.PENDING_FUNDING]));
                const activeJobsSnap = await getCountFromServer(activeJobsQuery);

                // Open Disputes
                const disputesQuery = query(disputesColl, where("status", "==", DISPUTE_STATUS.OPEN));
                const disputesSnap = await getCountFromServer(disputesQuery);

                // Total Users
                const usersSnap = await getCountFromServer(usersColl);

                // New Users Today
                const newUsersTodayQuery = query(usersColl, where("memberSince", ">=", todayStart));
                const newUsersTodaySnap = await getCountFromServer(newUsersTodayQuery);

                // New Jobs Today
                const newJobsTodayQuery = query(jobsColl, where("createdAt", ">=", todayStart));
                const newJobsTodaySnap = await getCountFromServer(newJobsTodayQuery);

                // New Jobs This Week
                const newJobsWeekQuery = query(jobsColl, where("createdAt", ">=", weekStart));
                const newJobsWeekSnap = await getCountFromServer(newJobsWeekQuery);

                // Completed Jobs This Week
                const completedJobsWeekQuery = query(jobsColl, where("status", "==", JOB_STATUS.COMPLETED), where("updatedAt", ">=", weekStart));
                const completedJobsWeekSnap = await getCountFromServer(completedJobsWeekQuery);

                setMetrics({
                    activeJobs: activeJobsSnap.data().count,
                    openDisputes: disputesSnap.data().count,
                    totalUsers: usersSnap.data().count,
                    newUsersToday: newUsersTodaySnap.data().count,
                    newJobsToday: newJobsTodaySnap.data().count,
                    newJobsThisWeek: newJobsWeekSnap.data().count,
                    completedJobsThisWeek: completedJobsWeekSnap.data().count,
                });

                setPlatformHealth({
                    firebase: 'operational',
                    overall: 'healthy'
                });
            } catch (error) {
                console.error("Error fetching admin metrics:", error);
                setPlatformHealth({
                    firebase: 'degraded',
                    overall: 'issues'
                });
            } finally {
                setStatsLoading(false);
            }
        };

        fetchMetrics();
    }, [db, user]);

    return { metrics, statsLoading, platformHealth };
}
