"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { allSkills } from "@/lib/data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface JobFiltersProps {
    budget: number[];
    setBudget: (value: number[]) => void;
    selectedSkills: string[];
    onSkillChange: (skill: string) => void;
    onClearFilters: () => void;
    activeFiltersCount: number;
}

export function JobFilters({
    budget,
    setBudget,
    selectedSkills,
    onSkillChange,
    onClearFilters,
    activeFiltersCount,
}: JobFiltersProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Budget Range</h3>
                    {activeFiltersCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearFilters}
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                        >
                            Clear All
                        </Button>
                    )}
                </div>
                <div className="space-y-2">
                    <Slider
                        min={0}
                        max={150000}
                        step={1000}
                        value={budget}
                        onValueChange={setBudget}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground font-mono">
                        <span>₹{budget[0].toLocaleString()}</span>
                        <span>₹{budget[1].toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <Separator />

            <div className="space-y-4">
                <h3 className="font-semibold text-sm">Skills</h3>
                <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                        {allSkills.map((skill) => (
                            <div key={skill} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`filter-skill-${skill}`}
                                    checked={selectedSkills.includes(skill)}
                                    onCheckedChange={() => onSkillChange(skill)}
                                    className="h-4 w-4"
                                />
                                <Label
                                    htmlFor={`filter-skill-${skill}`}
                                    className="text-sm font-normal cursor-pointer flex-1 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {skill}
                                </Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
