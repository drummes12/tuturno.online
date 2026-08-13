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

/* Court / Field — for courts */
export function CourtIcon(props: IconProps) {
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
