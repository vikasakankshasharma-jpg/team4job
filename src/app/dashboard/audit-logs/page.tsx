import { Suspense } from 'react';
import AuditLogsClient from './audit-logs-client';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AuditLogsPage() {
    return (
        <Suspense fallback={
            <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <AuditLogsClient />
        </Suspense>
    );
}
