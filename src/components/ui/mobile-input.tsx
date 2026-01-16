import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import React from "react";

/**
 * Mobile-optimized Input with larger touch targets
 * Min height: 48px (12 tailwind units)
 * Font size: 16px (prevent zoom on iOS)
 */
export const MobileInput = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<typeof Input>>(
    ({ className, ...props }, ref) => {
        return (
            <Input
                ref={ref}
                className={cn(
                    "h-12 text-base", // 48px height, 16px font
                    className
                )}
                {...props}
            />
        );
    }
);
MobileInput.displayName = "MobileInput";

/**
 * Mobile-optimized Textarea with larger touch targets
 * Min height: 96px (24 tailwind units)
 * Font size: 16px (prevent zoom on iOS)
 */
export const MobileTextarea = React.forwardRef<HTMLTextAreaElement, React.ComponentPropsWithoutRef<typeof Textarea>>(
    ({ className, ...props }, ref) => {
        return (
            <Textarea
                ref={ref}
                className={cn(
                    "min-h-24 text-base", // 96px min height, 16px font
                    className
                )}
                {...props}
            />
        );
    }
);
MobileTextarea.displayName = "MobileTextarea";
