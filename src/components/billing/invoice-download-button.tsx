"use client";

import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Transaction, User, SubscriptionPlan } from "@/lib/types";
import { invoiceService } from "@/domains/billing/invoice.service";
import { useUser } from "@/hooks/use-user";

interface InvoiceDownloadButtonProps {
    transaction: Transaction;
    plan?: SubscriptionPlan;
}

export function InvoiceDownloadButton({ transaction, plan }: InvoiceDownloadButtonProps) {
    const { user } = useUser();
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Simulate a small delay for better UX if generation is instantaneous
            await new Promise(resolve => setTimeout(resolve, 500));
            invoiceService.generateInvoice(transaction, user, plan);
        } catch (error) {
            console.error("Failed to generate invoice", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={loading}
            title="Download Invoice"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="ml-2 sr-only">Download Invoice</span>
        </Button>
    );
}
