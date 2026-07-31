"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const shimmerClass =
  "animate-shimmer bg-[length:400%_100%] bg-gradient-to-r from-muted via-border to-muted motion-reduce:animate-none motion-reduce:bg-muted";

export interface SkeletonLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "card" | "table-row" | "chart" | "gauge";
  lines?: number;
}

const SkeletonLoader = React.forwardRef<HTMLDivElement, SkeletonLoaderProps>(
  ({ variant = "text", lines = 3, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-3", className)} role="status" aria-label="Chargement" {...props}>
        {variant === "text" && <TextSkeleton lines={lines} />}
        {variant === "card" && <CardSkeleton />}
        {variant === "table-row" && <TableRowSkeleton />}
        {variant === "chart" && <ChartSkeleton />}
        {variant === "gauge" && <GaugeSkeleton />}
        <span className="sr-only">Loading...</span>
      </div>
    );
  },
);

SkeletonLoader.displayName = "SkeletonLoader";

function TextSkeleton({ lines }: { lines: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn("h-4 rounded-md", shimmerClass, i === lines - 1 && "w-3/4")}
        />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="glass rounded-xl p-6 space-y-4">
      <div className={cn("h-5 w-1/3 rounded-md", shimmerClass)} />
      <div className={cn("h-8 w-1/2 rounded-md", shimmerClass)} />
      <div className="space-y-2">
        <div className={cn("h-3 rounded-md", shimmerClass)} />
        <div className={cn("h-3 w-4/5 rounded-md", shimmerClass)} />
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className={cn("h-4 w-1/4 rounded-md", shimmerClass)} />
      <div className={cn("h-4 w-1/5 rounded-md", shimmerClass)} />
      <div className={cn("h-4 w-1/6 rounded-md", shimmerClass)} />
      <div className={cn("h-4 w-1/4 rounded-md", shimmerClass)} />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="glass rounded-xl p-6">
      <div className={cn("h-5 w-1/4 rounded-md mb-4", shimmerClass)} />
      <div className="flex items-end gap-2 h-40">
        {[60, 80, 45, 90, 55, 70].map((h, i) => (
          <div
            key={i}
            className={cn("flex-1 rounded-t-md", shimmerClass)}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function GaugeSkeleton() {
  return (
    <div className="flex items-center justify-center">
      <div className={cn("h-32 w-32 rounded-full", shimmerClass)} />
    </div>
  );
}

export { SkeletonLoader };
