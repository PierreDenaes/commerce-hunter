"use client";

import * as React from "react";
import {
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

export interface AnimatedCounterProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

const AnimatedCounter = React.forwardRef<HTMLSpanElement, AnimatedCounterProps>(
  (
    {
      value,
      duration = 1500,
      decimals = 0,
      prefix = "",
      suffix = "",
      className,
      ...props
    },
    ref,
  ) => {
    const motionValue = useMotionValue(0);
    const display = useTransform(motionValue, (v) => {
      return `${prefix}${v.toFixed(decimals)}${suffix}`;
    });

    const [displayText, setDisplayText] = React.useState(
      `${prefix}${(0).toFixed(decimals)}${suffix}`,
    );
    const prefersReducedMotion = useReducedMotion();

    React.useEffect(() => {
      if (prefersReducedMotion) {
        setDisplayText(`${prefix}${value.toFixed(decimals)}${suffix}`);
        return;
      }

      const unsubscribe = display.on("change", (v) => setDisplayText(v));
      const controls = animate(motionValue, value, {
        duration: duration / 1000,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      });

      return () => {
        unsubscribe();
        controls.stop();
      };
    }, [
      value,
      duration,
      decimals,
      prefix,
      suffix,
      prefersReducedMotion,
      motionValue,
      display,
    ]);

    return (
      <span ref={ref} className={cn("tabular-nums", className)} {...props}>
        {displayText}
      </span>
    );
  },
);

AnimatedCounter.displayName = "AnimatedCounter";

export { AnimatedCounter };
