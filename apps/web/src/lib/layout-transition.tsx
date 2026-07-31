"use client";

/**
 * FrozenRouter + LayoutTransition
 *
 * OPTIONAL: This pattern is unstable with Next.js App Router.
 * The primary page transition mechanism is template.tsx (T037).
 * This file is provided as a bonus for exit animations but should
 * NOT be relied upon for critical UX flows.
 *
 * Usage (if stable enough):
 *   import { LayoutTransition } from "@/lib/layout-transition";
 *   <LayoutTransition>{children}</LayoutTransition>
 */

import * as React from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// Frozen router context — freezes the router segment during exit animations
// so the old page content doesn't unmount before the exit animation completes.
const FrozenRouterContext = React.createContext<string | null>(null);

function FrozenRouter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [frozenPathname, setFrozenPathname] = React.useState(pathname);

  // Only update the frozen pathname when AnimatePresence has finished exiting
  React.useEffect(() => {
    setFrozenPathname(pathname);
  }, [pathname]);

  return (
    <FrozenRouterContext.Provider value={frozenPathname}>
      {children}
    </FrozenRouterContext.Provider>
  );
}

function LayoutTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  return (
    <FrozenRouter>
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, ...(shouldReduceMotion ? {} : { y: 20 }) }}
          animate={{ opacity: 1, ...(shouldReduceMotion ? {} : { y: 0 }) }}
          exit={{ opacity: 0, ...(shouldReduceMotion ? {} : { y: -20 }) }}
          transition={{
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
          }}
          className={className}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </FrozenRouter>
  );
}

FrozenRouter.displayName = "FrozenRouter";
LayoutTransition.displayName = "LayoutTransition";

export { FrozenRouter, LayoutTransition };
