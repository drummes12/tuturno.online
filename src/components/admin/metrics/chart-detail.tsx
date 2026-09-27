import type { ChartDetailState } from '@/components/admin/metrics/use-chart-detail'

export function ChartDetail({
  detail,
  hint
}: {
  detail: ChartDetailState | null
  hint: string
}) {
  return (
    <div
      aria-hidden='true'
      className='mt-2 flex h-12 flex-col justify-center gap-0.5 overflow-hidden'
    >
      {detail ? (
        <>
          <p className='truncate text-xs font-semibold leading-4 text-(--color-text)'>
            {detail.title}
          </p>
          <p className='line-clamp-2 text-[11px] leading-4 text-text-muted'>
            {detail.summary}
          </p>
        </>
      ) : (
        <p className='text-[11px] leading-4 text-text-muted'>
          <span className='[@media(hover:none)]:hidden'>
            Pasa el cursor sobre un dato para ver el detalle
          </span>
          <span className='hidden [@media(hover:none)]:inline'>{hint}</span>
        </p>
      )}
    </div>
  )
}
