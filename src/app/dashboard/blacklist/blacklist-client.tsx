
"use client";

import React, { useEffect, useState } from 'react';
import BlacklistManager from './blacklist-manager';
import { useFirebase } from "@/hooks/use-user";
import { BlacklistEntry } from "@/lib/types";
import { collection, getDocs } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function BlacklistClient() {
    const { db } = useFirebase();
    const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = React.useCallback(async () => {
        if (!db) return;
        setLoading(true);
        const blacklistSnap = await getDocs(collection(db, "blacklist"));
        setBlacklist(blacklistSnap.docs.map(d => d.data() as BlacklistEntry));
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

    return <BlacklistManager blacklist={blacklist} onDataChange={fetchData} />;
}
