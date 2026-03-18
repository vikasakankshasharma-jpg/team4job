
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

            <div className="grid gap-8 md:grid-cols-3">
                {categories.map((category) => {
                    const Icon = IconMap[category.icon] || Globe;
                    return (
                        <motion.div
                            key={category.id}
                            whileHover={{ y: -8 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <Card
                                className="p-8 cursor-pointer border-0 shadow-sm hover:shadow-xl transition-all h-full flex flex-col group relative overflow-hidden bg-card"
                                onClick={() => onSelect(category.id)}
                                data-testid={`${category.id}-category-card`}
                            >
                                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight className="h-6 w-6 text-primary" />
                                </div>
                                
                                <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-8 group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
                                    <Icon className="h-8 w-8 text-primary" />
                                </div>
                                
                                <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors tracking-tight">
                                    {category.id}
                                </h3>
                                <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                                    {category.description}
                                </p>
                                
                                <div className="mt-8 flex items-center text-primary font-bold text-sm opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
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
