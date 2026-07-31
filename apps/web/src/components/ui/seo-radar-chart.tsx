"use client";

import * as React from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const LazyRadarChart = React.lazy(() =>
  import("recharts").then((mod) => ({
    default: function SEORadarInner({
      data,
      maxScore,
      shouldReduceMotion,
      className,
    }: SEORadarChartInnerProps) {
      const {
        ResponsiveContainer,
        RadarChart,
        PolarGrid,
        PolarAngleAxis,
        Radar,
      } = mod;

      return (
        <div className={cn("h-64 w-full", className)}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid
                stroke="var(--border)"
                strokeOpacity={0.5}
                strokeDasharray="3 3"
              />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{
                  fill: "var(--muted-foreground)",
                  fontSize: 12,
                }}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.25}
                strokeWidth={2}
                animationDuration={1200}
                isAnimationActive={!shouldReduceMotion}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      );
    },
  })),
);

interface SEORadarChartInnerProps {
  data: Array<{ dimension: string; score: number }>;
  maxScore: number;
  shouldReduceMotion: boolean;
  className?: string;
}

export interface SEORadarChartProps
  extends React.HTMLAttributes<HTMLDivElement> {
  data: Array<{ dimension: string; score: number }>;
  maxScore?: number;
  size?: number;
}

function SEORadarChart({
  data,
  maxScore = 100,
  size = 300,
  className,
  ...props
}: SEORadarChartProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <div
      className={className}
      style={{ maxWidth: size }}
      {...props}
    >
      <React.Suspense
        fallback={
          <div className="flex h-64 w-full items-center justify-center text-sm text-muted-foreground">
            Chargement du graphique…
          </div>
        }
      >
        <LazyRadarChart
          data={data}
          maxScore={maxScore}
          shouldReduceMotion={shouldReduceMotion}
        />
      </React.Suspense>
    </div>
  );
}

SEORadarChart.displayName = "SEORadarChart";

export { SEORadarChart };
