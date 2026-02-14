import { ApprovalsClient } from "@/components/admin/approvals/approvals-client";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
    const t = await getTranslations('admin');
    return {
        title: `Approvals | ${t('brandName')}`,
    };
}

export default function ApprovalsPage() {
    return (
        <div className="container py-6">
            <ApprovalsClient />
        </div>
    );
}
