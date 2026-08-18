import type { ReactNode } from 'react'
import { Link } from 'wouter'
import { Card } from '@/components/common/card'
import { ArrowLeftIcon } from '@/components/common/icon'
import { CURRENT_POLICY_VERSION } from '@/types'

interface LegalPageProps {
  title: string
  subtitle?: string
  children: ReactNode
}

/**
 * Layout común para páginas legales públicas (privacidad, términos).
 * Muestra la versión vigente del documento para evidencia de consentimiento.
 */
export function LegalPage({ title, subtitle, children }: LegalPageProps) {
  return (
    <div className='flex flex-col gap-4 max-w-3xl mx-auto'>
      <Link
        href='/'
        className='flex items-center gap-1.5 text-sm text-(--color-text-muted) hover:text-(--color-text) transition-colors w-fit touch-target -ml-2 px-2 rounded-lg'
      >
        <ArrowLeftIcon size={16} />
        Volver al inicio
      </Link>

      <div className='animate-fade-up'>
        <h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
          {title}
        </h1>
        {subtitle && (
          <p className='text-sm text-(--color-text-muted) mt-1'>{subtitle}</p>
        )}
        <p className='text-xs text-(--color-text-muted) mt-2'>
          Versión: {CURRENT_POLICY_VERSION}
        </p>
      </div>

      <Card
        className='p-6 sm:p-8 animate-fade-up'
        style={{ animationDelay: '60ms' }}
      >
        <div className='flex flex-col gap-4 text-sm leading-relaxed text-(--color-text) [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:tracking-tight [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1 [&_a]:text-(--color-primary) [&_a]:underline'>
          {children}
        </div>
      </Card>
    </div>
  )
}
