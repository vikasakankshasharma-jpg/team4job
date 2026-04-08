"use client";

import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { User, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { AddressForm } from "@/components/ui/address-form";
import Link from "next/link";
import { useSignupContext, SignUpFormValues } from "./signup-context";

export function StepDetails({ isMapLoaded }: { isMapLoaded: boolean }) {
  const { control, watch, formState: { errors } } = useFormContext<SignUpFormValues>();
  const { setCurrentStep, isLoading } = useSignupContext();
  const tAuth = useTranslations('auth');
  const role = watch("role");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4 mb-14">
        <h3 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase leading-none">
          {tAuth('details') || "TERMINAL CONFIG"}
        </h3>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">
          {tAuth('detailsDesc') || "Initialize your operational parameters for network entry"}
        </p>
      </div>

      <div className="space-y-6">
        <div className="p-10 rounded-[3rem] border-none bg-surface-container-low/40 ring-1 ring-white/5 space-y-8 shadow-[0_40px_100px_rgba(0,0,0,0.1)] backdrop-blur-3xl">
          <h4 className="text-[10px] font-black italic uppercase tracking-[0.4em] text-primary flex items-center gap-3 mb-4">
            <User className="h-4 w-4" /> CREDENTIAL OVERRIDE
          </h4>
          
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormLabel className="text-[10px] font-black italic uppercase tracking-[0.5em] text-on-surface/40 ml-4">Legal Declaration (Full Name)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="John Doe" 
                    {...field} 
                    className="h-20 rounded-[1.5rem] bg-surface-container-low/40 border-none ring-1 ring-white/5 focus:ring-primary/20 focus:bg-surface-container-low transition-all px-8 font-black text-lg italic tracking-tighter" 
                    autoComplete="name" 
                  />
                </FormControl>
                <FormMessage className="ml-4 font-black italic uppercase text-[10px] tracking-widest" />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-[10px] font-black italic uppercase tracking-[0.5em] text-on-surface/40 ml-4">Verified Channel (Email)</FormLabel>
                  <FormControl>
                    <Input {...field} disabled className="h-16 bg-white/5 border-none rounded-[1.25rem] px-8 font-black italic opacity-40 text-sm tracking-tighter ring-1 ring-white/5" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="mobile"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-[10px] font-black italic uppercase tracking-[0.5em] text-on-surface/40 ml-4">Verified Signal (Mobile)</FormLabel>
                  <FormControl>
                    <Input {...field} disabled className="h-16 bg-white/5 border-none rounded-[1.25rem] px-8 font-black italic opacity-40 text-sm tracking-tighter ring-1 ring-white/5" />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-[10px] font-black italic uppercase tracking-[0.5em] text-on-surface/40 ml-4">{tAuth('password') || "SET ENCRYPTION"}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        {...field}
                        className="h-16 rounded-[1.25rem] bg-surface-container-low/40 border-none ring-1 ring-white/5 focus:ring-primary/20 focus:bg-surface-container-low transition-all px-8 pr-16 font-black text-sm italic tracking-[0.2em]"
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage className="ml-4 font-black italic uppercase text-[10px] tracking-widest" />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-[10px] font-black italic uppercase tracking-[0.5em] text-on-surface/40 ml-4">{tAuth('confirmPassword') || "VERIFY ENCRYPTION"}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        {...field}
                        className="h-16 rounded-[1.25rem] bg-surface-container-low/40 border-none ring-1 ring-white/5 focus:ring-primary/20 focus:bg-surface-container-low transition-all px-8 pr-16 font-black text-sm italic tracking-[0.2em]"
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage className="ml-4 font-black italic uppercase text-[10px] tracking-widest" />
                </FormItem>
              )}
            />
          </div>
        </div>

        <AddressForm 
            isMapLoaded={isMapLoaded}
            pincodeName="address.cityPincode"
            houseName="address.house"
            streetName="address.street"
            landmarkName="address.landmark"
            fullAddressName="address.fullAddress"
        />

        <FormField
            control={control}
            name="fax"
            render={({ field }) => (
                <FormItem className="hidden">
                    <FormLabel>Fax</FormLabel>
                    <FormControl><Input {...field} tabIndex={-1} autoComplete="off" /></FormControl>
                </FormItem>
            )}
        />

        <FormField
          control={control}
          name="termsAccepted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-6 space-y-0 rounded-[2.5rem] border-none p-10 bg-surface-container-low/40 ring-1 ring-white/5 shadow-2xl backdrop-blur-3xl">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-1 flex-shrink-0 w-8 h-8 rounded-xl border-none ring-1 ring-white/10 bg-white/5 data-[state=checked]:bg-primary data-[state=checked]:text-black transition-all"
                />
              </FormControl>
              <div className="space-y-3 leading-none">
                <FormLabel className="text-sm font-black italic tracking-tight cursor-pointer uppercase">
                  {tAuth('agreeTo') || "I acknowledge the project protocols"}{" "}
                  <Link href="/terms" className="text-primary hover:underline hover:tracking-wide transition-all" target="_blank">
                    {tAuth('terms')}
                  </Link>
                  {" "}{tAuth('and')}{" "}
                  <Link href="/privacy" className="text-primary hover:underline hover:tracking-wide transition-all" target="_blank">
                    {tAuth('privacy')}
                  </Link>
                </FormLabel>
                <FormDescription className="text-[10px] font-medium uppercase tracking-[0.2em] opacity-40 leading-relaxed max-w-sm italic">
                  {tAuth('agreeToDesc') || "Authorization acknowledges complete alignment with network rules and privacy mandates."}
                </FormDescription>
                <FormMessage className="font-black italic uppercase text-[10px] tracking-widest" />
              </div>
            </FormItem>
          )}
        />
      </div>

      <div className="pt-12 flex gap-6">
        <Button variant="outline" type="button" onClick={() => setCurrentStep(role === 'Professional' ? 'skills' : 'photo')} className="h-16 flex-1 rounded-[1.5rem] border-white/10 font-black text-[10px] uppercase tracking-[0.3em] italic hover:bg-white/5 transition-colors">
          {tAuth('back')}
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="h-16 flex-[2] rounded-[1.5rem] bg-primary text-black font-black text-[10px] uppercase tracking-[0.4em] italic shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-3 h-6 w-6 animate-spin" />
              {tAuth('creatingAccount') || "SYNCHRONIZING..."}
            </>
          ) : (
            tAuth('submit') || "INITIALIZE TERMINAL"
          )}
        </Button>
      </div>
    </motion.div>
  );
}
