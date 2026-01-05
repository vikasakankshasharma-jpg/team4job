
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import JobDetailClient from './job-detail-client';

export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { db } from '@/lib/firebase/server-init';

type Props = {
    params: Promise<{ id: string }>
}

export async function generateMetadata(
    props: Props,
): Promise<Metadata> {
    // fetch data
    const params = await props.params;
    const id = params.id

    try {
        if (!id) return { title: 'CCTV Job Connect' };
        const docRef = db.collection('jobs').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return {
                title: 'Job Not Found | CCTV Job Connect',
            }
        }

        const job = docSnap.data();

        return {
            title: `${job?.title} | CCTV Job Connect`,
            description: job?.description?.substring(0, 160) || 'Hire verified CCTV professionals for your security needs.',
            openGraph: {
                title: `${job?.title} - Remote Hire`,
                description: job?.description?.substring(0, 200),
                type: 'website',
            }
        }
    } catch (error) {
        console.error("Error generating metadata:", error);
        return {
            title: 'CCTV Job Connect',
            description: 'Hire verified CCTV professionals.'
        }
    }
}

export default async function JobDetailPageWrapper(props: Props) {
    const params = await props.params;
    const id = params.id;
    let initialJob = null;

    if (id) {
        try {
            const docRef = db.collection('jobs').doc(id);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                // Serializable JSON for client component
                initialJob = { id: docSnap.id, ...docSnap.data() };

                // Convert Firestore Timestamps to ISO strings or numbers if needed for serialization
                // Or ensure JobDetailClient handles the serialized format (Date objects passed from Server to Client in Next.js 13+ inside server components needs care if using pure JSON, but Server Components verify serialization).
                // Firestore data() contains timestamps. We might need to convert them.
                // Simplest: pass raw data, let nextjs serialize if possible, or convert toJSON.
                // For safety:
                initialJob = JSON.parse(JSON.stringify(initialJob));
            }
        } catch (error) {
            console.error("Error pre-fetching job:", error);
        }
    }

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <JobDetailClient isMapLoaded={true} initialJob={initialJob} />
        </Suspense>
    );
}

