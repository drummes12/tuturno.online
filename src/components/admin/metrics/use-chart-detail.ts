import { useState } from 'react'

/**
 * Detalle interactivo de gráficas: hover (desktop) o tap (mobile) fija
 * una línea de texto bajo la gráfica. Sin tooltips flotantes — las
 * celdas son demasiado pequeñas para posicionar un globo encima.
 */
export function useChartDetail() {
  const [detail, setDetail] = useState<{ key: string; text: string } | null>(
    null
  )
  const bind = (key: string, text: string) => ({
    onMouseEnter: () => setDetail({ key, text }),
    onMouseLeave: () => setDetail(null),
    onClick: () => setDetail({ key, text })
  })
  const isActive = (key: string) => detail?.key === key
  return { detail, bind, isActive }
}
