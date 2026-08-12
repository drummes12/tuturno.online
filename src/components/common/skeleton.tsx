interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

/** Skeleton for a reservation card */
export function ReservationSkeleton() {
  return (
    <div className='rounded-xl bg-surface-elevated border border-border p-4 flex flex-col gap-3'>
      <div className='flex justify-between items-start'>
        <div className='flex flex-col gap-2 flex-1'>
          <Skeleton className='h-5 w-32' />
          <Skeleton className='h-4 w-48' />
        </div>
        <Skeleton className='h-6 w-24 rounded-full' />
      </div>
      <Skeleton className='h-4 w-40' />
    </div>
  )
}

/** Skeleton for a slot grid */
export function SlotGridSkeleton() {
  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2'>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className='h-20 rounded-lg' />
      ))}
    </div>
  )
}

/** Skeleton for a date picker row */
export function DatePickerSkeleton() {
  return (
    <div className='flex gap-2 overflow-hidden pb-2'>
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} className='min-w-16 h-20 rounded-lg' />
      ))}
    </div>
  )
}
