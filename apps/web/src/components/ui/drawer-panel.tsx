"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface DrawerPanelProps {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  width?: string;
  className?: string;
  children?: React.ReactNode;
}

function DrawerPanel({
  open,
  onClose,
  side = "right",
  width = "24rem",
  className,
  children,
}: DrawerPanelProps) {
  const shouldReduceMotion = useReducedMotion();

  const slideInitial = shouldReduceMotion
    ? {}
    : { x: side === "right" ? "100%" : "-100%" };

  const slideAnimate = shouldReduceMotion ? {} : { x: 0 };

  const slideExit = shouldReduceMotion
    ? {}
    : { x: side === "right" ? "100%" : "-100%" };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            className={cn(
              "fixed top-0 z-50 h-full glass-elevated overflow-y-auto",
              side === "left" ? "left-0" : "right-0",
              className,
            )}
            style={{ width }}
            initial={{ opacity: 0, ...slideInitial }}
            animate={{ opacity: 1, ...slideAnimate }}
            exit={{ opacity: 0, ...slideExit }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

DrawerPanel.displayName = "DrawerPanel";

export { DrawerPanel };
