import { Metadata } from 'next';
import NotificationCenterClient from './notification-center-client';

export const metadata: Metadata = {
    title: 'Notifications | Team4Job',
    description: 'Manage your notifications and preferences',
};

export default function NotificationCenterPage() {
    return <NotificationCenterClient />;
}
