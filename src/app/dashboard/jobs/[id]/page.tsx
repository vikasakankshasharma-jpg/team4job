
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import JobDetailClient from './job-detail-client';

export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { db } from '@/lib/firebase/server-init';

type Props = {
    params: { id: string }
}

export async function generateMetadata(
    { params }: Props,
): Promise<Metadata> {
    // fetch data
    const id = params.id

    try {
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

export default function JobDetailPageWrapper({ params }: Props) {
    // We pass params down or use useParams in client, but Client Component needs map loaded state.
    // Assuming isMapLoaded is handled by a provider or default. 
    // Passing true as fallback to fix the type error if any.
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <JobDetailClient isMapLoaded={true} />
        </Suspense>
    );
}

