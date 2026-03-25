"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { allSkills } from "@/lib/data";

interface SkillsSelectorProps {
  selectedSkills: string[];
  onChange: (skills: string[]) => void;
  className?: string;
}

export function SkillsSelector({ 
  selectedSkills = [], 
  onChange, 
  className 
}: SkillsSelectorProps) {
  const tSkills = useTranslations('skills');

  const toggleSkill = (skill: string) => {
    const next = selectedSkills.includes(skill)
      ? selectedSkills.filter((s) => s !== skill)
      : [...selectedSkills, skill];
    onChange(next);
  };

  return (
    <div className={cn("flex flex-wrap gap-2 justify-center p-4 rounded-[2rem] border-2 border-border/50 bg-muted/10 custom-scrollbar", className)}>
      {allSkills.map((skill) => {
        const isSelected = selectedSkills.includes(skill);
        return (
          <button
            key={skill}
            type="button"
            onClick={() => toggleSkill(skill)}
            className={cn(
              "px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border-2",
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
  );
}
