import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { WhatsAppIcon } from '@/components/common/icon'
import { waLink } from '@/lib/whatsapp'

/**
 * Botón flotante de WhatsApp para usuarios.
 * Carga el teléfono del negocio y muestra un FAB en la esquina inferior derecha.
 * Se oculta en páginas de auth y si no hay phone configurado.
 */
export function WhatsAppFab() {
  const [phone, setPhone] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState<string>('')

  useEffect(() => {
    async function loadBusiness() {
      const { data } = await supabase
        .from('businesses')
        .select('phone, name')
        .not('phone', 'is', null)
        .limit(1)
        .single()
      if (data) {
        setPhone(data.phone)
        setBusinessName(data.name)
      }
    }
    loadBusiness()
  }, [])

  const link = waLink(phone, `Hola, tengo una duda sobre las reservas en ${businessName}.`)

  if (!link) return null

  return (
    <a
      href={link}
      target='_blank'
      rel='noopener noreferrer'
      className='fixed bottom-20 right-4 z-30 md:bottom-6 md:right-6 flex items-center justify-center w-12 h-12 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 hover:shadow-xl active:scale-95 transition-all duration-200 ease-spring md:hidden'
      aria-label={`Contactar a ${businessName} por WhatsApp`}
    >
      <WhatsAppIcon size={24} />
    </a>
  )
}
