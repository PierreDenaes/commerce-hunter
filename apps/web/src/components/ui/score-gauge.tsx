"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "./animated-counter";

export interface ScoreGaugeProps extends React.HTMLAttributes<HTMLDivElement> {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showScore?: boolean;
}

const ScoreGauge = React.forwardRef<HTMLDivElement, ScoreGaugeProps>(
  (
    {
      score,
      size = 200,
      strokeWidth = 16,
      label,
      showScore = true,
      className,
      ...props
    },
    ref,
  ) => {
    const gradientId = React.useId();
    const clamped = Math.min(Math.max(score, 0), 100);
    const prefersReducedMotion = useReducedMotion();

    const radius = (size - strokeWidth) / 2;
    const circumference = (270 / 360) * 2 * Math.PI * radius;
    const offset = circumference - (clamped / 100) * circumference;
    const center = size / 2;

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center",
          className,
        )}
        style={{ width: size, height: size }}
        {...props}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient
              id={gradientId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="50%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--success)" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${2 * Math.PI * radius - circumference}`}
            strokeLinecap="round"
            transform={`rotate(135 ${center} ${center})`}
          />

          {/* Animated score arc */}
          {clamped > 0 && (
            <motion.circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${2 * Math.PI * radius - circumference}`}
              strokeLinecap="round"
              transform={`rotate(135 ${center} ${center})`}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 1.5, ease: "easeOut" }
              }
            />
          )}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showScore && (
            <AnimatedCounter
              value={clamped}
              duration={prefersReducedMotion ? 0 : 1500}
              className="text-3xl font-bold text-foreground"
            />
          )}
          {label && (
            <span className="text-caption text-muted-foreground mt-1">
              {label}
            </span>
          )}
        </div>
      </div>
    );
  },
);

ScoreGauge.displayName = "ScoreGauge";

export { ScoreGauge };
