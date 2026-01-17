"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Header */}
            <div className="flex items-center mb-8">
                <Skeleton className="h-8 w-64" />
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="flex flex-col h-full">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-3 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Section */}
            <div className="mt-8 grid gap-4 md:grid-cols-3">
                <Card className="md:col-span-2 flex flex-col">
                    <CardHeader>
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[300px] flex items-end gap-2 p-6">
                        {[40, 60, 45, 70, 50, 80].map((h, i) => (
                            <Skeleton key={i} className={`w-full rounded-t-md h-[${h}%]`} style={{ height: `${h}%` }} />
                        ))}
                    </CardContent>
                </Card>

                <div className="flex flex-col gap-4">
                    <Card className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-4 w-24" />
                    </Card>
                    <Card className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-4 w-24" />
                    </Card>
                </div>
            </div>

            {/* Bottom Widgets */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                <Card className="h-[200px]"><CardContent className="p-6"><Skeleton className="h-full w-full" /></CardContent></Card>
                <Card className="h-[200px]"><CardContent className="p-6"><Skeleton className="h-full w-full" /></CardContent></Card>
                <Card className="h-[200px]"><CardContent className="p-6"><Skeleton className="h-full w-full" /></CardContent></Card>
            </div>
        </div>
    );
}
