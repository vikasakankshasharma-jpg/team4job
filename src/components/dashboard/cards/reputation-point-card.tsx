"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { Award, TrendingUp, Info, ChevronRight, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReputationPointCardProps {
    points: number;
    tier: "Bronze" | "Silver" | "Gold" | "Platinum";
    history?: { month: string; points: number }[];
    className?: string;
}

const TIER_CONFIG = {
    Bronze: {
        color: "text-orange-700",
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
        next: 500,
        nextTier: "Silver",
        icon: Award,
        gradient: "from-orange-500/20 to-transparent"
    },
    Silver: {
        color: "text-slate-400",
        bg: "bg-slate-400/10",
        border: "border-slate-400/20",
        next: 1000,
        nextTier: "Gold",
        icon: Star,
        gradient: "from-slate-400/20 to-transparent"
    },
    Gold: {
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/20",
        next: 2000,
        nextTier: "Platinum",
        icon: Star,
        gradient: "from-yellow-500/20 to-transparent"
    },
    Platinum: {
        color: "text-purple-500",
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
        next: 5000,
        nextTier: "Master",
        icon: Award,
        gradient: "from-purple-500/20 to-transparent"
    }
};

export const ReputationPointCard = ({ points, tier, history, className }: ReputationPointCardProps) => {
    const t = useTranslations("reputation");
    const config = TIER_CONFIG[tier] || TIER_CONFIG.Bronze;
    
    const nextTierPoints = config.next;
    const progress = Math.min(100, (points / nextTierPoints) * 100);
    const pointsLeft = Math.max(0, nextTierPoints - points);

    const monthlyGain = history && history.length > 0 
        ? history[history.length - 1].points 
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn("h-full", className)}
        >
            <Card className="relative h-full overflow-hidden border-none bg-surface-container-low/40 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.1)] rounded-[3rem] group ring-1 ring-white/5">
                {/* Decorative Background Gradient */}
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity duration-500", config.gradient)} />
                
                <CardHeader className="relative z-10 p-10 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className={cn("p-5 rounded-[1.5rem] shadow-inner backdrop-blur-md relative overflow-hidden group/icon", config.bg)}>
                                <div className="absolute inset-0 bg-background/5 opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                                <config.icon className={cn("h-8 w-8 relative z-10", config.color)} />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black italic tracking-tighter uppercase leading-none mb-1">{t("title")}</CardTitle>
                                <CardDescription className="font-bold flex items-center gap-2 opacity-60">
                                    <span className={cn("uppercase tracking-[0.2em] text-[10px] italic", config.color)}>{t(`tier${tier}`)}</span>
                                    <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                    <span className="text-[10px] uppercase tracking-[0.15em]">{points} PTS</span>
                                </CardDescription>
                            </div>
                        </div>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="p-2 rounded-full hover:bg-foreground/5 transition-colors">
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[280px] p-6 bg-surface-container-high/90 backdrop-blur-2xl border-white/5 rounded-[1.5rem] shadow-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed opacity-80">{t("howItWorksDesc")}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </CardHeader>

                <CardContent className="relative z-10 p-8 pt-0 flex flex-col justify-between h-[calc(100%-100px)]">
                    <div className="space-y-6">
                        {/* Points to Next Tier */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-tighter">
                                <span className="text-muted-foreground/60">{t("pointsToNext", { count: pointsLeft, tier: t(`tier${config.nextTier}`) })}</span>
                                <span className="text-on-surface">{Math.round(progress)}%</span>
                            </div>
                            <div className="relative h-2.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1.5, ease: "circOut" }}
                                    className={cn("absolute top-0 left-0 h-full rounded-full bg-gradient-to-r transition-all", 
                                        tier === 'Bronze' ? "from-orange-400 to-orange-600" :
                                        tier === 'Silver' ? "from-slate-300 to-slate-500" :
                                        tier === 'Gold' ? "from-yellow-400 to-yellow-600" :
                                        "from-purple-400 to-purple-600"
                                    )}
                                />
                            </div>
                        </div>

                        {/* Recent Activity Mini-Stat */}
                        <div className="p-6 rounded-[2rem] bg-background/20 backdrop-blur-md border border-white/5 flex items-center justify-between group/stat transition-all hover:bg-background/40 shadow-inner">
                            <div className="flex items-center gap-5">
                                <div className="p-4 rounded-[1.25rem] bg-success/10 shadow-lg shadow-success/10 group-hover/stat:rotate-12 transition-transform">
                                    <TrendingUp className="h-5 w-5 text-success" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 italic">{t("monthlyGain")}</span>
                            </div>
                            <span className="text-base font-black italic tracking-tighter text-success uppercase">+{monthlyGain} PTS</span>
                        </div>
                    </div>

                    {/* Tier Benefits Preview */}
                    <div className="mt-6 pt-6 border-t border-foreground/[0.05]">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{t("benefitsTitle")}</p>
                            <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                             <TierBadge label={t("benefitVisibility")} />
                             {tier !== 'Bronze' && <TierBadge label={t("benefitFees")} />}
                             {(tier === 'Gold' || tier === 'Platinum') && <TierBadge label={t("benefitExclusive")} />}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

const TierBadge = ({ label }: { label: string }) => (
    <span className="px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10 text-[9px] font-black uppercase tracking-tight text-primary/80">
        {label}
    </span>
);
