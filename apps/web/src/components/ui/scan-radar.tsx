"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { GradientProgressBar } from "./gradient-progress-bar";

export interface ScanRadarProps extends React.HTMLAttributes<HTMLDivElement> {
  active: boolean;
  progress?: number;
  size?: number;
}

const ScanRadar = React.forwardRef<HTMLDivElement, ScanRadarProps>(
  ({ active, progress = 0, size = 120, className, ...props }, ref) => {
    const prefersReducedMotion = useReducedMotion();
    const center = size / 2;
    const rings = [0.3, 0.55, 0.8, 1.0];

    return (
      <div
        ref={ref}
        className={cn("inline-flex flex-col items-center gap-3", className)}
        {...props}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id="radar-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--accent)" />
            </linearGradient>
          </defs>

          {rings.map((scale, i) => {
            const r = (center - 4) * scale;
            return (
              <motion.circle
                key={i}
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke="url(#radar-stroke)"
                strokeWidth={1.5}
                initial={{ opacity: 0.15 }}
                animate={
                  active && !prefersReducedMotion
                    ? {
                        opacity: [0.15, 0.6, 0.15],
                        scale: [1, 1.05, 1],
                      }
                    : { opacity: active ? 0.4 : 0.15 }
                }
                transition={
                  active && !prefersReducedMotion
                    ? {
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.25,
                        ease: "easeInOut",
                      }
                    : { duration: 0.3 }
                }
                style={{ transformOrigin: `${center}px ${center}px` }}
              />
            );
          })}

          {/* Center dot */}
          <circle
            cx={center}
            cy={center}
            r={4}
            fill={active ? "var(--accent)" : "var(--border)"}
          />
        </svg>

        {active && (
          <GradientProgressBar value={progress} showLabel size="sm" className="w-full" />
        )}
      </div>
    );
  },
);

ScanRadar.displayName = "ScanRadar";

export { ScanRadar };
