import { PayoutsClient } from "@/components/admin/payouts/payouts-client";

export async function generateMetadata() {
    return {
        title: 'Pending Payouts | Team4Job',
    };
}

export default function PayoutsPage() {
    return (
        <div className="container py-6">
            <PayoutsClient />
        </div>
    );
}
