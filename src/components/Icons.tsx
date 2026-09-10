import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconHome = (p: IconProps) => (
  <Base {...p}>
    <path d="M3.5 10.4 12 3.8l8.5 6.6" />
    <path d="M5.6 9.2V19a1.4 1.4 0 0 0 1.4 1.4h10a1.4 1.4 0 0 0 1.4-1.4V9.2" />
    <path d="M9.6 20.4v-5.2h4.8v5.2" />
  </Base>
)

export const IconCalendar = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.4" y="5.2" width="17.2" height="15.4" rx="3.4" />
    <path d="M3.4 9.8h17.2M8.4 3.4v3.4M15.6 3.4v3.4" />
  </Base>
)

export const IconSparkles = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.6l1.55 4.3 4.3 1.55-4.3 1.55L12 15.3l-1.55-4.3L6.15 9.45l4.3-1.55z" />
    <path d="M18.4 15.2l.72 2 2 .72-2 .72-.72 2-.72-2-2-.72 2-.72z" />
    <path d="M5.4 14.4l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5z" />
  </Base>
)

export const IconUser = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8.6" r="3.7" />
    <path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0" />
  </Base>
)

export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5.4v13.2M5.4 12h13.2" />
  </Base>
)

export const IconChevronLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="M14.6 5.8 8.4 12l6.2 6.2" />
  </Base>
)

export const IconChevronRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M9.4 5.8 15.6 12l-6.2 6.2" />
  </Base>
)

export const IconClose = (p: IconProps) => (
  <Base {...p}>
    <path d="M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6" />
  </Base>
)

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12.8 9.6 17.4 19 8" />
  </Base>
)

export const IconTrash = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.6 7.4h14.8M9.4 7.4V5.6a1.2 1.2 0 0 1 1.2-1.2h2.8a1.2 1.2 0 0 1 1.2 1.2v1.8" />
    <path d="M6.6 7.4 7.5 19a1.4 1.4 0 0 0 1.4 1.3h6.2a1.4 1.4 0 0 0 1.4-1.3l.9-11.6" />
  </Base>
)

export const IconEdit = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.8 19.2h3.1L18.4 8.7a2.2 2.2 0 0 0-3.1-3.1L4.8 16.1z" />
    <path d="M14.2 6.8 17.2 9.8" />
  </Base>
)

export const IconMapPin = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21s6.4-5.6 6.4-10.2A6.4 6.4 0 0 0 5.6 10.8C5.6 15.4 12 21 12 21z" />
    <circle cx="12" cy="10.6" r="2.4" />
  </Base>
)

export const IconClock = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 7.4V12l3.2 2" />
  </Base>
)

export const IconWallet = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.4" y="6.4" width="17.2" height="12.4" rx="3" />
    <path d="M3.4 10.4h17.2" />
    <circle cx="16.4" cy="14.6" r="1.1" fill="currentColor" stroke="none" />
  </Base>
)

export const IconNote = (p: IconProps) => (
  <Base {...p}>
    <path d="M6.4 3.8h8.2l4 4v12.4H6.4z" />
    <path d="M14.4 3.8v4.2h4.2M9.4 12.6h6M9.4 16h4" />
  </Base>
)

export const IconCopy = (p: IconProps) => (
  <Base {...p}>
    <rect x="8.6" y="8.6" width="11" height="11" rx="2.6" />
    <path d="M15.4 8.6V6.4a2.6 2.6 0 0 0-2.6-2.6H6.4a2.6 2.6 0 0 0-2.6 2.6v6.4a2.6 2.6 0 0 0 2.6 2.6h2.2" />
  </Base>
)

export const IconShare = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 15.4V4.2M8.4 7.6 12 4l3.6 3.6" />
    <path d="M5.4 13.4v4.8a2 2 0 0 0 2 2h9.2a2 2 0 0 0 2-2v-4.8" />
  </Base>
)

export const IconRefresh = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 11.4A8 8 0 0 0 6.3 6.6L4 8.9" />
    <path d="M4 4.6v4.3h4.3" />
    <path d="M4 12.6a8 8 0 0 0 13.7 4.8L20 15.1" />
    <path d="M20 19.4v-4.3h-4.3" />
  </Base>
)

export const IconLogout = (p: IconProps) => (
  <Base {...p}>
    <path d="M14.4 4.6H6.6a2 2 0 0 0-2 2v10.8a2 2 0 0 0 2 2h7.8" />
    <path d="M16.4 8.6 20 12l-3.6 3.4M9.6 12H20" />
  </Base>
)

export const IconGift = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.6" y="8.6" width="16.8" height="4" rx="1.4" />
    <path d="M5.2 12.6v6.2a1.6 1.6 0 0 0 1.6 1.6h10.4a1.6 1.6 0 0 0 1.6-1.6v-6.2M12 8.6v11.8" />
    <path d="M12 8.6S10.8 4 8.6 4a2.3 2.3 0 0 0 0 4.6zM12 8.6S13.2 4 15.4 4a2.3 2.3 0 0 1 0 4.6z" />
  </Base>
)

export const IconLink = (p: IconProps) => (
  <Base {...p}>
    <path d="M10.4 13.6a3.6 3.6 0 0 0 5.1 0l2.6-2.6a3.6 3.6 0 0 0-5.1-5.1l-1.2 1.2" />
    <path d="M13.6 10.4a3.6 3.6 0 0 0-5.1 0l-2.6 2.6a3.6 3.6 0 0 0 5.1 5.1l1.2-1.2" />
  </Base>
)

export const IconQr = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.8" y="3.8" width="6.4" height="6.4" rx="1.6" />
    <rect x="13.8" y="3.8" width="6.4" height="6.4" rx="1.6" />
    <rect x="3.8" y="13.8" width="6.4" height="6.4" rx="1.6" />
    <path d="M13.8 13.8h2.6v2.6h-2.6zM17.6 17.6h2.6v2.6h-2.6zM13.8 20.2h1.2M20.2 13.8v1.2" />
  </Base>
)

export const IconHeart = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 20.2S3.8 15.1 3.8 9.7a4.4 4.4 0 0 1 8.2-2.3 4.4 4.4 0 0 1 8.2 2.3c0 5.4-8.2 10.5-8.2 10.5z" />
  </Base>
)

export const IconLock = (p: IconProps) => (
  <Base {...p}>
    <rect x="4.8" y="10.2" width="14.4" height="9.8" rx="2.6" />
    <path d="M8.4 10.2V7.8a3.6 3.6 0 0 1 7.2 0v2.4" />
  </Base>
)

export const IconMail = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.4" y="5.4" width="17.2" height="13.2" rx="3" />
    <path d="m4.8 8 6.2 4.4a1.8 1.8 0 0 0 2 0L19.2 8" />
  </Base>
)

export const IconWarn = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 4.2 3.4 19.4h17.2z" />
    <path d="M12 10v4M12 16.6v.6" />
  </Base>
)
