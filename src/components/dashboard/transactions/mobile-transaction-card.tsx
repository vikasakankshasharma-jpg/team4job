"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/lib/types";
import { format, formatDistanceToNow } from "date-fns";
import { toDate } from "@/lib/utils";
import { ArrowRight, IndianRupee } from "lucide-react";
import Link from "next/link";

interface MobileTransactionCardProps {
    transaction: Transaction & { payerName?: string; payeeName?: string };
}

export function MobileTransactionCard({ transaction }: MobileTransactionCardProps) {
    const latestTimestamp = toDate(transaction.releasedAt || transaction.fundedAt || transaction.failedAt || transaction.createdAt);

    const getStatusVariant = (status: Transaction['status']) => {
        switch (status) {
            case 'released': return 'success';
            case 'funded': return 'info';
            case 'refunded': return 'secondary';
            case 'failed': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <Card className="mb-4">
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="text-xs font-mono text-muted-foreground">
                            {transaction.id}
                        </div>
                        <Link href={`/dashboard/jobs/${transaction.jobId}`} className="font-medium hover:underline block line-clamp-1 py-1 -my-1">
                            {transaction.jobTitle}
                        </Link>
                    </div>
                    <Badge variant={getStatusVariant(transaction.status)} className="shrink-0">
                        {transaction.status}
                    </Badge>
                </div>

                <div className="flex items-center justify-between py-2 border-y border-border/50">
                    <div className="flex items-center gap-2 text-sm max-w-[70%]">
                        <span className="truncate font-medium">{transaction.payerName || 'Unknown'}</span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">{transaction.payeeName || 'Unknown'}</span>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <div className="flex items-center text-xs text-muted-foreground">
                        {format(latestTimestamp, "PP")}
                    </div>
                    <div className="text-lg font-bold flex items-center">
                        <IndianRupee className="h-4 w-4 mr-0.5" />
                        {transaction.amount.toLocaleString()}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
