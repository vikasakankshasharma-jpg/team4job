"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { ProfessionalPerformance } from "@/lib/api/analytics";
import { useTranslations } from "next-intl";

interface ProfessionalPerformanceTableProps {
    data: ProfessionalPerformance[];
}

export function ProfessionalPerformanceTable({ data }: ProfessionalPerformanceTableProps) {
    const t = useTranslations('analytics');

    if (!data || data.length === 0) {
        return (
            <div data-testid="analytics-top-Professionals" className="col-span-2 lg:col-span-4">
                <Card className="col-span-2 lg:col-span-4">
                    <CardHeader>
                        <CardTitle>{t('topProfessionals')}</CardTitle>
                        <CardDescription>{t('workMostOften')}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
                        {t('noProfessionalData')}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div data-testid="analytics-top-Professionals" className="col-span-2 lg:col-span-4">
            <Card className="col-span-2 lg:col-span-4">
                <CardHeader>
                    <CardTitle>{t('topProfessionals')}</CardTitle>
                    <CardDescription>
                        {t('performanceMostHired')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('tableProfessional')}</TableHead>
                                <TableHead className="text-right">{t('tableJobs')}</TableHead>
                                <TableHead className="text-right">{t('tableTotalPaid')}</TableHead>
                                <TableHead className="text-right">{t('tableAvgRating')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((Professional) => (
                                <TableRow key={Professional.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={Professional.avatarUrl} />
                                                <AvatarFallback>{Professional.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span>{Professional.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">{Professional.jobsCount}</TableCell>
                                    <TableCell className="text-right">₹{Professional.totalPaid.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <span>{Professional.avgRating.toFixed(1)}</span>
                                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
