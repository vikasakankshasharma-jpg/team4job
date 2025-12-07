
"use client";

import React, { useEffect, useState } from 'react';
import SubscriptionPlansManager from './subscription-plans-manager';
import { useFirebase } from "@/hooks/use-user";
import { SubscriptionPlan } from "@/lib/types";
import { collection, getDocs } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function SubscriptionPlansClient() {
    const { db } = useFirebase();
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = React.useCallback(async () => {
        if (!db) return;
        setLoading(true);
        const plansSnap = await getDocs(collection(db, "subscriptionPlans"));
        setPlans(plansSnap.docs.map(d => d.data() as SubscriptionPlan));
        setLoading(false);
    }, [db]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return <SubscriptionPlansManager plans={plans} onDataChange={fetchData} />;
}
