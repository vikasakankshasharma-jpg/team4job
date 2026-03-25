"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const StatCard = ({ title, value, description, icon: Icon, href, iconBgColor, iconColor, trend }: { title: string, value: string | number, description?: string, icon: React.ElementType, href: string, iconBgColor: string, iconColor: string, trend?: string }) => (
    <motion.div
        whileHover={{ y: -5, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="h-full"
    >
        <Link href={href} className="block h-full group">
            <Card className="flex flex-col h-full relative overflow-hidden min-w-0 border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-[2rem] transition-all duration-500">
                {/* Accent Glow */}
                <div className={cn("absolute top-0 left-0 w-full h-1.5 opacity-30 group-hover:opacity-100 transition-opacity", iconBgColor)} />
                
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-w-0 p-6">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 mr-2">{title}</CardTitle>
                    <div className={cn("p-2.5 rounded-2xl transition-all duration-500 group-hover:rotate-6 group-hover:shadow-lg", iconBgColor)}>
                        <Icon className={cn("h-5 w-5", iconColor)} />
                    </div>
                </CardHeader>
                <CardContent className="flex-grow p-6 pt-0">
                    <div className="text-4xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                        {value}
                    </div>
                    {description && <p className="text-xs text-muted-foreground/80 mt-2 font-bold leading-tight uppercase tracking-wider">{description}</p>}
                    {trend && (
                        <div className="mt-4 flex items-center text-[10px] font-black text-success bg-success/10 w-fit px-3 py-1 rounded-full border border-success/20 uppercase tracking-tighter">
                            {trend}
                        </div>
                    )}
                </CardContent>
            </Card>
        </Link>
    </motion.div>
);

export const StatCardSkeleton = () => (
    <Card className="flex flex-col h-full relative overflow-hidden min-w-0 border-none bg-card/40 animate-pulse rounded-[2rem]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-w-0 p-6">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-10 w-10 bg-muted rounded-2xl" />
        </CardHeader>
        <CardContent className="flex-grow p-6 pt-0">
            <div className="h-12 w-20 bg-muted rounded mb-4" />
            <div className="h-3 w-32 bg-muted rounded" />
        </CardContent>
    </Card>
);
