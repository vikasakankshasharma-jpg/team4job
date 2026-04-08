"use client";

import React from 'react';
import { Job, AdditionalTask, User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn, toDate } from '@/lib/utils';
import { motion } from "framer-motion";

interface VariationOrderListProps {
    job: Job;
    user: User;
    isClient: boolean;
    onJobUpdate: (updatedJob: Partial<Job>) => Promise<void>;
    onPayForTask: (task: AdditionalTask) => void;
    onQuoteTask: (task: AdditionalTask) => void;
    onDeclineTask: (task: AdditionalTask) => void;
}

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
};

export function VariationOrderList({ job, user, isClient, onPayForTask, onQuoteTask, onDeclineTask }: VariationOrderListProps) {
    const tasks = job.additionalTasks || [];

    if (tasks.length === 0) {
        return (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center p-16 bg-surface-container-low/40 backdrop-blur-3xl rounded-[3.5rem] border border-dashed border-primary/20 shadow-2xl"
            >
                <FileText className="h-12 w-12 mx-auto text-primary/30 mb-4" />
                <p className="text-sm font-black uppercase tracking-widest opacity-40">No variation orders requested yet.</p>
            </motion.div>
        );
    }

    return (
        <div className="space-y-10">
            <div className="flex items-center gap-4">
                <h3 className="text-xl font-black uppercase tracking-[0.3em] italic text-muted-foreground/60">Variation Commands</h3>
                <div className="h-1 flex-1 bg-gradient-to-r from-primary/10 to-transparent rounded-full" />
            </div>
            
            <div className="grid gap-8">
                {tasks.map((task, index) => (
                    <motion.div
                        key={task.id || index}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: index * 0.1 }}
                        className="group relative overflow-hidden rounded-[3.5rem] bg-surface-container-low/40 backdrop-blur-3xl border border-white/5 p-12 shadow-[0_45px_120px_rgba(0,0,0,0.15)] transition-all hover:translate-x-1"
                    >
                        {/* Status Accent Bar */}
                        <div className={cn(
                            "absolute top-0 left-0 w-2 h-full transition-all duration-500",
                            task.status === 'funded' ? "bg-success" : 
                            task.status === 'quoted' ? "bg-amber-500" :
                            "bg-primary/20 group-hover:bg-primary"
                        )} />

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 relative z-10">
                            <div className="space-y-4 flex-1">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <h4 className="text-3xl font-black tracking-tighter italic uppercase underline decoration-primary/20 underline-offset-8">
                                        {task.description}
                                    </h4>
                                    <Badge 
                                        className={cn(
                                            "rounded-[1rem] px-6 py-2 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl border-none",
                                            task.status === 'funded' ? "bg-success text-white" : 
                                            task.status === 'quoted' ? "bg-amber-500 text-white" :
                                            "bg-muted/40 text-muted-foreground"
                                        )}
                                    >
                                        {task.status.replace('-', ' ')}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">
                                    <span className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-primary/40" />
                                        ID {task.id.slice(-8)}
                                    </span>
                                    <span>•</span>
                                    <span>Initiated by {task.createdBy}</span>
                                    <span>•</span>
                                    <span>{format(task.createdAt ? toDate(task.createdAt) : new Date(), 'MMM d, yyyy')}</span>
                                </div>
                                
                                {task.quoteDetails && (
                                    <p className="text-sm font-medium opacity-80 leading-relaxed max-w-2xl bg-background/40 p-10 rounded-[3rem] border border-white/5 shadow-inner italic ring-1 ring-white/5">
                                        "{task.quoteDetails}"
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col items-end gap-6 min-w-[240px]">
                                <div className="text-right">
                                    {task.quoteAmount ? (
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Financial Commitment</span>
                                            <div className="text-4xl font-black tracking-tighter italic text-primary">
                                                ₹{task.quoteAmount.toLocaleString()}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-xs font-black uppercase tracking-[0.3em] opacity-30 italic bg-muted/20 px-4 py-2 rounded-xl">Price Logistics Pending</div>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-3 w-full justify-end">
                                    {task.status === 'pending-quote' && !isClient && (
                                        <Button 
                                            onClick={() => onQuoteTask(task)}
                                            className="rounded-[1.5rem] h-14 px-8 font-black uppercase tracking-[0.2em] text-[10px] bg-primary text-primary-foreground shadow-2xl shadow-primary/20 hover:scale-105 transition-all w-full md:w-auto"
                                        >
                                            Submit Quoted Intelligence
                                        </Button>
                                    )}

                                    {task.status === 'quoted' && isClient && (
                                        <>
                                            <Button 
                                                variant="ghost" 
                                                className="rounded-[1.5rem] h-14 px-6 font-black uppercase tracking-[0.2em] text-[10px] text-destructive hover:bg-destructive/10"
                                                onClick={() => onDeclineTask(task)}
                                            >
                                                <XCircle className="h-4 w-4 mr-2" />
                                                Decline
                                            </Button>
                                            <Button 
                                                className="rounded-[1.5rem] h-14 px-10 font-black uppercase tracking-[0.2em] text-[10px] bg-success text-white shadow-2xl shadow-success/20 hover:scale-105 transition-all"
                                                onClick={() => onPayForTask(task)}
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                Approve & Fund
                                            </Button>
                                        </>
                                    )}

                                    {task.status === 'pending-quote' && isClient && (
                                        <div className="bg-muted/10 border border-white/5 px-6 py-3 rounded-full flex items-center gap-3">
                                            <Loader2 className="h-3 w-3 animate-spin opacity-40" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic">Waiting for professional quote</span>
                                        </div>
                                    )}
                                    
                                    {task.status === 'quoted' && !isClient && (
                                        <div className="bg-muted/10 border border-white/5 px-6 py-3 rounded-full flex items-center gap-3">
                                            <Loader2 className="h-3 w-3 animate-spin opacity-40" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic">Awaiting client authorization</span>
                                        </div>
                                    )}

                                    {task.status === 'funded' && (
                                        <div className="flex items-center gap-3 bg-success/10 text-success px-8 py-4 rounded-full font-black uppercase tracking-[0.2em] text-[10px] ring-1 ring-success/20">
                                            <CheckCircle2 className="h-5 w-5" />
                                            Mission Funded & Verified
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
