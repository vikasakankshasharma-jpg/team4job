"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const StatCard = ({ title, value, description, icon: Icon, href, iconBgColor, iconColor, trend, className }: { title: string, value: string | number, description?: string, icon: React.ElementType, href: string, iconBgColor: string, iconColor: string, trend?: string, className?: string }) => (
    <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className={cn("h-full", className)}
    >
        <Link href={href} className="block h-full group">
            <Card className="flex flex-col h-full relative overflow-hidden min-w-0 bg-surface-container-low/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] transition-all hover:bg-surface-container shadow-2xl shadow-primary/5 group ring-1 ring-white/5">
                {/* Accent Glow */}
                <div className={cn("absolute top-0 left-0 w-full h-1.5 opacity-30 group-hover:opacity-100 transition-opacity", iconBgColor)} />
                
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-w-0 p-10">
                    <CardTitle className="text-[10px] font-black italic tracking-[0.3em] uppercase text-muted-foreground/30 mr-2 group-hover:text-primary transition-colors">{title}</CardTitle>
                    <div className={cn("p-5 rounded-[1.5rem] transition-all duration-700 group-hover:scale-110 shadow-lg shadow-black/5 relative overflow-hidden group/icon", iconBgColor)}>
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                        <Icon className={cn("h-7 w-7 relative z-10", iconColor)} />
                    </div>
                </CardHeader>
                <CardContent className="flex-grow p-10 pt-0">
                    <div className="text-5xl font-black italic tracking-tighter uppercase text-on-surface leading-none mb-4">
                        {value}
                    </div>
                    {description && <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-[0.2em] italic">{description}</p>}
                    {trend && (
                        <div className="mt-5 flex items-center text-[10px] font-black text-success bg-success/10 w-fit px-4 py-1.5 rounded-full border border-success/20 uppercase tracking-widest italic">
                            {trend}
                        </div>
                    )}
                </CardContent>
            </Card>
        </Link>
    </motion.div>
);

export const StatCardSkeleton = () => (
    <Card className="flex flex-col h-full relative overflow-hidden min-w-0 bg-surface-container-low/40 border border-white/5 animate-pulse rounded-[3rem]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-w-0 p-10">
            <div className="h-4 w-24 bg-muted/50 rounded-[0.5rem]" />
            <div className="h-14 w-14 bg-muted/50 rounded-[1.5rem]" />
        </CardHeader>
        <CardContent className="flex-grow p-10 pt-0">
            <div className="h-12 w-32 bg-muted/50 rounded-[1rem] mb-4" />
            <div className="h-3 w-40 bg-muted/50 rounded-[0.5rem]" />
        </CardContent>
    </Card>
);
