"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const variantClasses = {
  default: "glass",
  elevated: "glass-elevated",
  subtle: "glass-subtle",
} as const;

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantClasses;
  hoverable?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ variant = "default", hoverable = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl p-6",
          variantClasses[variant],
          hoverable && "glass-glow-hover",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

GlassCard.displayName = "GlassCard";

export { GlassCard };
