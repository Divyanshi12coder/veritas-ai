import { cx } from '../../lib/format';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cx('relative overflow-hidden rounded bg-beige/70', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-cream to-transparent" />
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading analysis">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-14 w-3/4" />
      <div className="grid gap-5 md:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48 md:col-span-2" />
      </div>
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  );
}
