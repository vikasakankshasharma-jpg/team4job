
"use client";

import { Card } from "@/components/ui/card";
import { ShieldCheck, Globe, Zap, ArrowRight, Droplets, Hammer } from "lucide-react";
import { motion } from "framer-motion";

export interface Category {
    id: string;
    icon: string;
    description: string;
}

interface CategorySelectionStepProps {
    categories: Category[];
    onSelect: (categoryId: string) => void;
}

const IconMap: Record<string, any> = {
    ShieldCheck,
    Globe,
    Zap,
    Droplets,
    Hammer
};

export function CategorySelectionStep({ categories, onSelect }: CategorySelectionStepProps) {
    return (
        <div className="space-y-8 max-w-4xl mx-auto p-4">
            <div className="text-center space-y-4 mb-20">
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">Mission Orientation</h2>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em] opacity-50 italic">
                    Establish your operational sector to begin the intelligence-guided job creation.
                </p>
            </div>

            <div className="grid gap-10 md:grid-cols-3">
                {categories.map((category) => {
                    const Icon = IconMap[category.icon] || Globe;
                    return (
                        <motion.div
                            key={category.id}
                            whileHover={{ y: -12 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <Card
                                className="p-6 sm:p-10 cursor-pointer border-none shadow-[0_45px_120px_rgba(0,0,0,0.2)] hover:shadow-[0_60px_150px_rgba(var(--primary),0.2)] transition-all h-full flex flex-col group relative overflow-hidden bg-card/40 backdrop-blur-3xl z-10 active:scale-[0.98] rounded-[2rem] sm:rounded-[3.5rem] ring-1 ring-white/5"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onSelect(category.id);
                                }}
                                data-testid={`${category.id}-category-card`}
                            >
                                <div className="absolute top-0 right-0 p-10 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                    <ArrowRight className="h-8 w-8 text-primary shadow-[0_0_20px_rgba(var(--primary),0.5)]" />
                                </div>
                                
                                <div className="h-24 w-24 rounded-[1.75rem] bg-primary/10 flex items-center justify-center mb-10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-500 shadow-inner ring-1 ring-primary/20">
                                    <Icon className="h-10 w-10 text-primary transition-transform duration-500 group-hover:rotate-6" />
                                </div>
                                
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4 group-hover:text-primary transition-colors leading-none">
                                    {category.id}
                                </h3>
                                <p className="text-muted-foreground text-xs leading-relaxed font-black uppercase tracking-widest opacity-60 italic mb-8">
                                    {category.description}
                                </p>
                                
                                <div className="mt-auto pt-8 flex items-center text-primary font-black italic uppercase tracking-[0.4em] text-[10px] opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                                    Operationalize <ArrowRight className="ml-3 h-4 w-4" />
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
            
            <p className="text-center text-muted-foreground text-sm mt-12 italic">
                Don&apos;t see your category? Choose the closest one and describe it later.
            </p>
        </div>
    );
}
