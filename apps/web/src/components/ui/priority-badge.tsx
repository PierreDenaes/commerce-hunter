"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const priorityStyles = {
  HIGH: "bg-success/15 text-success",
  MEDIUM: "bg-warning/15 text-warning",
  LOW: "bg-destructive/15 text-destructive",
} as const;

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
} as const;

export type Priority = keyof typeof priorityStyles;

export interface PriorityBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  priority: Priority;
  size?: keyof typeof sizeStyles;
}

const PriorityBadge = React.forwardRef<HTMLSpanElement, PriorityBadgeProps>(
  ({ priority, size = "md", className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full font-medium",
          priorityStyles[priority],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {priority}
      </span>
    );
  },
);

PriorityBadge.displayName = "PriorityBadge";

export { PriorityBadge };
