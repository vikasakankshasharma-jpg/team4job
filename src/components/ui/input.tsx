import * as React from "react"

import { cn } from "@/lib/utils"

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-[1.25rem] border-2 border-input/50 bg-background/50 backdrop-blur-3xl px-6 py-3 text-sm italic font-medium ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-black placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-inner",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"
