"use client";

import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/use-notifications';

export function ActionRequiredDashboard() {
    const router = useRouter();
    const { notifications } = useNotifications();

    // Filter for high priority or urgent notifications that require action
    const urgentActions = notifications.filter(n =>
        !n.read &&
        (n.priority === 'urgent' || n.priority === 'high') &&
        n.actionUrl
    ).slice(0, 3);

    if (urgentActions.length === 0) return null;

    return (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50/10 dark:bg-amber-900/10">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-500">
                    <AlertCircle className="h-5 w-5" />
                    Action Required
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {urgentActions.map(action => (
                    <div key={action.id} className="flex items-center justify-between p-3 bg-background rounded-md border shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 bg-amber-100 dark:bg-amber-900/30 p-1.5 rounded-full">
                                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h4 className="font-medium text-sm">{action.title}</h4>
                                <p className="text-xs text-muted-foreground">{action.message}</p>
                            </div>
                        </div>
                        {action.actionUrl && (
                            <Button size="sm" variant="outline" onClick={() => router.push(action.actionUrl!)}>
                                {action.actionLabel || "View"} <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
