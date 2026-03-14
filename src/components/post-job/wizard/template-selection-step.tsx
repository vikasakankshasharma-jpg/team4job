
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
            <div className="grid gap-6 md:grid-cols-3">
                {/* Predefined Templates */}
                {templates.map((template) => (
                    <motion.div
                        key={template.id}
                        whileHover={{ y: -5 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Card
                            className="p-6 cursor-pointer border-2 hover:border-primary/50 transition-all h-full flex flex-col group"
                            onClick={() => onSelect(template.id)}
                        >
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                <Sparkles className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{template.name}</h3>
                            <p className="text-muted-foreground text-sm flex-grow">
                                {template.description}
                            </p>
                            <div className="mt-6 flex items-center text-primary font-medium text-sm">
                                Start with this <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </Card>
                    </motion.div>
                ))}

                {/* Custom / Start from Scratch */}
                <motion.div
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.2 }}
                >
                    <Card
                        className="p-6 cursor-pointer border-2 border-dashed hover:border-primary/50 transition-all h-full flex flex-col bg-muted/30"
                        onClick={() => onSelect(null)}
                    >
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
                            <Plus className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Custom Request</h3>
                        <p className="text-muted-foreground text-sm flex-grow">
                            Start from scratch and answer all questions manually.
                        </p>
                        <div className="mt-6 flex items-center text-muted-foreground font-medium text-sm">
                            New Draft <ArrowRight className="ml-2 h-4 w-4" />
                        </div>
                    </Card>
                </motion.div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-4">
                <div className="bg-blue-500 rounded-full p-1 mt-0.5">
                    <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">Pro Tip</h4>
                    <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                        Choosing a template will pre-fill several questions, saving you time. You can still customize everything!
                    </p>
                </div>
            </div>
        </div>
    );
}
