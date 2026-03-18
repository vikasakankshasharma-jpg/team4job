import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTranslations } from "next-intl";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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

export function Experience({ data, updateData }: ExperienceProps) {
    const t = useTranslations('onboarding.experience');
    const selectedCategory = data.category || "";

    const toggleSkill = (skill: string) => {
        const currentSkills = data.skills || [];
        const newSkills = currentSkills.includes(skill)
            ? currentSkills.filter((s: string) => s !== skill)
            : [...currentSkills, skill];
        updateData({ ...data, skills: newSkills });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <Label className="text-base font-semibold">{t('categoryLabel')}</Label>
                <RadioGroup
                    value={selectedCategory}
                    onValueChange={(val) => updateData({ ...data, category: val, skills: [] })}
                    className="grid grid-cols-2 gap-4"
                >
                    {CATEGORIES.map((cat) => (
                        <div key={cat.id}>
                            <RadioGroupItem
                                value={cat.id}
                                id={cat.id}
                                className="peer sr-only"
                            />
                            <Label
                                htmlFor={cat.id}
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                                <span className="mb-2 text-2xl">{cat.icon}</span>
                                <span className="text-center text-xs font-medium uppercase tracking-wider">
                                    {t(`categories.${cat.id}`)}
                                </span>
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>

            {selectedCategory && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">{t('skillsLabel')}</Label>
                        <Badge variant="secondary">{data.skills?.length || 0} {t('selected')}</Badge>
                    </div>
                    <ScrollArea className="h-48 rounded-md border p-4">
                        <div className="grid grid-cols-1 gap-4">
                            {SKILLS_BY_CATEGORY[selectedCategory].map((skill) => (
                                <div key={skill} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={skill}
                                        checked={(data.skills || []).includes(skill)}
                                        onCheckedChange={() => toggleSkill(skill)}
                                    />
                                    <Label
                                        htmlFor={skill}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {t(`skills.${skill}`)}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    );
}
