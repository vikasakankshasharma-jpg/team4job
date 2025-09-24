
"use client";

import React from 'react';
import { cn } from "@/lib/utils"

interface AnimatedAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  svg: string | undefined;
}

export function AnimatedAvatar({ svg, className, ...props }: AnimatedAvatarProps) {
  if (!svg) {
    return null;
  }

  const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;

  return (
    <div
      className={cn("aspect-square h-full w-full", className)}
      style={{ backgroundImage: `url(${dataUrl})`, backgroundSize: 'cover' }}
      {...props}
    />
  );
}
