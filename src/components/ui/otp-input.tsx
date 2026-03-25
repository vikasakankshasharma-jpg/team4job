"use client";

import React, { useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: boolean;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  error = false,
}: OtpInputProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Fill refs array if needed
    if (inputRefs.current.length !== length) {
      inputRefs.current = Array(length).fill(null);
    }
  }, [length]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const char = e.target.value.slice(-1); // Take last char only
    
    if (!/^\d?$/.test(char)) return; // Only allow digits

    const newValue = value.split("");
    newValue[index] = char;
    const finalValue = newValue.join("").slice(0, length);
    onChange(finalValue);

    // Auto focus next
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      // Focus previous on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, length);
    if (!/^\d+$/.test(pastedData)) return;

    onChange(pastedData);
    // Focus the next empty input or the last input
    const nextIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex justify-between gap-2 sm:gap-4 w-full max-w-sm mx-auto">
      {Array.from({ length }).map((_, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={{
            scale: focusedIndex === i ? 1.05 : 1,
            y: focusedIndex === i ? -2 : 0,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative flex-1 aspect-square max-w-[56px]"
        >
          <Input
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={value[i] || ""}
            disabled={disabled}
            onFocus={() => setFocusedIndex(i)}
            onBlur={() => setFocusedIndex(null)}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            className={cn(
              "h-full w-full text-center text-2xl font-bold bg-background/50 backdrop-blur-md border-2 rounded-2xl transition-all p-0",
              focusedIndex === i ? "border-primary ring-4 ring-primary/10" : "border-muted-foreground/20",
              error ? "border-destructive/50 bg-destructive/5" : "",
              value[i] ? "border-primary/50 bg-primary/5" : ""
            )}
            autoComplete="one-time-code"
          />
          <AnimatePresence>
            {value[i] && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary"
              />
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}
