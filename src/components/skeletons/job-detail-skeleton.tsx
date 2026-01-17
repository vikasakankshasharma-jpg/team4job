"use client";

import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export function JobDetailSkeleton() {
    return (
        <div className="space-y-6 animate-pulse p-4 md:p-6 max-w-7xl mx-auto">
            {/* Header / Breadcrumb area */}
            <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Main Content Column */}
                <div className="space-y-6 lg:col-span-2">

                    {/* Header Card */}
                    <Card>
                        <CardHeader className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="space-y-2 w-full">
                                    <Skeleton className="h-8 w-3/4" />
                                    <div className="flex gap-2">
                                        <Skeleton className="h-5 w-24 rounded-full" />
                                        <Skeleton className="h-5 w-24 rounded-full" />
                                    </div>
                                </div>
                                <Skeleton className="h-5 w-20" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-5 w-32" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-5 w-32" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tabs / Content */}
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Skeleton className="h-10 w-32 rounded-md" />
                            <Skeleton className="h-10 w-32 rounded-md" />
                        </div>

                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-48" />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-4 w-4/6" />
                                <div className="pt-4 grid grid-cols-2 gap-4">
                                    <Skeleton className="h-20 w-full rounded-md" />
                                    <Skeleton className="h-20 w-full rounded-md" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6 lg:sticky lg:top-24">

                    {/* Actions Card */}
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                                <Skeleton className="h-10 w-full rounded-md" />
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-12" />
                                </div>
                                <div className="flex justify-between">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-12" />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Skeleton className="h-11 w-full rounded-md" />
                        </CardFooter>
                    </Card>

                    {/* Recent Bids Skeleton */}
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div className="space-y-1 flex-1">
                                        <Skeleton className="h-3 w-24" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                    <Skeleton className="h-5 w-16" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
