"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function JobCardSkeleton() {
    return (
        <Card className="flex flex-col relative rounded-[3rem] border-none bg-surface-container-low/40" data-testid="skeleton-loader">
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                        {/* Badges */}
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-24 rounded-full" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                        {/* Title */}
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-3/4" />
                        {/* ID */}
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                {/* Client Info */}
                <div className="flex items-center gap-3 pt-4">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-10 pb-10 flex-grow">
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-5">
                        <Skeleton className="h-20 w-full rounded-[2rem]" />
                        <Skeleton className="h-20 w-full rounded-[2rem]" />
                    </div>
                    <Skeleton className="h-20 w-full rounded-[2rem]" />
                </div>
            </CardContent>
            <CardFooter className="p-10 pt-0">
                <Skeleton className="h-16 w-full rounded-[2rem]" />
            </CardFooter>
        </Card>
    );
}

export function JobCardSkeletonGrid({ count = 6 }: { count?: number }) {
    return (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
                <JobCardSkeleton key={i} />
            ))}
        </div>
    );
}
