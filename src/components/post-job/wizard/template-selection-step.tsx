
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { JobTemplate } from "@/domains/ai/template.service";
import { Home, Store, Plus, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface TemplateSelectionStepProps {
    templates: JobTemplate[];
    onSelect: (templateId: string | null) => void;
}

export function TemplateSelectionStep({ templates, onSelect }: TemplateSelectionStepProps) {
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="grid gap-8 md:grid-cols-3">
                {/* Predefined Templates */}
                {templates.map((template) => (
                    <motion.div
                        key={template.id}
                        whileHover={{ y: -12 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <Card
                            className="p-10 cursor-pointer border-none shadow-[0_45px_120px_rgba(0,0,0,0.2)] hover:shadow-[0_60px_150px_rgba(var(--primary),0.2)] transition-all h-full flex flex-col group bg-card/40 backdrop-blur-3xl relative overflow-hidden rounded-[3.5rem] ring-1 ring-white/5 active:scale-[0.98]"
                            onClick={() => onSelect(template.id)}
                            data-testid={`${template.id}-template-card`}
                        >
                            <div className="h-20 w-20 rounded-[1.25rem] bg-primary/10 flex items-center justify-center mb-10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-500 shadow-inner ring-1 ring-primary/20">
                                <Sparkles className="h-10 w-10 text-primary transition-transform duration-500 group-hover:rotate-6" />
                            </div>
                            <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4 group-hover:text-primary transition-colors leading-none">{template.name}</h3>
                            <p className="text-muted-foreground text-xs leading-relaxed font-black uppercase tracking-widest opacity-60 italic flex-grow">
                                {template.description}
                            </p>
                            <div className="mt-8 pt-8 flex items-center text-primary font-black italic uppercase tracking-[0.4em] text-[10px] opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                                Operationalize <ArrowRight className="ml-3 h-4 w-4" />
                            </div>
                        </Card>
                    </motion.div>
                ))}

                {/* Custom / Start from Scratch */}
                <motion.div
                    whileHover={{ y: -12 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                    <Card
                        className="p-10 cursor-pointer border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-all h-full flex flex-col bg-muted/5 group shadow-sm hover:shadow-[0_30px_100px_rgba(0,0,0,0.1)] rounded-[3.5rem] active:scale-[0.98]"
                        onClick={() => onSelect(null)}
                        data-testid="custom-template-card"
                    >
                        <div className="h-20 w-20 rounded-[1.25rem] bg-muted/50 flex items-center justify-center mb-10 group-hover:bg-primary/10 transition-colors shadow-inner ring-1 ring-white/10">
                            <Plus className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-all duration-500 group-hover:rotate-90" />
                        </div>
                        <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4 group-hover:text-primary transition-colors leading-none">Custom Request</h3>
                        <p className="text-muted-foreground text-xs leading-relaxed font-black uppercase tracking-widest opacity-60 italic flex-grow">
                            Start from scratch and answer all questions manually.
                        </p>
                        <div className="mt-8 pt-8 flex items-center text-primary font-black italic uppercase tracking-[0.4em] text-[10px] opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                            Initiate Core <ArrowRight className="ml-3 h-4 w-4" />
                        </div>
                    </Card>
                </motion.div>
            </div>

            <div className="flex items-start gap-6 p-8 rounded-[2.5rem] border border-primary/20 bg-primary/5 text-primary animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-inner">
                <div className="bg-primary/10 rounded-[1rem] p-4 ring-1 ring-primary/20 shadow-inner">
                    <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h4 className="font-black italic uppercase tracking-[0.3em] text-[10px] mb-1">PRO-TIP // OPERATIONAL INTELLIGENCE</h4>
                    <p className="text-muted-foreground font-medium italic text-xs leading-relaxed max-w-2xl">
                        Choosing a template will pre-fill several questions, saving you time. You can still customize everything!
                    </p>
                </div>
            </div>
        </div>
    );
}
