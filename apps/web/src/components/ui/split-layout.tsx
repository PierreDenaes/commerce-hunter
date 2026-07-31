import * as React from "react";
import { cn } from "@/lib/utils";

const ratioClasses = {
  equal: "lg:grid-cols-2",
  "left-heavy": "lg:grid-cols-[7fr_5fr]",
  "right-heavy": "lg:grid-cols-[5fr_7fr]",
} as const;

export interface SplitLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  left: React.ReactNode;
  right: React.ReactNode;
  ratio?: keyof typeof ratioClasses;
}

function SplitLayout({
  left,
  right,
  ratio = "equal",
  className,
  ...props
}: SplitLayoutProps) {
  return (
    <div
      className={cn("grid grid-cols-1 gap-8", ratioClasses[ratio], className)}
      {...props}
    >
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

SplitLayout.displayName = "SplitLayout";

export { SplitLayout };
