'use client';

import React, { useState } from 'react';
import { Job } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DealerJobOverview from '@/components/dealer/DealerJobOverview';
import SmartMatchingPanel from '@/components/dealer/SmartMatchingPanel';
import ServiceHistoryPanel from '@/components/dealer/ServiceHistoryPanel';
import DealerJobActions from '@/components/dealer/DealerJobActions';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface Props {
    initialJob: Job;
}

export default function DealerJobDetailsClient({ initialJob }: Props) {
    const [job, setJob] = useState<Job>(initialJob);
    const router = useRouter();

    return (
        <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto w-full p-4 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/dealer-jobs')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
                        <p className="text-sm text-muted-foreground">ID: {job.id}</p>
                    </div>
                </div>
                
                {/* Operational Actions (Submit, Cancel, etc.) */}
                <DealerJobActions job={job} onUpdate={(updatedJob) => setJob(updatedJob)} />
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                    <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                        Job Overview
                    </TabsTrigger>
                    {job.status !== 'draft' && job.status !== 'cancelled' && (
                        <TabsTrigger value="matching" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                            Smart Matches
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                        Service History
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="overview">
                        <DealerJobOverview job={job} />
                    </TabsContent>
                    
                    <TabsContent value="matching">
                        <SmartMatchingPanel job={job} onAwarded={(updatedJob) => setJob(updatedJob)} />
                    </TabsContent>
                    
                    <TabsContent value="history">
                        <ServiceHistoryPanel jobId={job.id} serviceLocationId={job.serviceLocationId} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
