"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
} as const;

export interface GradientProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  showLabel?: boolean;
  size?: keyof typeof sizeClasses;
}

const GradientProgressBar = React.forwardRef<
  HTMLDivElement,
  GradientProgressBarProps
>(({ value, showLabel = false, size = "md", className, ...props }, ref) => {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div ref={ref} className={cn("flex items-center gap-3", className)} {...props}>
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-border/50",
          sizeClasses[size],
        )}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full gradient-neon-primary motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-caption tabular-nums text-muted-foreground">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
});

GradientProgressBar.displayName = "GradientProgressBar";

export { GradientProgressBar };
