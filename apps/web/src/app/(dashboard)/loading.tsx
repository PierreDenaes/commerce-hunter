import { SkeletonLoader } from "@/components/ui/skeleton-loader";

export default function DashboardLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonLoader key={i} variant="card" />
      ))}
    </div>
  );
}
