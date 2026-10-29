import { Skeleton } from '@/components/ui/skeleton'

export function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Chargement du bilan…">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-10 w-96 max-w-full" />
      </div>
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <Skeleton className="h-14 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  )
}
