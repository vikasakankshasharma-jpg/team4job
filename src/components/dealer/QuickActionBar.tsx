'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Copy, Upload, Users, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function QuickActionBar() {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="sm" className="bg-primary text-primary-foreground">
                <Link href="/dashboard/dealer-post-job">
                    <Plus className="mr-2 h-4 w-4" />
                    New Job
                </Link>
            </Button>
            
            <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/dealer-post-job?mode=repeat">
                    <Copy className="mr-2 h-4 w-4" />
                    Post Similar Job
                </Link>
            </Button>

            <Button asChild variant="outline" size="sm" className="text-primary hover:bg-primary/5">
                <Link href="/dashboard/dealer-workspace/bulk-import">
                    <Upload className="mr-2 h-4 w-4" />
                    Bulk Import
                </Link>
            </Button>
            
            <div className="flex-1" />

            <Button asChild variant="ghost" size="sm" className="text-primary hover:bg-primary/5">
                <Link href="/dashboard/dealer-workspace/analytics">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analytics & KPIs
                </Link>
            </Button>

            <Button asChild variant="ghost" size="sm" className="text-primary hover:bg-primary/5">
                <Link href="/dashboard/dealer-workspace/customers">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Customers & Sites
                </Link>
            </Button>
        </div>
    );
}
