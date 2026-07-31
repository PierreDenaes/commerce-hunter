"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

function PageTransition({ children, className }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, ...(shouldReduceMotion ? {} : { y: 20 }) }}
      animate={{ opacity: 1, ...(shouldReduceMotion ? {} : { y: 0 }) }}
      transition={{
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

PageTransition.displayName = "PageTransition";

export { PageTransition };
