function tablerIcon(body: string, className: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline ${className}"><path stroke="none" d="M0 0h24v24H0z" fill="none" />${body}</svg>`
}

export function calendarIcon(): string {
  return tablerIcon(
    '<path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12" /><path d="M16 3l0 4" /><path d="M8 3l0 4" /><path d="M4 11l16 0" />',
    'icon-tabler-calendar-event'
  )
}

export function lockIcon(): string {
  return tablerIcon(
    '<path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6" /><path d="M8 11v-4a4 4 0 1 1 8 0v4" />',
    'icon-tabler-lock'
  )
}

export function whatsappIcon(): string {
  return tablerIcon(
    '<path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" /><path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" />',
    'icon-tabler-brand-whatsapp'
  )
}

export function buildingStoreIcon(): string {
  return tablerIcon(
    '<path d="M3 21h18" /><path d="M3 10l2 -5h14l2 5" /><path d="M5 10v11" /><path d="M19 10v11" /><path d="M9 21v-6h6v6" />',
    'icon-tabler-building-store'
  )
}

export function layoutGridIcon(): string {
  return tablerIcon(
    '<rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" />',
    'icon-tabler-layout-grid'
  )
}

export function circleCheckIcon(): string {
  return tablerIcon(
    '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M9 12l2 2l4 -4" />',
    'icon-tabler-circle-check'
  )
}

export function userCircleIcon(): string {
  return tablerIcon(
    '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />',
    'icon-tabler-user-circle'
  )
}

export function mailIcon(): string {
  return tablerIcon(
    '<rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6l9 -6" />',
    'icon-tabler-mail'
  )
}

export function alertCircleIcon(): string {
  return tablerIcon(
    '<circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16v.01" />',
    'icon-tabler-alert-circle'
  )
}

export function categoryIcon(): string {
  return tablerIcon(
    '<path d="M4 4h6v6h-6z" /><path d="M14 4h6v6h-6z" /><path d="M4 14h6v6h-6z" /><path d="M14 14h6v6h-6z" />',
    'icon-tabler-category'
  )
}

export function mapPinIcon(): string {
  return tablerIcon(
    '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /><path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0" />',
    'icon-tabler-map-pin'
  )
}

export function phoneIcon(): string {
  return tablerIcon(
    '<path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -14 -14a2 2 0 0 1 2 -2" />',
    'icon-tabler-phone'
  )
}

export function noteIcon(): string {
  return tablerIcon(
    '<path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M13 20l7 -7" /><path d="M13 20v-6a1 1 0 0 1 1 -1h6v-7a2 2 0 0 0 -2 -2h-12a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7" />',
    'icon-tabler-note'
  )
}

export function externalLinkIcon(): string {
  return tablerIcon(
    '<path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" /><path d="M11 13l8 -8" /><path d="M15 5h4v4" />',
    'icon-tabler-external-link'
  )
}

export function plusIcon(): string {
  return tablerIcon(
    '<path d="M12 5v14" /><path d="M5 12h14" />',
    'icon-tabler-plus'
  )
}

export function xIcon(): string {
  return tablerIcon(
    '<path d="M18 6l-12 12" /><path d="M6 6l12 12" />',
    'icon-tabler-x'
  )
}

export function minusIcon(): string {
  return tablerIcon('<path d="M5 12h14" />', 'icon-tabler-minus')
}

export function clockIcon(): string {
  return tablerIcon(
    '<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />',
    'icon-tabler-clock'
  )
}

export function shieldCheckIcon(): string {
  return tablerIcon(
    '<path d="M12 3l7 4v5c0 4.5 -3 7.5 -7 9c-4 -1.5 -7 -4.5 -7 -9v-5z" /><path d="M9 12l2 2l4 -4" />',
    'icon-tabler-shield-check'
  )
}

export function helpCircleIcon(): string {
  return tablerIcon(
    '<circle cx="12" cy="12" r="9" /><path d="M12 16v.01" /><path d="M12 13a2 2 0 1 0 -2 -2" />',
    'icon-tabler-help-circle'
  )
}

export function infoCircleIcon(): string {
  return tablerIcon(
    '<circle cx="12" cy="12" r="9" /><path d="M12 8v.01" /><path d="M12 12v4" />',
    'icon-tabler-info-circle'
  )
}
