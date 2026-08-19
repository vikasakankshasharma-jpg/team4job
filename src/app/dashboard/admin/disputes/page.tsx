import { AdminDisputesClient } from "@/components/admin/disputes/admin-disputes-client";

export async function generateMetadata() {
    return {
        title: 'Dispute Resolution | Team4Job',
    };
}

export default function AdminDisputesPage() {
    return (
        <div className="container py-6">
            <AdminDisputesClient />
        </div>
    );
}
