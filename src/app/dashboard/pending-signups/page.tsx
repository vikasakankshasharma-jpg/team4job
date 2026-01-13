import { Metadata } from "next";
import PendingSignupsClient from "./pending-signups-client";

export const metadata: Metadata = {
    title: "Pending Signups | Admin Dashboard",
    description: "View and manage incomplete user signups",
};

export default function PendingSignupsPage() {
    return <PendingSignupsClient />;
}
