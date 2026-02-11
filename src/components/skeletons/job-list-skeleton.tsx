import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";

export function JobListSkeleton() {
    return (
        <div className="space-y-4">
            {/* Filters/Search Bar Skeleton */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Skeleton className="h-10 w-full sm:w-[300px]" />
                <Skeleton className="h-10 w-[120px]" />
                <div className="ml-auto">
                    <Skeleton className="h-10 w-[100px]" />
                </div>
            </div>

            {/* Job Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                    <Card key={i} className="flex flex-col h-full">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-48" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                                <Skeleton className="h-6 w-16" />
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 pb-2">
                            <div className="space-y-2 mt-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-[90%]" />
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Skeleton className="h-5 w-16 rounded-full" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                        </CardContent>
                        <CardFooter className="pt-2 border-t mt-auto">
                            <div className="flex justify-between w-full items-center">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-9 w-24" />
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
