import { useState, useEffect, useRef, useCallback } from 'react'
import { searchClients } from '@/services/clients'
import type { ClientSearchResult } from '@/types'
import { Input } from '@/components/common/input'
import { PhoneInput } from '@/components/common/phone-input'
import { Button } from '@/components/common/button'
import {
  SearchIcon,
  UserIcon,
  CheckIcon,
  XIcon,
  PlusIcon,
  MailIcon
} from '@/components/common/icon'

export interface ClientSelection {
  clientId: string | null
  name: string
  phone: string | null
  email: string | null
  hasAccount: boolean
}

interface ClientSelectorProps {
  businessId: string
  onChange: (selection: ClientSelection) => void
}

export function ClientSelector({ businessId, onChange }: ClientSelectorProps) {
  const [mode, setMode] = useState<'search' | 'new'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ClientSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<ClientSearchResult | null>(null)
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([])
        setSearching(false)
        return
      }
      try {
        const data = await searchClients(businessId, q)
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    },
    [businessId]
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, doSearch])

  // Notificar cambios al padre
  useEffect(() => {
    if (selected) {
      onChange({
        clientId: selected.id,
        name: selected.name,
        phone: selected.phone,
        email: selected.email,
        hasAccount: selected.has_account
      })
    } else if (mode === 'new') {
      onChange({
        clientId: null,
        name: guestName.trim(),
        phone: guestPhone.trim() || null,
        email: guestEmail.trim() || null,
        hasAccount: false
      })
    } else {
      onChange({
        clientId: null,
        name: '',
        phone: null,
        email: null,
        hasAccount: false
      })
    }
  }, [selected, mode, guestName, guestPhone, guestEmail, onChange])

  function handleSelect(client: ClientSearchResult) {
    setSelected(client)
    setQuery('')
    setResults([])
  }

  function handleClearSelection() {
    setSelected(null)
  }

  function handleSwitchMode(newMode: 'search' | 'new') {
    setMode(newMode)
    setSelected(null)
    setQuery('')
    setResults([])
  }

  // Cliente seleccionado — mostrar tarjeta
  if (selected) {
    return (
      <div className='flex flex-col gap-3'>
        <div className='rounded-xl border border-(--color-primary)/30 bg-(--color-primary)/5 p-4 animate-fade-up'>
          <div className='flex items-start justify-between gap-2'>
            <div className='flex items-start gap-3 min-w-0'>
              <div className='w-10 h-10 rounded-full bg-(--color-primary)/10 flex items-center justify-center text-(--color-primary) shrink-0'>
                <UserIcon size={20} />
              </div>
              <div className='min-w-0'>
                <p className='font-medium text-(--color-text) truncate'>
                  {selected.name}
                </p>
                {selected.phone && (
                  <p className='text-sm text-(--color-text-muted) nums truncate'>
                    {selected.phone}
                  </p>
                )}
                {selected.email && (
                  <p className='text-sm text-(--color-text-muted) truncate'>
                    {selected.email}
                  </p>
                )}
                {selected.has_account && (
                  <span className='inline-flex items-center gap-1 mt-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full'>
                    <CheckIcon size={12} />
                    Con cuenta
                  </span>
                )}
              </div>
            </div>
            <button
              type='button'
              onClick={handleClearSelection}
              className='text-(--color-text-muted) hover:text-(--color-text) transition-colors touch-target p-1 -m-1 rounded-lg'
              aria-label='Cambiar cliente'
            >
              <XIcon size={18} />
            </button>
          </div>
        </div>
        <button
          type='button'
          onClick={() => handleSwitchMode('search')}
          className='text-sm text-(--color-primary) hover:underline self-start touch-target px-1 -m-1'
        >
          Buscar otro cliente
        </button>
      </div>
    )
  }

  // Modo nuevo cliente guest
  if (mode === 'new') {
    return (
      <div className='flex flex-col gap-4'>
        <Input
          label='Nombre del cliente'
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder='Ej: Juan Pérez'
          required
          icon={<UserIcon size={18} />}
        />
        <PhoneInput
          label='Teléfono'
          value={guestPhone}
          onChange={setGuestPhone}
          placeholder='300 123 4567'
          hint='Se usará para vincular la reserva cuando el cliente se registre.'
          optional
        />
        <Input
          label='Email (opcional)'
          type='email'
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          placeholder='juan@email.com'
          hint='Si el cliente se registra con este email, las reservas se vinculan automáticamente.'
          icon={<MailIcon size={18} />}
        />
        <button
          type='button'
          onClick={() => handleSwitchMode('search')}
          className='text-sm text-(--color-primary) hover:underline self-start touch-target px-1 -m-1'
        >
          Buscar cliente existente
        </button>
      </div>
    )
  }

  // Modo búsqueda
  return (
    <div className='flex flex-col gap-3'>
      <Input
        label='Cliente'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder='Buscar por nombre, teléfono o email…'
        icon={<SearchIcon size={18} />}
        hint='Busca un cliente existente o crea uno nuevo.'
      />

      {searching && (
        <p className='text-sm text-(--color-text-muted) px-1'>Buscando…</p>
      )}

      {!searching && query.trim().length >= 2 && results.length === 0 && (
        <div className='flex flex-col gap-2'>
          <p className='text-sm text-(--color-text-muted) px-1'>
            No se encontraron clientes.
          </p>
          <Button
            variant='secondary'
            size='sm'
            onClick={() => handleSwitchMode('new')}
            className='self-start'
          >
            <PlusIcon size={16} />
            Crear nuevo cliente
          </Button>
        </div>
      )}

      {results.length > 0 && (
        <div className='flex flex-col gap-1.5 max-h-64 overflow-y-auto'>
          {results.map((client, index) => (
            <button
              key={client.id ?? `user-${client.user_id ?? index}`}
              type='button'
              onClick={() => handleSelect(client)}
              className='flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-elevated hover:border-(--color-primary) hover:bg-(--color-primary)/5 transition-all duration-200 text-left touch-target'
            >
              <div className='w-9 h-9 rounded-full bg-surface-inset flex items-center justify-center text-(--color-text-muted) shrink-0'>
                <UserIcon size={18} />
              </div>
              <div className='min-w-0 flex-1'>
                <p className='font-medium text-sm text-(--color-text) truncate'>
                  {client.name}
                </p>
                <p className='text-xs text-(--color-text-muted) truncate'>
                  {client.phone && <span className='nums'>{client.phone}</span>}
                  {client.phone && client.email && <span> · </span>}
                  {client.email && <span>{client.email}</span>}
                </p>
              </div>
              {client.has_account && (
                <span className='text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full shrink-0'>
                  Con cuenta
                </span>
              )}
              {!client.has_account && client.id && (
                <span className='text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full shrink-0'>
                  Invitado
                </span>
              )}
              {!client.id && (
                <span className='text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full shrink-0'>
                  Registrado
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {query.trim().length < 2 && (
        <button
          type='button'
          onClick={() => handleSwitchMode('new')}
          className='text-sm text-(--color-primary) hover:underline self-start touch-target px-1 -m-1'
        >
          Crear nuevo cliente
        </button>
      )}
    </div>
  )
}
