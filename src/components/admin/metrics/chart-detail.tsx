/** Altura fija: aparecer/desaparecer no mueve el layout. */
export function ChartDetail({ text }: { text: string | null }) {
  return (
    <p
      aria-live='polite'
      className='mt-2 h-4 truncate text-[11px] text-text-muted nums'
    >
      {text ?? (
        <span className='opacity-60'>
          <span className='[@media(hover:none)]:hidden'>
            Pasa el cursor para ver el detalle
          </span>
          <span className='hidden [@media(hover:none)]:inline'>
            Toca para ver el detalle
          </span>
        </span>
      )}
    </p>
  )
}
