import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { driver, type Driver, type DriveStep } from 'driver.js'
import { useAuthStore } from '@/stores/auth'
import {
  shouldAutoStart,
  markSeen,
  getTutorialStage,
  setTutorialStage,
  clearTutorialStage,
  type TutorialStage
} from '@/lib/client-tutorial'

/**
 * Configuración base de Driver.js en español, con estilos coherentes
 * con la identidad TuTurno.
 */
function createDriver(opts: {
  steps: DriveStep[]
  onClose: () => void
  onDone: () => void
}): Driver {
  return driver({
    steps: opts.steps,
    showProgress: true,
    progressText: 'Paso {{current}} de {{total}}',
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

type TourId =
  | 'visitor-home'
  | 'auth'
  | 'client-home'
  | 'reservation'
  | 'my-reservations'

interface TourDef {
  id: TourId
  stage: TutorialStage
  /** Ruta en la que debe activarse este tour */
  route: string
  steps: DriveStep[]
}

/** Construye los pasos del tour según la ruta y el estado de auth. */
function buildTours(): TourDef[] {
  return [
    // === Visitante en / ===
    {
      id: 'visitor-home',
      stage: 'public-discovery',
      route: '/',
      steps: [
        {
          element: '[data-tour="availability-date-picker"]',
          popover: {
            title: 'Elige una fecha',
            description:
              'Desliza y toca un día para ver los turnos disponibles en esa fecha.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="availability-resource-selector"]',
          popover: {
            title: 'Selecciona una recurso',
            description:
              'Si el negocio tiene varias recursos, elige cuál quieres reservar.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="availability-slot"]',
          popover: {
            title: 'Elige un turno',
            description:
              'Los turnos verdes están disponibles. Toca uno para iniciar tu reserva.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '[data-tour="auth-entry"]',
          popover: {
            title: 'Necesitas una cuenta',
            description:
              'Para reservar necesitas iniciar sesión o registrarte. ¡Es rápido!',
            side: 'bottom',
            align: 'end'
          }
        }
      ]
    },
    // === Login ===
    {
      id: 'auth',
      stage: 'auth',
      route: '/login',
      steps: [
        {
          element: '[data-tour="login-email"]',
          popover: {
            title: 'Tu correo',
            description: 'Ingresa el email con el que te registraste.',
            side: 'right',
            align: 'center'
          }
        },
        {
          element: '[data-tour="login-password"]',
          popover: {
            title: 'Tu contraseña',
            description: 'Escribe tu contraseña y luego presiona Ingresar.',
            side: 'right',
            align: 'center'
          }
        },
        {
          element: '[data-tour="login-submit"]',
          popover: {
            title: 'Iniciar sesión',
            description:
              'Presiona este botón para entrar. Si no tienes cuenta, usa el enlace de abajo para registrarte.',
            side: 'top',
            align: 'center'
          }
        }
      ]
    },
    // === Cliente autenticado en / ===
    {
      id: 'client-home',
      stage: 'public-discovery',
      route: '/',
      steps: [
        {
          element: '[data-tour="availability-date-picker"]',
          popover: {
            title: 'Elige una fecha',
            description: 'Selecciona el día en el que quieres reservar.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="availability-resource-selector"]',
          popover: {
            title: 'Selecciona una recurso',
            description: 'Elige la recurso que prefieras.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="availability-slot"]',
          popover: {
            title: 'Elige un turno',
            description:
              'Toca un turno disponible para ir al formulario de reserva.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '[data-tour="client-nav-reservations"]',
          popover: {
            title: 'Mis reservas',
            description:
              'Aquí puedes ver y gestionar tus reservas: confirmaciones, cancelaciones y más.',
            side: 'top',
            align: 'center'
          }
        }
      ]
    },
    // === Reserva /reservar ===
    {
      id: 'reservation',
      stage: 'reservation',
      route: '/reservar',
      steps: [
        {
          element: '[data-tour="reservation-summary"]',
          popover: {
            title: 'Resumen de tu reserva',
            description: 'Revisa la recurso, fecha y hora seleccionadas.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '[data-tour="reservation-contact"]',
          popover: {
            title: 'Tus datos',
            description:
              'Confirma tu nombre y teléfono. El negocio los usará para contactarte.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '[data-tour="reservation-instructions"]',
          popover: {
            title: 'Instrucciones del negocio',
            description:
              'Aquí aparecerán los pasos para confirmar tu reserva (abono, WhatsApp, etc.).',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '[data-tour="reservation-submit"]',
          popover: {
            title: 'Enviar solicitud',
            description:
              'Tu solicitud quedará pendiente hasta que el negocio la confirme. El tiempo durante el que el turno se mantiene reservado temporalmente lo configura cada negocio.',
            side: 'top',
            align: 'center'
          }
        }
      ]
    },
    // === Mis reservas /mis-reservas ===
    {
      id: 'my-reservations',
      stage: 'my-reservations',
      route: '/mis-reservas',
      steps: [
        {
          element: '[data-tour="reservations-filters"]',
          popover: {
            title: 'Filtra tus reservas',
            description:
              'Cambia entre próximas, pendientes, confirmadas y pasadas.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="reservation-card"]',
          popover: {
            title: 'Tus reservas',
            description:
              'Cada tarjeta muestra la recurso, fecha, hora y estado de tu reserva.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '[data-tour="reservation-whatsapp"]',
          popover: {
            title: 'Confirmar por WhatsApp',
            description:
              'Para reservas pendientes, puedes contactar al negocio directamente por WhatsApp.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '[data-tour="reservation-cancel"]',
          popover: {
            title: 'Cancelar reserva',
            description:
              'Puedes cancelar hasta 2 horas antes del turno. Las pendientes se pueden cancelar en cualquier momento.',
            side: 'top',
            align: 'center'
          }
        }
      ]
    }
  ]
}

/** Determina qué tour corresponde a la ruta y estado actuales. */
function selectTour(
  route: string,
  userId: string | null,
  isAdmin: boolean
): TourDef | null {
  if (isAdmin) return null

  const tours = buildTours()

  // En login, siempre el tour de auth
  if (route === '/login' || route === '/registro') {
    return tours.find((t) => t.id === 'auth') ?? null
  }

  // En /b/:slug/reservar, tour de reserva
  if (/^\/b\/[^/]+\/reservar$/.test(route)) {
    return tours.find((t) => t.id === 'reservation') ?? null
  }

  // En /b/:slug/mis-reservas, tour de mis reservas
  if (/^\/b\/[^/]+\/mis-reservas$/.test(route)) {
    return tours.find((t) => t.id === 'my-reservations') ?? null
  }

  // En /b/:slug (disponibilidad), depende de si hay sesión
  if (/^\/b\/[^/]+$/.test(route)) {
    return userId
      ? (tours.find((t) => t.id === 'client-home') ?? null)
      : (tours.find((t) => t.id === 'visitor-home') ?? null)
  }

  return null
}

export interface UseClientTutorialResult {
  /** Inicia el tour contextual manualmente (botón Guía). */
  startTour: () => void
  /** Cierra cualquier tour activo. */
  stopTour: () => void
  /** Indica que el tutorial está esperando a que la pantalla esté lista. */
  isStarting: boolean
}

/**
 * Hook que gestiona el tutorial guiado del cliente.
 * Se monta una sola vez desde AppLayout.
 */
export function useClientTutorial(): UseClientTutorialResult {
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

      const tour = selectTour(route, user?.id ?? null, isAdmin)
      if (!tour) return

      // Si es automático, verificar si ya se vio.
      if (isAuto && !shouldAutoStart({ userId: user?.id ?? null, isAdmin })) {
        return
      }

      startingRef.current = true
      setIsStarting(true)
      const startToken = ++startTokenRef.current

      try {
        // Esperar brevemente a que termine de montar la pantalla, sin bloquear
        // el botón durante varios segundos si el target no existe.
        const firstStep = tour.steps[0]
        if (firstStep?.element && typeof firstStep.element === 'string') {
          await waitForElement(firstStep.element)
        }

        // Si cambió la ruta o se cerró el intento durante la espera, abandonar.
        if (startToken !== startTokenRef.current) return

        // Filtrar pasos cuyo elemento no existe (skipMissingElement no siempre funciona bien).
        const validSteps = tour.steps.filter((step) => {
          if (!step.element || typeof step.element !== 'string') return true
          return document.querySelector(step.element) !== null
        })

        if (validSteps.length === 0) return

        const d = createDriver({
          steps: validSteps,
          onClose: () => {
            if (isAuto) {
              markSeen({ userId: user?.id ?? null })
            }
            clearTutorialStage()
            cleanup()
          },
          onDone: () => {
            if (isAuto) {
              markSeen({ userId: user?.id ?? null })
            }
            clearTutorialStage()
            cleanup()
          }
        })

        driverRef.current = d
        setTutorialStage(tour.stage)
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

  // Auto-start en la primera visita
  useEffect(() => {
    if (autoStartedRef.current) return
    if (!shouldAutoStart({ userId: user?.id ?? null, isAdmin })) return

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
    const stage = getTutorialStage()
    if (!stage) return

    // Si la etapa corresponde a la ruta actual, iniciar el tour
    const tour = selectTour(location, user?.id ?? null, isAdmin)
    if (tour && tour.stage === stage) {
      // No es auto, es reanudación
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
    clearTutorialStage()
  }, [cleanup])

  return { startTour, stopTour, isStarting }
}
