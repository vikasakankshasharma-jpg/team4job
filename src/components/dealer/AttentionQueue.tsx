'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Clock, RotateCcw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function AttentionQueue({ queues, metrics }: { queues: any; metrics: any }) {
    const totalUrgent = queues.pendingAwards.length + queues.noMatches.length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Urgent Awards */}
            <Card className={`border-l-4 ${queues.pendingAwards.length > 0 ? 'border-l-red-500 bg-red-50/50' : 'border-l-muted'}`}>
                <CardContent className="p-4 flex items-start gap-4">
                    <div className={`p-2 rounded-full ${queues.pendingAwards.length > 0 ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'}`}>
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{queues.pendingAwards.length}</p>
                        <p className="text-sm font-medium text-muted-foreground leading-tight mt-1">Jobs waiting for award</p>
                    </div>
                </CardContent>
            </Card>

            {/* No Matches */}
            <Card className={`border-l-4 ${queues.noMatches.length > 0 ? 'border-l-orange-500 bg-orange-50/50' : 'border-l-muted'}`}>
                <CardContent className="p-4 flex items-start gap-4">
                    <div className={`p-2 rounded-full ${queues.noMatches.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-muted text-muted-foreground'}`}>
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{queues.noMatches.length}</p>
                        <p className="text-sm font-medium text-muted-foreground leading-tight mt-1">No suitable installer yet</p>
                    </div>
                </CardContent>
            </Card>

            {/* Payments Pending */}
            <Card className={`border-l-4 ${queues.pendingPayments?.length > 0 ? 'border-l-yellow-500 bg-yellow-50/50' : 'border-l-muted'}`}>
                <CardContent className="p-4 flex items-start gap-4">
                    <div className={`p-2 rounded-full ${queues.pendingPayments?.length > 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-muted text-muted-foreground'}`}>
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{queues.pendingPayments?.length || 0}</p>
                        <p className="text-sm font-medium text-muted-foreground leading-tight mt-1">Payments pending</p>
                    </div>
                </CardContent>
            </Card>

            {/* Repeat Jobs / Sites Maintenance */}
            <Card className={`border-l-4 ${queues.maintenanceDueSites?.length > 0 ? 'border-l-blue-500 bg-blue-50/50' : 'border-l-muted'}`}>
                <CardContent className="p-4 flex items-start gap-4">
                    <div className={`p-2 rounded-full ${queues.maintenanceDueSites?.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
                        <RotateCcw className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{queues.maintenanceDueSites?.length || 0}</p>
                        <p className="text-sm font-medium text-muted-foreground leading-tight mt-1">Maintenance due</p>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
