"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check, Briefcase, Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackFunnelEvent } from "@/lib/analytics";
import { useSignupContext, SignUpFormValues } from "./signup-context";

export function StepRole() {
  const { watch, setValue } = useFormContext<SignUpFormValues>();
  const { setCurrentStep } = useSignupContext();
  const tAuth = useTranslations('auth');
  const role = watch("role");

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4 mb-14">
        <h3 className="text-5xl sm:text-6xl font-black italic tracking-tighter uppercase leading-none">
          {tAuth('roleLabel') || "DECLARE IDENTITY"}
        </h3>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">
          {tAuth('roleDescription') || "Choose your primary projection protocol"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            id: 'Client',
            title: tAuth('roleclient'),
            desc: tAuth('clientDescription') || "I want to hire professionals for my projects.",
            icon: Search,
            color: 'from-blue-500/20 to-cyan-500/20'
          },
          {
            id: 'Professional',
            title: tAuth('roleProfessional'),
            desc: tAuth('professionalDescription') || "I am a professional looking for work.",
            icon: Briefcase,
            color: 'from-amber-500/20 to-orange-500/20'
          }
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setValue("role", item.id as "Client" | "Professional");
              setCurrentStep("contact");
              trackFunnelEvent('role_selected', { role: item.id });
            }}
            className={cn(
              "group relative p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border-none transition-all duration-700 text-left overflow-hidden hover:shadow-[0_40px_100px_rgba(0,0,0,0.2)] hover:-translate-y-2 ring-1 ring-white/5",
              role === item.id 
                ? "bg-surface-container-low/60 shadow-2xl ring-primary/20" 
                : "bg-surface-container-low/40 hover:bg-surface-container-low/60"
            )}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", item.color)} />
            
            <div className="relative z-10 flex flex-col h-full">
              <div className={cn(
                "w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-2xl",
                role === item.id ? "bg-primary text-white" : "bg-background/5 text-on-surface/40 group-hover:bg-primary/20 group-hover:text-primary"
              )}>
                <item.icon className="h-8 w-8" />
              </div>
              
              <h4 className="text-3xl font-black italic tracking-tighter uppercase mb-4">{item.title}</h4>
              <p className="text-sm font-medium opacity-60 leading-relaxed mb-6 italic tracking-tight">{item.desc}</p>
              
              <div className="mt-auto flex items-center text-[10px] font-black italic uppercase tracking-[0.4em] text-primary opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-[-20px] group-hover:translate-x-0">
                INITIATE PROTOCOL <ArrowRight className="ml-3 h-5 w-5" />
              </div>
            </div>

            {role === item.id && (
              <motion.div 
                layoutId="role-check"
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white"
              >
                <Check className="h-5 w-5" />
              </motion.div>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
