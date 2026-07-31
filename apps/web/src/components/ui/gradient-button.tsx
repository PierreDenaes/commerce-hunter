"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const gradientClasses = {
  primary: "gradient-neon-primary",
  accent: "gradient-neon-accent",
  full: "gradient-neon-full",
} as const;

const sizeClasses = {
  sm: "h-8 px-3 text-sm rounded-md",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-12 px-6 text-lg rounded-lg",
} as const;

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof gradientClasses;
  size?: keyof typeof sizeClasses;
  loading?: boolean;
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold text-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "transition-all duration-200",
          sizeClasses[size],
          isDisabled
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : [
                gradientClasses[variant],
                "motion-safe:hover:scale-[1.02] hover:brightness-[1.1]",
                "motion-safe:active:scale-[0.98]",
              ],
          className,
        )}
        {...props}
      >
        {loading ? (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          children
        )}
      </button>
    );
  },
);

GradientButton.displayName = "GradientButton";

export { GradientButton };
