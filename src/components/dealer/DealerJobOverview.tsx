'use client';

import React from 'react';
import { Job } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Tag, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import ServiceSiteInfo from './ServiceSiteInfo';

interface Props {
    job: Job;
}

export default function DealerJobOverview({ job }: Props) {
    const isPreAward = job.status === 'draft' || job.status === 'open' || job.status === 'reviewing';

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'draft': return 'secondary';
            case 'open': return 'default';
            case 'in_progress': return 'outline'; // Or custom color
            case 'completed': return 'default'; // Success color
            case 'cancelled': return 'destructive';
            default: return 'secondary';
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Job Details</CardTitle>
                            <Badge variant={getStatusBadgeVariant(job.status)} className="capitalize">
                                {job.status.replace('_', ' ')}
                            </Badge>
                        </div>
                        <CardDescription>{job.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center text-sm">
                            <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="font-medium mr-2">Category:</span> {job.jobCategory}
                        </div>
                        <div className="flex items-center text-sm">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="font-medium mr-2">Deadline:</span> 
                            {job.deadline ? format(new Date((job.deadline as any)._seconds ? (job.deadline as any)._seconds * 1000 : job.deadline), 'PPP') : 'Not specified'}
                        </div>
                        <div className="flex items-center text-sm">
                            <IndianRupee className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="font-medium mr-2">Job Value:</span> 
                            {isPreAward ? 'Hidden before award' : `₹${job.budget}`}
                        </div>
                        <div className="flex items-center text-sm">
                            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="font-medium mr-2">Location Area:</span> {job.location} ({job.address?.cityPincode})
                        </div>
                    </CardContent>
                </Card>
                
                {/* Dealer specific data */}
                {job.endCustomerDetails && (
                    <Card>
                        <CardHeader>
                            <CardTitle>B2B Customer Profile</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm space-y-2">
                                <p><span className="font-medium">Name:</span> {job.endCustomerDetails.name}</p>
                                {/* Hide contact if pre-award (though dealer owns it, UI masking is good practice for screenshots/demos) */}
                                <p><span className="font-medium">Contact:</span> {isPreAward ? '********** (Masked)' : job.endCustomerDetails.phone}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="space-y-6">
                <ServiceSiteInfo job={job} isPreAward={isPreAward} />
            </div>
        </div>
    );
}
