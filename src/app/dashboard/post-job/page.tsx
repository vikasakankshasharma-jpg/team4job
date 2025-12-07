
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import PostJobWrapper from './post-job-wrapper';

export const dynamic = 'force-dynamic';

export default function PostJobPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <PostJobWrapper />
        </Suspense>
    );
}
