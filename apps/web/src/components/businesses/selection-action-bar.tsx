"use client";

import { ListPlus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { GradientButton } from "@/components/ui/gradient-button";

interface SelectionActionBarProps {
  count: number;
  onAddToList: () => void;
  onClear: () => void;
}

export function SelectionActionBar({
  count,
  onAddToList,
  onClear,
}: SelectionActionBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 glass-elevated rounded-xl px-4 py-3 flex items-center gap-4 shadow-lg"
        >
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {count} entreprise{count > 1 ? "s" : ""} sélectionnée{count > 1 ? "s" : ""}
          </span>

          <GradientButton
            variant="accent"
            size="sm"
            onClick={onAddToList}
          >
            <ListPlus className="size-4" />
            Ajouter à une liste
          </GradientButton>

          <button
            onClick={onClear}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Tout désélectionner"
          >
            <X className="size-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
