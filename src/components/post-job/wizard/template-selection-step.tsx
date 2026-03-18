
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
                        whileHover={{ y: -8 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <Card
                            className="p-8 cursor-pointer border-0 shadow-sm hover:shadow-xl transition-all h-full flex flex-col group bg-card relative overflow-hidden"
                            onClick={() => onSelect(template.id)}
                            data-testid={`${template.id}-template-card`}
                        >
                            <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-6 group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
                                <Sparkles className="h-7 w-7 text-primary" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3 tracking-tight group-hover:text-primary transition-colors">{template.name}</h3>
                            <p className="text-muted-foreground text-sm flex-grow leading-relaxed font-medium">
                                {template.description}
                            </p>
                            <div className="mt-8 flex items-center text-primary font-bold text-sm opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                                Use Template <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </Card>
                    </motion.div>
                ))}

                {/* Custom / Start from Scratch */}
                <motion.div
                    whileHover={{ y: -8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                    <Card
                        className="p-8 cursor-pointer border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-all h-full flex flex-col bg-muted/5 group shadow-sm hover:shadow-xl"
                        onClick={() => onSelect(null)}
                        data-testid="custom-template-card"
                    >
                        <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-6 group-hover:bg-primary/5 transition-colors">
                            <Plus className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3 tracking-tight group-hover:text-primary transition-colors">Custom Request</h3>
                        <p className="text-muted-foreground text-sm flex-grow leading-relaxed font-medium">
                            Start from scratch and answer all questions manually.
                        </p>
                        <div className="mt-8 flex items-center text-primary font-bold text-sm opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                            Create New <ArrowRight className="ml-2 h-4 w-4" />
                        </div>
                    </Card>
                </motion.div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-2xl border-info/20 bg-info/5 text-info animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-info/10 rounded-xl p-2.5">
                    <Sparkles className="h-5 w-5" />
                </div>
                <div>
                    <h4 className="font-bold text-sm">Pro Tip</h4>
                    <p className="text-info/80 text-xs mt-1 font-medium leading-relaxed">
                        Choosing a template will pre-fill several questions, saving you time. You can still customize everything!
                    </p>
                </div>
            </div>
        </div>
    );
}
