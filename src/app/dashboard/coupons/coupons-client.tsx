
"use client";

import React, { useEffect, useState } from 'react';
import CouponsManager from './coupons-manager';
import { useFirebase } from "@/hooks/use-user";
import { Coupon } from "@/lib/types";
import { collection, getDocs } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function CouponsClient() {
    const { db } = useFirebase();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = React.useCallback(async () => {
        if (!db) return;
        setLoading(true);
        const couponsSnap = await getDocs(collection(db, "coupons"));
        setCoupons(couponsSnap.docs.map(d => d.data() as Coupon));
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

    return <CouponsManager coupons={coupons} onDataChange={fetchData} />;
}
