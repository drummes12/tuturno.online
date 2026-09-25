import type { ReactNode } from 'react'
import { Card } from '@/components/common/card'

/**
 * Panel de marca compartido por las pantallas de auth.
 * En desktop: card dividida — panel de marca a la izquierda, formulario
 * a la derecha. En mobile: solo el formulario con una banda compacta.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className='flex flex-1 items-center justify-center py-8'>
      <Card
        bordered
        className='border-beam beam-pitch-500 dark:beam-pitch-400 grid w-full max-w-md overflow-hidden p-0 animate-fade-up lg:max-w-4xl lg:grid-cols-[1fr_1.15fr]'
      >
        {/* Panel de marca — solo desktop */}
        <aside className='relative hidden flex-col justify-between overflow-hidden bg-pitch-950 p-10 text-chalk lg:flex'>
          {/* Decoración: halo mint + anillo de reloj tenue */}
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-0'
          >
            <div className='absolute -top-24 right-0 h-72 w-72 rounded-full bg-flood-400/15 blur-3xl' />
            <div className='absolute bottom-0 left-0 h-40 w-40 rounded-full bg-pitch-500/20 blur-3xl' />
            <div className='absolute -bottom-28 -right-28 h-72 w-72 rounded-full border-26 border-white/6' />
          </div>

          <div className='relative flex items-center gap-2.5 font-bold tracking-tight'>
            <img src='/logo-mark.svg' alt='' className='h-9 w-9 rounded-xl' />
            <span className='text-lg'>TuTurno</span>
          </div>

          <div className='relative'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-pitch-300'>
              Acceso
            </p>
            <p className='mt-3 text-2xl font-bold leading-snug tracking-tight text-balance'>
              Reservas y horarios,
              <br />
              en un mismo lugar.
            </p>
            {/* Mini agenda decorativa */}
            <div className='mt-6 flex flex-col divide-y divide-white/10 rounded-xl border border-white/15 bg-white/5 text-[11px] backdrop-blur-sm'>
              <div className='flex items-center justify-between px-4 py-2.5'>
                <span className='nums font-mono text-chalk'>19:00</span>
                <span className='uppercase tracking-[0.12em] text-pitch-300'>
                  Libre
                </span>
              </div>
              <div className='flex items-center justify-between px-4 py-2.5'>
                <span className='nums font-mono text-chalk/60'>20:00</span>
                <span className='uppercase tracking-[0.12em] text-chalk/40'>
                  Reservado
                </span>
              </div>
              <div className='flex items-center justify-between px-4 py-2.5'>
                <span className='nums font-mono text-chalk'>21:00</span>
                <span className='uppercase tracking-[0.12em] text-flood-400'>
                  En espera
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Formulario */}
        <div className='flex flex-col'>
          {/* Banda de marca compacta — solo mobile */}
          <div className='relative overflow-hidden bg-pitch-950 px-6 py-5 text-chalk lg:hidden'>
            <div
              aria-hidden='true'
              className='pointer-events-none absolute inset-0'
            >
              <div className='absolute -top-16 right-0 h-40 w-40 rounded-full bg-flood-400/15 blur-3xl' />
              <div className='absolute bottom-0 left-1/3 h-px w-2/3 bg-white/10' />
            </div>
            <div className='relative flex items-center justify-between gap-3'>
              <p className='text-[10px] font-semibold uppercase tracking-[0.16em] text-pitch-300'>
                Acceso
              </p>
              <p className='text-xs text-chalk/70'>
                Reservas y horarios en TuTurno.
              </p>
            </div>
          </div>
          <div className='p-6 md:p-8 lg:p-10'>{children}</div>
        </div>
      </Card>
    </div>
  )
}
