import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTranslations } from "next-intl";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface ExperienceProps {
    data: any;
    updateData: (data: any) => void;
}

const CATEGORIES = [
    { id: "security", icon: "🛡️" },
    { id: "it_networking", icon: "🌐" },
    { id: "electrical", icon: "⚡" },
    { id: "plumbing", icon: "🚰" },
    { id: "construction", icon: "🏗️" },
    { id: "multimedia", icon: "🎬" }
];

const SKILLS_BY_CATEGORY: Record<string, string[]> = {
    security: ["cctv", "alarm", "access_control", "fire_security", "biometrics"],
    it_networking: ["home_network", "server_setup", "wifi_optimize", "it_support"],
    electrical: ["wiring", "panel_repair", "lighting", "earthing"],
    plumbing: ["pipeline", "sanitary", "leakage", "water_heater"],
    construction: ["carpentry", "painting", "masonry", "tiling"],
    multimedia: ["home_theater", "smart_display", "audio_video"]
};

import { SkillsSelector } from "@/components/ui/skills-selector";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function Experience({ data, updateData }: ExperienceProps) {
    const t = useTranslations('onboarding.experience');
    const tSkills = useTranslations('skills');
    const selectedCategory = data.category || "";

    const filteredSkills = selectedCategory ? SKILLS_BY_CATEGORY[selectedCategory] : [];

    return (
        <div className="space-y-10">
            <div className="space-y-6">
                <Label className="text-xl font-extrabold tracking-tight">{t('categoryLabel')}</Label>
                <RadioGroup
                    value={selectedCategory}
                    onValueChange={(val) => updateData({ ...data, category: val, skills: [] })}
                    className="grid grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        return (
                            <div key={cat.id} className="relative group">
                                <RadioGroupItem
                                    value={cat.id}
                                    id={cat.id}
                                    className="peer sr-only"
                                />
                                <Label
                                    htmlFor={cat.id}
                                    className={cn(
                                        "flex flex-col items-center justify-center rounded-[2.5rem] border-2 p-8 transition-all duration-700 cursor-pointer text-center h-full min-h-[160px] ring-1 ring-white/5",
                                        isSelected 
                                            ? "border-primary bg-primary/10 shadow-[0_30px_70px_rgba(var(--primary),0.2)] ring-4 ring-primary/5" 
                                            : "border-border/50 bg-card/60 backdrop-blur-3xl hover:border-primary/40 hover:bg-background/80"
                                    )}
                                >
                                    <span className={cn(
                                        "mb-4 text-4xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                                        isSelected ? "filter-none" : "grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100"
                                    )}>
                                        {cat.icon}
                                    </span>
                                    <span className={cn(
                                        "text-xs font-bold uppercase tracking-widest transition-colors",
                                        isSelected ? "text-primary" : "text-muted-foreground"
                                    )}>
                                        {t(`categories.${cat.id}`)}
                                    </span>
                                    {isSelected && (
                                        <motion.div 
                                            layoutId="cat-active"
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white"
                                        >
                                            <Check className="h-4 w-4" />
                                        </motion.div>
                                    )}
                                </Label>
                            </div>
                        );
                    })}
                </RadioGroup>
            </div>

            <AnimatePresence mode="wait">
                {selectedCategory && (
                    <motion.div 
                        key={selectedCategory}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6 pt-6 border-t border-border/50"
                    >
                        <div className="flex items-center justify-between">
                            <Label className="text-xl font-extrabold tracking-tight">{t('skillsLabel')}</Label>
                            <Badge variant="secondary" className="px-4 py-1.5 rounded-full bg-primary/10 text-primary border-primary/20 font-bold">
                                {data.skills?.length || 0} {t('selected')}
                            </Badge>
                        </div>
                        
                        <div className="p-1">
                            <div className="flex flex-wrap gap-4 justify-center p-12 rounded-[3.5rem] border-2 border-border/50 bg-background/40 backdrop-blur-3xl min-h-[220px] ring-1 ring-white/5 shadow-inner">
                                {filteredSkills.map((skill) => {
                                    const isSelected = (data.skills || []).includes(skill);
                                    return (
                                        <button
                                            key={skill}
                                            type="button"
                                            onClick={() => {
                                                const current = data.skills || [];
                                                const next = current.includes(skill)
                                                    ? current.filter((s: string) => s !== skill)
                                                    : [...current, skill];
                                                updateData({ ...data, skills: next });
                                            }}
                                            className={cn(
                                                "px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 border-2",
                                                isSelected 
                                                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105" 
                                                    : "bg-background border-border hover:border-primary/40 text-muted-foreground hover:text-primary"
                                            )}
                                        >
                                            {tSkills(skill)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
