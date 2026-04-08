"use client";

import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/use-notifications';

export function ActionRequiredDashboard() {
    const router = useRouter();
    const { notifications } = useNotifications();

    // Filter for high priority or urgent notifications that require action
    const urgentActions = notifications.filter(n =>
        !n.read &&
        (n.priority === 'urgent' || n.priority === 'high') &&
        n.actionUrl
    ).slice(0, 3);

    if (urgentActions.length === 0) return null;

    return (
        <Card className="border-none bg-surface-container-low/60 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_40px_100px_rgba(var(--warning),0.15)] ring-1 ring-white/10 overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-warning via-amber-500 to-transparent shadow-[0_0_30px_rgba(245,158,11,0.4)]" />
            <CardHeader className="pb-4 pt-10 px-10">
                <CardTitle className="text-sm flex items-center gap-4 text-warning font-black italic tracking-tighter uppercase">
                    <div className="p-3 rounded-[1rem] bg-warning/20 shadow-lg shadow-warning/20 border border-warning/10">
                        <AlertCircle className="h-5 w-5 animate-pulse" />
                    </div>
                    Priority Mission Intel // Attention Required
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-10 pb-10">
                {urgentActions.map(action => (
                    <div key={action.id} className="flex items-center justify-between p-8 bg-background/50 rounded-[2rem] border border-white/5 shadow-inner group/item hover:bg-background/80 transition-all hover:translate-x-1">
                        <div className="flex items-start gap-5">
                            <div className="mt-1 bg-warning/10 p-4 rounded-[1.25rem] border border-warning/20 shadow-inner group-hover/item:scale-110 transition-transform">
                                <Clock className="h-5 w-5 text-warning" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-black italic tracking-tighter uppercase text-sm">{action.title}</h4>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 leading-relaxed max-w-[40ch]">{action.message}</p>
                            </div>
                        </div>
                        {action.actionUrl && (
                            <Button size="sm" variant="ghost" className="h-14 px-10 rounded-[1.5rem] bg-warning text-white hover:bg-warning/90 font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-2xl shadow-warning/30 hover:shadow-warning/50 hover:scale-[1.05] active:scale-[0.95]" onClick={() => router.push(action.actionUrl!)}>
                                {action.actionLabel || "RESOLVE"} <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
