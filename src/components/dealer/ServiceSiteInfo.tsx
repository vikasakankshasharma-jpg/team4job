'use client';

import React from 'react';
import { Job } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Building, Lock } from 'lucide-react';

interface Props {
    job: Job;
    isPreAward: boolean;
}

export default function ServiceSiteInfo({ job, isPreAward }: Props) {
    return (
        <Card className={isPreAward ? "bg-muted/30" : ""}>
            <CardHeader>
                <CardTitle className="flex items-center text-lg">
                    <Building className="mr-2 h-5 w-5" />
                    Service Site
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {isPreAward && (
                    <div className="flex items-center text-amber-600 bg-amber-50 p-2 rounded text-xs mb-4">
                        <Lock className="mr-2 h-4 w-4" />
                        Exact address is hidden until the job is awarded.
                    </div>
                )}
                
                <div className="space-y-2 text-sm">
                    <div className="flex items-start">
                        <MapPin className="mr-2 h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                            <span className="font-medium block">Site Location</span>
                            <span className="text-muted-foreground">
                                {isPreAward 
                                    ? `${job.location}, ${job.address?.cityPincode} (Exact address hidden)`
                                    : job.fullAddress
                                }
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
