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
import { InstallerPerformance } from "@/lib/api/analytics";

interface InstallerPerformanceTableProps {
    data: InstallerPerformance[];
}

export function InstallerPerformanceTable({ data }: InstallerPerformanceTableProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="col-span-2 lg:col-span-4">
                <CardHeader>
                    <CardTitle>Top Installers</CardTitle>
                    <CardDescription>Installers you work with most often</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
                    No installer data yet
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-2 lg:col-span-4">
            <CardHeader>
                <CardTitle>Top Installers</CardTitle>
                <CardDescription>
                    Performance of your most hired installers
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Installer</TableHead>
                            <TableHead className="text-right">Jobs</TableHead>
                            <TableHead className="text-right">Total Paid</TableHead>
                            <TableHead className="text-right">Avg Rating</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((installer) => (
                            <TableRow key={installer.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={installer.avatarUrl} />
                                            <AvatarFallback>{installer.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span>{installer.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">{installer.jobsCount}</TableCell>
                                <TableCell className="text-right">₹{installer.totalPaid.toLocaleString()}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <span>{installer.avgRating.toFixed(1)}</span>
                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
