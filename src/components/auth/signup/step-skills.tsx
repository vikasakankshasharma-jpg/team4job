"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Briefcase, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import { SkillsSelector } from "@/components/ui/skills-selector";
import { useSignupContext, SignUpFormValues } from "./signup-context";

export function StepSkills() {
  const { control, watch } = useFormContext<SignUpFormValues>();
  const { setCurrentStep } = useSignupContext();
  const tAuth = useTranslations('auth');

  const selectedSkills = watch('skills') || [];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-4 mb-14">
        <h3 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase leading-none">
          {tAuth('stepSkills') || "EXPERTISE INDEX"}
        </h3>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">
          {tAuth('skillsDesc') || "Declare your operational specializations for discovery"}
        </p>
      </div>

      <div className="p-1">
        <FormField
          control={control}
          name="skills"
          render={({ field }) => (
            <FormItem className="space-y-4">
              <SkillsSelector 
                selectedSkills={field.value || []} 
                onChange={field.onChange} 
                className="max-h-[400px] overflow-y-auto"
              />
              <div className="text-center">
                <p className="text-xs text-muted-foreground font-medium">
                  Selected: <span className="text-primary font-bold">{(field.value || []).length}</span> skills
                </p>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="pt-12 flex gap-6">
        <Button variant="outline" onClick={() => setCurrentStep('photo')} className="h-16 flex-1 rounded-[1.5rem] border-white/10 font-black text-[10px] uppercase tracking-[0.3em] italic hover:bg-white/5 transition-colors">
          {tAuth('back')}
        </Button>
        <Button 
          onClick={() => setCurrentStep('details')} 
          disabled={selectedSkills.length === 0}
          className="h-16 flex-[2] rounded-[1.5rem] bg-primary text-black font-black text-[10px] uppercase tracking-[0.4em] italic shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          {tAuth('next') || "CONFIRM SKILLS"}
          <ArrowRight className="ml-3 h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  );
}
