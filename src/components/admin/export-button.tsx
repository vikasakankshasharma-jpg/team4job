"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface ExportButtonProps {
    data: any[];
    filename: string;
    formats?: ("csv" | "json" | "excel")[];
    disabled?: boolean;
    label?: string;
}

export function ExportButton({
    data,
    filename,
    formats = ["csv", "json"],
    disabled = false,
    label,
}: ExportButtonProps) {
    const { toast } = useToast();
    const t = useTranslations('components.export');

    const exportToCSV = () => {
        if (!data || data.length === 0) {
            toast({
                title: t('noDataTitle'),
                description: t('noDataDesc'),
                variant: "destructive",
            });
            return;
        }

        try {
            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(","),
                ...data.map((row) =>
                    headers.map((header) => {
                        const value = row[header];
                        // Handle values with commas or quotes
                        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value ?? "";
                    }).join(",")
                ),
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${filename}.csv`;
            link.click();

            toast({
                title: t('successTitle'),
                description: t('successDesc', { count: data.length, format: 'CSV' }),
            });
        } catch (error) {
            toast({
                title: t('failTitle'),
                description: t('failDesc', { format: 'CSV' }),
                variant: "destructive",
            });
        }
    };

    const exportToJSON = () => {
        if (!data || data.length === 0) {
            toast({
                title: t('noDataTitle'),
                description: t('noDataDesc'),
                variant: "destructive",
            });
            return;
        }

        try {
            const jsonContent = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${filename}.json`;
            link.click();

            toast({
                title: t('successTitle'),
                description: t('successDesc', { count: data.length, format: 'JSON' }),
            });
        } catch (error) {
            toast({
                title: t('failTitle'),
                description: t('failDesc', { format: 'JSON' }),
                variant: "destructive",
            });
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={disabled || !data || data.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    {label || t('button')}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('format')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {formats.includes("csv") && (
                    <DropdownMenuItem onClick={exportToCSV}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        {t('csv')}
                    </DropdownMenuItem>
                )}
                {formats.includes("json") && (
                    <DropdownMenuItem onClick={exportToJSON}>
                        <FileText className="h-4 w-4 mr-2" />
                        {t('json')}
                    </DropdownMenuItem>
                )}
                {formats.includes("excel") && (
                    <DropdownMenuItem onClick={() => toast({ title: t('comingSoonTitle'), description: t('comingSoonDesc') })}>
                        <File className="h-4 w-4 mr-2" />
                        {t('excel')}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

