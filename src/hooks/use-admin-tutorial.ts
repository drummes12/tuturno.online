import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { driver, type Driver, type DriveStep } from 'driver.js'
import { useAuthStore } from '@/stores/auth'
import {
  shouldAutoStartAdmin,
  markAdminTutorialSeen,
  getAdminTutorialStage,
  setAdminTutorialStage,
  clearAdminTutorialStage,
  type AdminTutorialStage
} from '@/lib/admin-tutorial'

/**
 * Configuración base de Driver.js en español, con estilos coherentes
 * con la identidad TuTurno. Comparte la misma clase CSS que el tutorial
 * del cliente para mantener consistencia visual.
 */
function createDriver(opts: {
  steps: DriveStep[]
  onClose: () => void
  onDone: () => void
}): Driver {
  return driver({
    steps: opts.steps,
    showProgress: true,
    progressText: '{{current}} / {{total}}',
    nextBtnText: 'Siguiente →',
    prevBtnText: '← Anterior',
    doneBtnText: 'Entendido ✓',
    allowClose: true,
    smoothScroll: true,
    stagePadding: 8,
    stageRadius: 12,
    popoverClass: 'tuturno-tutorial-popover',
    onCloseClick: () => {
      opts.onClose()
    },
    onDoneClick: () => {
      opts.onDone()
    }
  })
}

/** Espera brevemente a que un elemento exista en el DOM (data-tour selector). */
function waitForElement(
  selector: string,
  timeout = 900
): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector)
    if (existing) {
      resolve(existing)
      return
    }
    const start = Date.now()
    const interval = setInterval(() => {
      const el = document.querySelector(selector)
      if (el) {
        clearInterval(interval)
        resolve(el)
      } else if (Date.now() - start > timeout) {
        clearInterval(interval)
        resolve(null)
      }
    }, 100)
  })
}

/** ¿El elemento existe y está renderizado? Un display:none da rect 0 —
    clave para distinguir el nav desktop del bottom nav en mobile. */
function isVisible(el: Element | null): el is Element {
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

type TourId =
  | 'admin-dashboard'
  | 'admin-metrics'
  | 'admin-resources'
  | 'admin-business-hub'
  | 'admin-hours'
  | 'admin-config'
  | 'admin-reservations'
  | 'admin-team'

interface TourDef {
  id: TourId
  stage: AdminTutorialStage
  /** Ruta en la que debe activarse este tour */
  route: string
  steps: DriveStep[]
}

/**
 * Construye los pasos del tour según la ruta.
 *
 * Casos más críticos para un negocio:
 * 1. Confirmar/rechazar solicitudes pendientes (operación diaria)
 * 2. Configurar recursos (sin esto no hay reservas)
 * 3. Configurar horarios (sin esto no hay disponibilidad)
 * 4. Ajustar duración del turno, gap y hold temporal
 * 5. Escribir instrucciones de confirmación/abono
 * 6. Filtrar y gestionar reservas por fecha/estado
 * 7. Cancelar una reserva confirmada
 *
 * `isMobile` decide a qué nav apuntar los pasos: el desktop vive bajo el
 * header (`nav.hidden`) y el mobile es la píldora fija inferior
 * (`nav.fixed`). Ambos existen siempre en el DOM — apuntar al oculto
 * resaltaría un elemento invisible.
 */
function buildTours(isMobile: boolean): TourDef[] {
  const navSel = (attr: string) =>
    `${isMobile ? 'nav.fixed' : 'nav.hidden'} [data-tour="${attr}"]`
  const navWhere = isMobile ? 'la barra inferior' : 'el menú superior'
  const navSide = isMobile ? ('top' as const) : ('bottom' as const)
  return [
    // === Operación /admin ===
    {
      id: 'admin-dashboard',
      stage: 'admin-dashboard',
      route: '/admin',
      steps: [
        {
          element: '[data-tour="admin-pending-section"]',
          popover: {
            title: 'Solicitudes pendientes',
            description:
              'Aquí aparecen las reservas que tus clientes solicitan. Se ordenan por urgencia: las más antiguas primero.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="admin-pending-card"]',
          popover: {
            title: 'Datos del cliente',
            description:
              'Cada tarjeta muestra el recurso, la fecha, la hora, el nombre y el teléfono del cliente. Si dejó notas, también aparecen aquí.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '[data-tour="admin-confirm-btn"]',
          popover: {
            title: 'Confirmar reserva',
            description:
              'Presiona Confirmar para aceptar la solicitud. El cliente recibirá una notificación automática por correo.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '[data-tour="admin-reject-btn"]',
          popover: {
            title: 'Rechazar reserva',
            description:
              'Si no puedes aceptar la solicitud, presiona Rechazar. Deberás escribir un motivo que el cliente verá en su notificación.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '[data-tour="admin-today-section"]',
          popover: {
            title: 'Agenda de hoy',
            description:
              'Aquí ves las reservas confirmadas de hoy, separadas en próximas y ya pasadas. Úsalo como tu panel de control del día.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: navSel('admin-nav-metrics'),
          popover: {
            title: 'Métricas del negocio',
            description: `En ${navWhere} tienes Métricas: ocupación por horario, velocidad de respuesta y clientes top del período.`,
            side: navSide,
            align: 'center'
          }
        },
        {
          element: navSel('admin-nav-business'),
          popover: {
            title: 'Configura tu negocio',
            description: `Antes de recibir reservas crea al menos un recurso (sala, cancha, mesa…) y define horarios, cierres, equipo y la operación (duración de turnos, hold, políticas e instrucciones). Todo vive en ${navWhere}.`,
            side: navSide,
            align: 'center'
          }
        }
      ]
    },
    // === Métricas /admin/metricas ===
    {
      id: 'admin-metrics',
      stage: 'admin-metrics',
      route: '/admin/metricas',
      steps: [
        {
          element: '[data-tour="metrics-context"]',
          popover: {
            title: 'El período y los filtros',
            description:
              'Aquí ves el rango de fechas activo. En Filtros cambias el período (7, 30 o 90 días) y puedes limitar todas las métricas a recursos específicos.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="metrics-reservations"]',
          popover: {
            title: 'Reservas por día',
            description:
              'Cuántas reservas entraron cada día del período, comparadas con el período anterior. Sirve para ver si la demanda sube o baja.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '[data-tour="metrics-sla"]',
          popover: {
            title: 'Velocidad de respuesta',
            description:
              'Qué tan rápido respondes las solicitudes: tiempo mediano de respuesta y cómo terminaron — confirmadas, rechazadas o vencidas por el hold.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '[data-tour="metrics-heatmap"]',
          popover: {
            title: 'Mapa de calor',
            description:
              'Qué días y horas concentran la demanda — útil para ajustar horarios y precios. Toca una celda para ver el promedio por jornada y el total del período.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '[data-tour="metrics-sections"]',
          popover: {
            title: 'Reservas y Clientes',
            description:
              'En el celular las métricas se dividen en dos pestañas. En Clientes verás tus clientes top y de dónde vienen las reservas.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '[data-tour="metrics-clients"]',
          popover: {
            title: 'Clientes top',
            description:
              'Tus clientes con más reservas del período. La mini barra resume sus estados: completadas, confirmadas, pendientes y perdidas. Toca una fila para ver el detalle.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '[data-tour="metrics-origin"]',
          popover: {
            title: 'Origen de las reservas',
            description:
              'Quién crea las reservas: tus clientes desde la página pública o tu equipo desde el panel. Cada barra muestra el desglose de estados de ese origen.',
            side: 'top',
            align: 'center'
          }
        }
      ]
    },
    // === Recursos /admin/recursos ===
    {
      id: 'admin-resources',
      stage: 'admin-resources',
      route: '/admin/recursos',
      steps: [
        {
          element: '[data-tour="admin-resource-new"]',
          popover: {
            title: 'Crear un recurso',
            description:
              'Presiona aquí para añadir un nuevo recurso. Un recurso es cualquier unidad reservable: una sala, una cancha, una mesa, un consultorio, etc.',
            side: 'bottom',
            align: 'end'
          }
        },
        {
          element: '[data-tour="admin-resource-card"]',
          popover: {
            title: 'Gestionar recursos',
            description:
              'Cada tarjeta representa un recurso. Puedes editar el nombre y la descripción, o activarlo/desactivarlo con el interruptor.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '[data-tour="admin-resource-toggle"]',
          popover: {
            title: 'Activar o desactivar',
            description:
              'Si desactivas un recurso, tus clientes no podrán reservarlo, pero sus reservas existentes se mantienen. Útil para mantenimiento temporal.',
            side: 'top',
            align: 'end'
          }
        }
      ]
    },
    // === Negocio /admin/negocio ===
    {
      id: 'admin-business-hub',
      stage: 'admin-business-hub',
      route: '/admin/negocio',
      steps: [
        {
          element: '[data-tour="business-hub-hours"]',
          popover: {
            title: 'Horarios',
            description:
              'Define las franjas horarias en las que aceptas reservas para cada día de la semana.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '[data-tour="business-hub-config"]',
          popover: {
            title: 'Configuración',
            description:
              'Ajusta la duración de los turnos, el tiempo de hold, las políticas de cancelación y las instrucciones que verán tus clientes.',
            side: 'bottom',
            align: 'center'
          }
        }
      ]
    },
    // === Horarios /admin/horarios ===
    {
      id: 'admin-hours',
      stage: 'admin-hours',
      route: '/admin/horarios',
      steps: [
        {
          element: '[data-tour="admin-hours-day"]',
          popover: {
            title: 'Días de operación',
            description:
              'Cada día tiene un interruptor para abrirlo o cerrarlo. Un día abierto puede tener una o varias franjas horarias.',
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '[data-tour="admin-hours-add"]',
          popover: {
            title: 'Añadir franjas',
            description:
              'Puedes tener varias franjas por día, por ejemplo mañana y tarde con un descanso al mediodía. Presiona aquí para añadir una franja.',
            side: 'bottom',
            align: 'end'
          }
        },
        {
          element: '[data-tour="admin-hours-save"]',
          popover: {
            title: 'Guardar cambios',
            description:
              'Cuando termines de ajustar tus horarios, presiona Guardar. Si hay franjas que se solapan, no podrás guardar hasta corregirlas.',
            side: 'top',
            align: 'end'
          }
        }
      ]
    },
    // === Configuración /admin/configuracion ===
    {
      id: 'admin-config',
      stage: 'admin-config',
      route: '/admin/configuracion',
      steps: [
        {
          element: '[data-tour="admin-config-slot"]',
          popover: {
            title: 'Duración del turno',
            description:
              'Define cuánto dura cada turno (30, 45, 60 o 90 minutos, o un valor personalizado). Esto determina cómo se divide la disponibilidad.',
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '[data-tour="admin-config-gap"]',
          popover: {
            title: 'Gap entre turnos',
            description:
              'Es el descanso entre reservas consecutivas. Útil para limpieza o preparación. Si no necesitas descanso, selecciónalo en 0.',
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '[data-tour="admin-config-hold"]',
          popover: {
            title: 'Hold temporal',
            description:
              'Cuando un cliente envía una solicitud, el turno queda reservado temporalmente este número de minutos mientras decides confirmar o rechazar. Si no actúas a tiempo, la solicitud expira automáticamente.',
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '[data-tour="admin-config-instructions"]',
          popover: {
            title: 'Instrucciones de confirmación',
            description:
              'Escribe aquí los pasos que el cliente debe seguir para confirmar su reserva: abono, contacto por WhatsApp, tiempo de espera, etc. Aparecen antes de enviar la solicitud.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '[data-tour="admin-config-save"]',
          popover: {
            title: 'Guardar configuración',
            description:
              'Presiona aquí para guardar todos los cambios. La configuración se aplica inmediatamente a nuevas reservas.',
            side: 'top',
            align: 'end'
          }
        }
      ]
    },
    // === Reservas /admin/reservas ===
    {
      id: 'admin-reservations',
      stage: 'admin-reservations',
      route: '/admin/reservas',
      steps: [
        {
          element: '[data-tour="admin-reservations-date"]',
          popover: {
            title: 'Filtrar por fecha',
            description:
              'Selecciona cualquier fecha para ver todas las reservas de ese día, pasadas o futuras.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="admin-reservations-filters"]',
          popover: {
            title: 'Filtrar por estado',
            description:
              'Cambia entre todas, pendientes, confirmadas, rechazadas, canceladas y completadas para encontrar rápidamente lo que necesitas.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="admin-reservations-card"]',
          popover: {
            title: 'Gestionar reservas',
            description:
              'Cada tarjeta muestra la hora, el recurso, el cliente y el estado. Desde aquí puedes confirmar, rechazar o cancelar según corresponda.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '[data-tour="admin-reservations-cancel"]',
          popover: {
            title: 'Cancelar reserva confirmada',
            description:
              'Si una reserva ya está confirmada y necesitas cancelarla, usa este botón. Deberás escribir un motivo que se le notificará al cliente.',
            side: 'top',
            align: 'center'
          }
        }
      ]
    },
    // === Equipo /admin/equipo ===
    {
      id: 'admin-team',
      stage: 'admin-team',
      route: '/admin/equipo',
      steps: [
        {
          element: '[data-tour="admin-team-invite"]',
          popover: {
            title: 'Añadir a tu equipo',
            description:
              'Busca a una persona por su email para añadirla como manager. La persona debe tener una cuenta creada en TuTurno primero. Si no la tiene, pídele que se registre.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="admin-team-members"]',
          popover: {
            title: 'Miembros del negocio',
            description:
              'Aquí ves a todas las personas que pueden administrar este negocio. Cada tarjeta muestra el nombre, el rol (owner o manager) y cuándo se unieron.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '[data-tour="admin-team-remove"]',
          popover: {
            title: 'Eliminar un miembro',
            description:
              'Para quitar a un manager del negocio, presiona el botón de eliminar y confirma. No puedes eliminarte a ti mismo ni eliminar al único owner del negocio.',
            side: 'top',
            align: 'end'
          }
        }
      ]
    }
  ]
}

/** Determina qué tour corresponde a la ruta actual. */
function selectTour(route: string, isMobile: boolean): TourDef | null {
  const tours = buildTours(isMobile)

  if (route === '/admin') {
    return tours.find((t) => t.id === 'admin-dashboard') ?? null
  }
  if (route === '/admin/metricas') {
    return tours.find((t) => t.id === 'admin-metrics') ?? null
  }
  if (route === '/admin/recursos') {
    return tours.find((t) => t.id === 'admin-resources') ?? null
  }
  if (route === '/admin/negocio') {
    return tours.find((t) => t.id === 'admin-business-hub') ?? null
  }
  if (route === '/admin/horarios') {
    return tours.find((t) => t.id === 'admin-hours') ?? null
  }
  if (route === '/admin/configuracion') {
    return tours.find((t) => t.id === 'admin-config') ?? null
  }
  if (route === '/admin/reservas') {
    return tours.find((t) => t.id === 'admin-reservations') ?? null
  }
  if (route === '/admin/equipo') {
    return tours.find((t) => t.id === 'admin-team') ?? null
  }

  return null
}

export interface UseAdminTutorialResult {
  /** Inicia el tour contextual manualmente (botón Guía). */
  startTour: () => void
  /** Cierra cualquier tour activo. */
  stopTour: () => void
  /** Indica que el tutorial está esperando a que la pantalla esté lista. */
  isStarting: boolean
}

/**
 * Hook que gestiona el tutorial guiado del panel admin.
 * Se monta una sola vez desde AppLayout.
 */
export function useAdminTutorial(): UseAdminTutorialResult {
  const [location] = useLocation()
  const { user, isAdmin } = useAuthStore()
  const driverRef = useRef<Driver | null>(null)
  const autoStartedRef = useRef(false)
  const startingRef = useRef(false)
  const startTokenRef = useRef(0)
  const [isStarting, setIsStarting] = useState(false)

  const cleanup = useCallback(() => {
    startTokenRef.current += 1
    startingRef.current = false
    setIsStarting(false)

    if (driverRef.current) {
      driverRef.current.destroy()
      driverRef.current = null
    }
  }, [])

  const startTourForRoute = useCallback(
    async (route: string, isAuto: boolean) => {
      // Evitar aperturas duplicadas por auto-start, reanudación y clic manual.
      if (startingRef.current || driverRef.current?.isActive()) return

      const isMobile = window.matchMedia('(max-width: 767px)').matches
      const tour = selectTour(route, isMobile)
      if (!tour) return

      // Si es automático, verificar si ya se vio.
      if (
        isAuto &&
        !shouldAutoStartAdmin({ userId: user?.id ?? null, isAdmin })
      ) {
        return
      }

      startingRef.current = true
      setIsStarting(true)
      const startToken = ++startTokenRef.current

      try {
        // Esperar brevemente a que termine de montar la pantalla.
        const firstStep = tour.steps[0]
        if (firstStep?.element && typeof firstStep.element === 'string') {
          await waitForElement(firstStep.element)
        }

        // Si cambió la ruta o se cerró el intento durante la espera, abandonar.
        if (startToken !== startTokenRef.current) return

        // Filtrar pasos cuyo elemento no existe o está oculto (p. ej. la
        // sección Clientes en mobile o el nav del otro dispositivo).
        const validSteps = tour.steps.filter((step) => {
          if (!step.element || typeof step.element !== 'string') return true
          return isVisible(document.querySelector(step.element))
        })

        if (validSteps.length === 0) return

        const d = createDriver({
          steps: validSteps,
          onClose: () => {
            if (isAuto) {
              markAdminTutorialSeen(user?.id ?? '')
            }
            clearAdminTutorialStage()
            cleanup()
          },
          onDone: () => {
            if (isAuto) {
              markAdminTutorialSeen(user?.id ?? '')
            }
            clearAdminTutorialStage()
            cleanup()
          }
        })

        driverRef.current = d
        setAdminTutorialStage(tour.stage)
        d.drive()
      } finally {
        if (startToken === startTokenRef.current) {
          startingRef.current = false
          setIsStarting(false)
        }
      }
    },
    [cleanup, user, isAdmin]
  )

  // Auto-start en la primera visita al panel admin
  useEffect(() => {
    if (autoStartedRef.current) return
    if (!shouldAutoStartAdmin({ userId: user?.id ?? null, isAdmin })) return

    // Pequeño delay para que la página termine de renderizar
    const timer = setTimeout(() => {
      startTourForRoute(location, true)
      autoStartedRef.current = true
    }, 600)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, user?.id, isAdmin])

  // Limpiar al cambiar de ruta
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup, location])

  // Reanudar tour si hay etapa guardada y cambiamos de ruta
  useEffect(() => {
    const stage = getAdminTutorialStage()
    if (!stage) return

    const tour = selectTour(
      location,
      window.matchMedia('(max-width: 767px)').matches
    )
    if (tour && tour.stage === stage) {
      const timer = setTimeout(() => {
        startTourForRoute(location, false)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [location, user?.id, isAdmin, startTourForRoute])

  const startTour = useCallback(() => {
    startTourForRoute(location, false)
  }, [location, startTourForRoute])

  const stopTour = useCallback(() => {
    cleanup()
    clearAdminTutorialStage()
  }, [cleanup])

  return { startTour, stopTour, isStarting }
}
