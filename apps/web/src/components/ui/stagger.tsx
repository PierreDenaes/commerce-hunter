"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface StaggerContainerProps {
  delay?: number;
  staggerDelay?: number;
  className?: string;
  children?: React.ReactNode;
}

const containerVariants = {
  hidden: {},
  visible: (custom: { delay: number; staggerDelay: number }) => ({
    transition: {
      delayChildren: custom.delay,
      staggerChildren: custom.staggerDelay,
    },
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

function StaggerContainer({
  delay = 0,
  staggerDelay = 0.08,
  className,
  children,
}: StaggerContainerProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={{ delay, staggerDelay }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

StaggerContainer.displayName = "StaggerContainer";

export interface StaggerItemProps {
  className?: string;
  children?: React.ReactNode;
}

function StaggerItem({ className, children }: StaggerItemProps) {
  return (
    <motion.div variants={itemVariants} className={cn(className)}>
      {children}
    </motion.div>
  );
}

StaggerItem.displayName = "StaggerItem";

export { StaggerContainer, StaggerItem };
