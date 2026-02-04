
import { fetchActivities } from "@/app/actions/dashboard-data.actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";

export async function RecentActivityWidget({ userId }: { userId: string }) {
    const activities = await fetchActivities(userId);
    return <RecentActivity initialActivities={activities} />;
}
