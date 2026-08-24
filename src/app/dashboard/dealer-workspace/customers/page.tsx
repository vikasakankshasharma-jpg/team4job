import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import CustomerManagementClient from './customer-management-client';
import { listCustomersAction, listServiceSitesAction } from '@/app/actions/dealer.actions';

export const dynamic = 'force-dynamic';

export default async function DealerCustomersPage() {
    let initialCustomers: any[] = [];
    let initialSites: any[] = [];

    const [custRes, sitesRes] = await Promise.all([
        listCustomersAction(),
        listServiceSitesAction()
    ]);

    if (custRes.success && custRes.data) initialCustomers = custRes.data;
    if (sitesRes.success && sitesRes.data) initialSites = sitesRes.data;

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <CustomerManagementClient initialCustomers={initialCustomers} initialSites={initialSites} />
        </Suspense>
    );
}
