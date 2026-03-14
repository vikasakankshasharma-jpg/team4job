
"use client";

import { Card } from "@/components/ui/card";
import { ShieldCheck, Globe, Zap, ArrowRight } from "lucide-react";
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
    Zap
};

export function CategorySelectionStep({ categories, onSelect }: CategorySelectionStepProps) {
    return (
        <div className="space-y-8 max-w-4xl mx-auto p-4">
            <div className="text-center space-y-2 mb-8">
                <h2 className="text-3xl font-bold tracking-tight">What do you need help with?</h2>
                <p className="text-muted-foreground text-lg">
                    Select a category to get started with our smart job assistant.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {categories.map((category) => {
                    const Icon = IconMap[category.icon] || Globe;
                    return (
                        <motion.div
                            key={category.id}
                            whileHover={{ y: -5, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Card
                                className="p-6 cursor-pointer border-2 hover:border-primary/50 transition-all h-full flex flex-col group relative overflow-hidden bg-card"
                                onClick={() => onSelect(category.id)}
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight className="h-5 w-5 text-primary" />
                                </div>
                                
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                                    <Icon className="h-8 w-8 text-primary" />
                                </div>
                                
                                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                                    {category.id}
                                </h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    {category.description}
                                </p>
                                
                                <div className="mt-auto pt-6 flex items-center text-primary font-semibold text-sm opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                    Get Started
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
            
            <p className="text-center text-muted-foreground text-sm mt-12 italic">
                Don't see your category? Choose the closest one and describe it later.
            </p>
        </div>
    );
}
