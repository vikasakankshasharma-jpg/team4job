"use client";

import React from 'react';
import { Job, AdditionalTask, User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, FileText } from 'lucide-react';
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
                className="text-center p-12 bg-white/20 backdrop-blur-sm rounded-[2.5rem] border border-dashed border-primary/20"
            >
                <FileText className="h-12 w-12 mx-auto text-primary/30 mb-4" />
                <p className="text-sm font-black uppercase tracking-widest opacity-40">No variation orders requested yet.</p>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-black uppercase tracking-tighter italic px-2">Variation Orders</h3>
            <div className="grid gap-4">
                {tasks.map((task, index) => (
                    <motion.div
                        key={task.id || index}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: index * 0.1 }}
                        className="group relative overflow-hidden rounded-[2.5rem] bg-white/40 backdrop-blur-xl border border-white/40 p-8 shadow-2xl hover:shadow-primary/10 transition-all border-l-8 border-l-primary"
                    >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="space-y-3 flex-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h4 className="text-xl font-black tracking-tighter italic">{task.description}</h4>
                                    <Badge 
                                        className={cn(
                                            "rounded-full px-4 py-1 font-black uppercase text-[10px]",
                                            task.status === 'funded' ? "bg-success text-white" : 
                                            task.status === 'quoted' ? "bg-amber-500 text-white" :
                                            "bg-muted text-muted-foreground"
                                        )}
                                    >
                                        {task.status.replace('-', ' ')}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest opacity-40">
                                    <span>ID: {task.id.substring(0, 8)}</span>
                                    <span>•</span>
                                    <span>Created by {task.createdBy}</span>
                                    <span>•</span>
                                    <span>{format(task.createdAt ? toDate(task.createdAt) : new Date(), 'MMM d, yyyy')}</span>
                                </div>
                                
                                {task.quoteDetails && (
                                    <p className="text-sm font-medium opacity-60 leading-relaxed max-w-2xl bg-white/20 p-4 rounded-2xl">{task.quoteDetails}</p>
                                )}
                            </div>

                            <div className="flex flex-col items-end gap-4 min-w-[200px]">
                                <div className="text-right">
                                    {task.quoteAmount ? (
                                        <div className="text-3xl font-black tracking-tighter italic text-primary">
                                            ₹{task.quoteAmount.toLocaleString()}
                                        </div>
                                    ) : (
                                        <div className="text-sm font-black uppercase tracking-widest opacity-30 italic">Price TBD</div>
                                    )}
                                </div>

                                <div className="flex gap-2 w-full justify-end">
                                    {task.status === 'pending-quote' && !isClient && (
                                        <Button 
                                            onClick={() => onQuoteTask(task)}
                                            className="rounded-full px-8 py-6 font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform w-full md:w-auto"
                                        >
                                            Submit Quote
                                        </Button>
                                    )}

                                    {task.status === 'quoted' && isClient && (
                                        <>
                                            <Button 
                                                variant="outline" 
                                                className="rounded-full px-6 py-4 font-black uppercase tracking-widest text-[10px] text-destructive border-destructive/20 hover:bg-destructive/5"
                                                onClick={() => onDeclineTask(task)}
                                            >
                                                <XCircle className="h-4 w-4 mr-2" />
                                                Decline
                                            </Button>
                                            <Button 
                                                className="rounded-full px-8 py-6 font-black uppercase tracking-widest text-xs bg-success hover:bg-success/90 hover:scale-105 transition-transform"
                                                onClick={() => onPayForTask(task)}
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                Approve & Pay
                                            </Button>
                                        </>
                                    )}

                                    {task.status === 'pending-quote' && isClient && (
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-40 italic py-3">
                                            Waiting for Professional Quote...
                                        </div>
                                    )}
                                    
                                    {task.status === 'quoted' && !isClient && (
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-40 italic py-3 text-right">
                                            Waiting for Client Approval...
                                        </div>
                                    )}

                                    {task.status === 'funded' && (
                                        <div className="flex items-center gap-2 bg-success/10 text-success px-6 py-3 rounded-full font-black uppercase tracking-widest text-[10px]">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Funded & Approved
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
