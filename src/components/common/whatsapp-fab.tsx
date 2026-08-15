import { useState, useEffect } from 'react'
import { WhatsAppIcon } from '@/components/common/icon'
import { waLink } from '@/lib/whatsapp'
import { fetchBusinessContactById } from '@/services/business'
import { getSlugFromUrl } from '@/lib/slug'
import { useTenant } from '@/hooks/use-tenant'

type WhatsAppFabProps = {
  /** Explicit business ID. If not provided, resolves from URL slug. */
  businessId?: string
}

/**
 * Botón flotante de WhatsApp para usuarios.
 * Carga el teléfono del negocio y muestra un FAB en la esquina inferior derecha.
 * Se oculta en páginas de auth y si no hay phone configurado.
 */
export function WhatsAppFab({ businessId }: WhatsAppFabProps = {}) {
  const slug = getSlugFromUrl() ?? undefined
  const { business: tenantBusiness } = useTenant(businessId ? undefined : slug)
  const resolvedBusinessId = businessId ?? tenantBusiness?.id ?? null

  const [phone, setPhone] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState<string>('')

  useEffect(() => {
    if (!resolvedBusinessId) return
    async function loadBusiness() {
      const data = await fetchBusinessContactById(resolvedBusinessId!)
      if (data) {
        setPhone(data.phone)
        setBusinessName(data.name)
      }
    }
    loadBusiness()
  }, [resolvedBusinessId])

  const link = waLink(
    phone,
    `Hola, tengo una duda sobre las reservas en ${businessName}.`
  )

  if (!link) return null

  return (
    <a
      href={link}
      target='_blank'
      rel='noopener noreferrer'
      className='flex items-center justify-center w-12 h-12 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 hover:shadow-xl active:scale-95 transition-all duration-200 ease-spring md:hidden'
      aria-label={`Contactar a ${businessName} por WhatsApp`}
    >
      <WhatsAppIcon size={24} />
    </a>
  )
}
