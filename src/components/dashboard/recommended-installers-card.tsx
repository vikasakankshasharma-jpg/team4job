"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/hooks/use-user";
import { User } from "@/lib/types";
import { getRecommendedInstallers } from "@/lib/services/installer-recommendations";
import { InstallerProfileModal } from "@/components/installers/installer-profile-modal";

interface RecommendedInstallersCardProps {
    userId: string;
    currentUser: User;
}

export function RecommendedInstallersCard({ userId, currentUser }: RecommendedInstallersCardProps) {
    const { db } = useFirebase();
    const router = useRouter();
    const [installers, setInstallers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInstaller, setSelectedInstaller] = useState<User | null>(null);

    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!db) return;

            try {
                setLoading(true);
                const recommendations = await getRecommendedInstallers(db, userId, currentUser, {
                    maxResults: 3,
                });
                setInstallers(recommendations);
            } catch (error) {
                console.error("Error fetching recommended installers:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [db, userId, currentUser]);

    const handleQuickHire = (installer: User) => {
        // Navigate to post job with installer pre-selected for direct award
        router.push(`/dashboard/post-job?directAward=${installer.id}`);
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Recommended for You</CardTitle>
                    <CardDescription>Loading recommendations...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-20" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Recommended for You</CardTitle>
                            <CardDescription>Based on your hiring history</CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/dashboard/installers")}
                        >
                            See All
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {installers.length > 0 ? (
                        <div className="space-y-3">
                            {installers.map(installer => (
                                <div
                                    key={installer.id}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedInstaller(installer)}
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <Avatar className="h-10 w-10 flex-shrink-0">
                                            <AnimatedAvatar svg={installer.realAvatarUrl} />
                                            <AvatarFallback>{installer.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{installer.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                                <div className="flex items-center gap-1">
                                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                    <span>{installer.installerProfile?.rating.toFixed(1)}</span>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    {installer.installerProfile?.tier}
                                                </Badge>
                                                {installer.installerProfile?.availability?.status === "available" && (
                                                    <Badge className="bg-green-600 text-xs">Available</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setSelectedInstaller(installer)}
                                            className="hidden sm:flex"
                                        >
                                            View
                                        </Button>
                                        <Button size="sm" onClick={() => handleQuickHire(installer)}>
                                            Hire
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p className="text-sm font-medium">No recommendations yet</p>
                            <p className="text-xs mt-1">Complete more jobs to get personalized suggestions</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-4"
                                onClick={() => router.push("/dashboard/installers")}
                            >
                                Browse All Installers
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedInstaller && (
                <InstallerProfileModal
                    installer={selectedInstaller}
                    isOpen={!!selectedInstaller}
                    onClose={() => setSelectedInstaller(null)}
                    currentUser={currentUser}
                />
            )}
        </>
    );
}
