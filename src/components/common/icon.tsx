import type { SVGProps } from 'react'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'strokeWidth'> & {
  size?: number
  strokeWidth?: number
}

function base({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props
  }
}

/* Calendar — for availability, dates */
export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x='3' y='4' width='18' height='18' rx='2' />
      <line x1='16' y1='2' x2='16' y2='6' />
      <line x1='8' y1='2' x2='8' y2='6' />
      <line x1='3' y1='10' x2='21' y2='10' />
    </svg>
  )
}

/* Clock — for time slots, duration */
export function ClockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx='12' cy='12' r='10' />
      <polyline points='12 6 12 12 16 14' />
    </svg>
  )
}

/* Resource / space — for bookable resources */
export function ResourceIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x='3' y='5' width='18' height='14' rx='1' />
      <line x1='12' y1='5' x2='12' y2='19' />
      <circle cx='12' cy='12' r='3' />
    </svg>
  )
}

/* Check — for confirm, success */
export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <polyline points='20 6 9 17 4 12' />
    </svg>
  )
}

/* X — for reject, close */
export function XIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1='18' y1='6' x2='6' y2='18' />
      <line x1='6' y1='6' x2='18' y2='18' />
    </svg>
  )
}

/* Arrow left — for back navigation */
export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1='19' y1='12' x2='5' y2='12' />
      <polyline points='12 19 5 12 12 5' />
    </svg>
  )
}

/* Arrow right — for forward */
export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1='5' y1='12' x2='19' y2='12' />
      <polyline points='12 5 19 12 12 19' />
    </svg>
  )
}

/* User — for profile, client */
export function UserIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
      <circle cx='12' cy='7' r='4' />
    </svg>
  )
}

/* Phone — for contact info */
export function PhoneIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z' />
    </svg>
  )
}

/* Mail — for email, notifications */
export function MailIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x='2' y='4' width='20' height='16' rx='2' />
      <path d='m22 7-10 5L2 7' />
    </svg>
  )
}

/* Settings / Gear — for config */
export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx='12' cy='12' r='3' />
      <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' />
    </svg>
  )
}

/* Layout / Dashboard — for admin home */
export function LayoutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x='3' y='3' width='7' height='7' rx='1' />
      <rect x='14' y='3' width='7' height='7' rx='1' />
      <rect x='14' y='14' width='7' height='7' rx='1' />
      <rect x='3' y='14' width='7' height='7' rx='1' />
    </svg>
  )
}

/* List — for reservations list */
export function ListIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1='8' y1='6' x2='21' y2='6' />
      <line x1='8' y1='12' x2='21' y2='12' />
      <line x1='8' y1='18' x2='21' y2='18' />
      <line x1='3' y1='6' x2='3.01' y2='6' />
      <line x1='3' y1='12' x2='3.01' y2='12' />
      <line x1='3' y1='18' x2='3.01' y2='18' />
    </svg>
  )
}

/* Time / Schedule — for business hours */
export function ScheduleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx='12' cy='12' r='10' />
      <polyline points='12 6 12 12 16 14' />
    </svg>
  )
}

/* Log out — for sign out */
export function LogOutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
      <polyline points='16 17 21 12 16 7' />
      <line x1='21' y1='12' x2='9' y2='12' />
    </svg>
  )
}

/* Log in — for sign in */
export function LogInIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d='M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4' />
      <polyline points='10 17 15 12 10 7' />
      <line x1='15' y1='12' x2='3' y2='12' />
    </svg>
  )
}

/* Hourglass — for pending, waiting */
export function HourglassIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d='M6 3h12M6 21h12M6 3v18M18 3v18' />
      <path d='M6 8a6 6 0 0 0 12 0' />
      <path d='M6 16a6 6 0 0 1 12 0' />
    </svg>
  )
}

/* Inbox / Empty — for empty states */
export function InboxIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <polyline points='22 12 16 12 14 15 10 15 8 12 2 12' />
      <path d='M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z' />
    </svg>
  )
}

/* Calendar plus — for new reservation */
export function CalendarPlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x='3' y='4' width='18' height='18' rx='2' />
      <line x1='16' y1='2' x2='16' y2='6' />
      <line x1='8' y1='2' x2='8' y2='6' />
      <line x1='3' y1='10' x2='21' y2='10' />
      <line x1='12' y1='14' x2='12' y2='18' />
      <line x1='10' y1='16' x2='14' y2='16' />
    </svg>
  )
}

/* Plus — for adding items */
export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1='12' y1='5' x2='12' y2='19' />
      <line x1='5' y1='12' x2='19' y2='12' />
    </svg>
  )
}

/* Trash — for deleting items */
export function TrashIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <polyline points='3 6 5 6 21 6' />
      <path d='M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6' />
      <path d='M10 11v6' />
      <path d='M14 11v6' />
      <path d='M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2' />
    </svg>
  )
}

/* Chevron left — for date navigation */
export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <polyline points='15 18 9 12 15 6' />
    </svg>
  )
}

/* Chevron right — for date navigation */
export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <polyline points='9 18 15 12 9 6' />
    </svg>
  )
}

/* Alert triangle — for warnings, important notices */
export function AlertIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d='M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />
      <line x1='12' y1='9' x2='12' y2='13' />
      <line x1='12' y1='17' x2='12.01' y2='17' />
    </svg>
  )
}

/* Info — for informational notices */
export function InfoIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx='12' cy='12' r='10' />
      <line x1='12' y1='16' x2='12' y2='12' />
      <line x1='12' y1='8' x2='12.01' y2='8' />
    </svg>
  )
}

/* Sun — for morning shift */
export function SunIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx='12' cy='12' r='4' />
      <path d='M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41' />
    </svg>
  )
}

/* Cloud sun — for afternoon shift */
export function CloudSunIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d='M12 2v2M5.64 5.64l1.41 1.41M2 12h2M19.07 5.64l-1.41 1.41M22 12h-2' />
      <circle cx='10' cy='10' r='3' />
      <path d='M17 15.5a5 5 0 0 0-9.5-1.5 3.5 3.5 0 0 0 0 7h9a3 3 0 0 0 0-5.5z' />
    </svg>
  )
}

/* Moon — for evening/night shift */
export function MoonIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' />
    </svg>
  )
}

/* Coffee — for afternoon break/shift */
export function CoffeeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d='M18 8h1a4 4 0 0 1 0 8h-1' />
      <path d='M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z' />
      <line x1='6' y1='2' x2='6' y2='4' />
      <line x1='10' y1='2' x2='10' y2='4' />
      <line x1='14' y1='2' x2='14' y2='4' />
    </svg>
  )
}

/* WhatsApp — for contact buttons */
export function WhatsAppIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill='currentColor' stroke='none'>
      <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
    </svg>
  )
}

/* Store — for business info */
export function StoreIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d='M3 9l1-5h16l1 5' />
      <path d='M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9' />
      <path d='M9 21V12h6v9' />
    </svg>
  )
}

/* MapPin — for location/timezone */
export function MapPinIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' />
      <circle cx='12' cy='10' r='3' />
    </svg>
  )
}

/* Timer — for gap/buffer between turns */
export function TimerIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx='12' cy='13' r='8' />
      <path d='M12 9v4l2 2' />
      <path d='M9 2h6' />
    </svg>
  )
}

/* ExternalLink — for "open in new tab" actions */
export function ExternalLinkIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d='M15 3h6v6' />
      <path d='M10 14 21 3' />
      <path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' />
    </svg>
  )
}

/* Pencil/Edit — for edit actions */
export function EditIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
      <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
    </svg>
  )
}

/* Lock — for read-only / restricted actions */
export function LockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
      <path d='M7 11V7a5 5 0 0 1 10 0v4' />
    </svg>
  )
}

/* MessageSquare — for notes/messages */
export function MessageIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
    </svg>
  )
}

/* Search — for client search */
export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx='11' cy='11' r='8' />
      <line x1='21' y1='21' x2='16.65' y2='16.65' />
    </svg>
  )
}

/* HelpCircle — for tutorial/guide button */
export function HelpIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx='12' cy='12' r='10' />
      <path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' />
      <line x1='12' y1='17' x2='12.01' y2='17' />
    </svg>
  )
}

/* Sparkles — for demo/featured CTA */
export function SparklesIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d='M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z' />
      <path d='M5 3v4' />
      <path d='M19 17v4' />
      <path d='M3 5h4' />
      <path d='M17 19h4' />
    </svg>
  )
}
