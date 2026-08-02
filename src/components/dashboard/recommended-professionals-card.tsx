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
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { User } from "@/lib/types";
import { useTranslations } from "next-intl";
import { getRecommendedProfessionals } from "@/lib/services/professional-recommendations";
import { ProfessionalProfileModal } from "@/components/professionals/professional-profile-modal";

interface RecommendedProfessionalsCardProps {
    userId: string;
    currentUser: User;
}

export function RecommendedProfessionalsCard({ userId, currentUser }: RecommendedProfessionalsCardProps) {
    const { db } = useFirebase();
    const router = useRouter();
    const [Professionals, setProfessionals] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProfessional, setSelectedProfessional] = useState<User | null>(null);
    const t = useTranslations("dashboard");

    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!db) return;

            try {
                setLoading(true);
                const recommendations = await getRecommendedProfessionals(db, userId, currentUser, {
                    maxResults: 3,
                });
                setProfessionals(recommendations);
            } catch (error) {
                // Error fetching recommended Professionals
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [db, userId, currentUser]);

    const handleQuickHire = (Professional: User) => {
        // Navigate to post job with Professional pre-selected for direct award
        router.push(`/dashboard/post-job?directAward=${Professional.id}`);
    };

    if (loading) {
        return (
            <Card className="border-none bg-surface-container-low/60 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.15)] ring-1 ring-white/10 overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-black italic tracking-tighter uppercase">{t("recommendedForYou") || "Recommended for You"}</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">Loading recommendations...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-6 pb-6">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-24 rounded-[2rem] bg-primary/5" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <>
        <Card className="border-none bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_45px_120px_rgba(0,0,0,0.2)] ring-1 ring-white/10 overflow-hidden group">
                <CardHeader className="pb-6 px-10 pt-10 border-b border-white/5 bg-background/5">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-sm font-black italic tracking-[0.4em] uppercase text-primary mb-1">INTELLIGENCE // MATCHING ENGINE</CardTitle>
                            <CardDescription className="text-lg font-black italic tracking-tighter uppercase text-on-surface leading-none opacity-60">Priority Discovery</CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/dashboard/Professionals")}
                            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                        >
                            Explore All
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="px-10 pb-10 pt-10">
                    {Professionals.length > 0 ? (
                        <div className="space-y-6">
                            {Professionals.map(Professional => (
                                <div
                                    key={Professional.id}
                                    className="flex items-center justify-between p-8 rounded-[2.5rem] bg-background/20 backdrop-blur-3xl border border-white/5 hover:bg-background/40 hover:translate-x-2 transition-all cursor-pointer shadow-inner group/item ring-1 ring-white/5"
                                    onClick={() => setSelectedProfessional(Professional)}
                                >
                                    <div className="flex items-center gap-6 flex-1 min-w-0">
                                        <Avatar className="h-16 w-16 flex-shrink-0 shadow-2xl border border-white/10 group-hover/item:scale-110 transition-transform duration-500">
                                            <AnimatedAvatar svg={Professional.realAvatarUrl} />
                                            <AvatarFallback className="font-black italic text-primary">{Professional.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black italic tracking-tighter uppercase text-lg leading-none mb-2">{Professional.name}</p>
                                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap mt-0.5">
                                                <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20 text-yellow-600">
                                                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                                    <span className="font-black">{Professional.professionalProfile?.rating.toFixed(1)}</span>
                                                </div>
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.3em] border-white/10 h-6 px-3 italic">
                                                    {Professional.professionalProfile?.tier}
                                                </Badge>
                                                {Professional.professionalProfile?.availability?.status === "available" && (
                                                    <Badge className="bg-success text-white text-[9px] font-black uppercase tracking-[0.3em] h-6 px-3 italic">AVAILABLE</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 flex-shrink-0 ml-6" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setSelectedProfessional(Professional)}
                                            className="hidden sm:flex h-12 px-8 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.4em] border-primary/20 hover:bg-primary/5 hover:text-primary transition-all italic"
                                        >
                                            AUDIT
                                        </Button>
                                        <Button size="sm" onClick={() => handleQuickHire(Professional)} className="h-12 px-10 rounded-[1.5rem] bg-primary shadow-2xl shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all font-black uppercase tracking-[0.4em] text-[10px] italic">
                                            HIRE
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-muted-foreground/40 bg-muted/5 rounded-[3rem] border border-dashed border-white/10">
                            <Users className="h-20 w-20 mx-auto mb-6 opacity-5" />
                            <p className="text-sm font-black italic uppercase tracking-[0.3em]">No Priority Matches Found</p>
                            <p className="text-[10px] mt-2 font-bold uppercase tracking-widest opacity-40">Complete more missions to unlock intelligence-based matching.</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-10 h-16 px-12 rounded-[1.5rem] border-primary/20 font-black uppercase tracking-[0.4em] text-[10px] hover:bg-primary/5 hover:text-primary transition-all shadow-2xl italic"
                                onClick={() => router.push("/dashboard/Professionals")}
                            >
                                BROWSE INTELLIGENCE DATABASE
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedProfessional && (
                <ProfessionalProfileModal
                    Professional={selectedProfessional}
                    isOpen={!!selectedProfessional}
                    onClose={() => setSelectedProfessional(null)}
                    currentUser={currentUser}
                />
            )}
        </>
    );
}
