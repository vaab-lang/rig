import type { ReactNode } from 'react'

type IconProps = { size?: number }

function Svg({ size = 20, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function IconHome(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </Svg>
  )
}

export function IconTable(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 4v16" />
    </Svg>
  )
}

export function IconSql(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 7h8M8 12h5M8 17h7" />
      <rect x="3" y="4" width="18" height="16" rx="2" />
    </Svg>
  )
}

export function IconDatabase(props: IconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </Svg>
  )
}

export function IconAuth(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Svg>
  )
}

export function IconStorage(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16v4H4zM4 13h16v4H4z" />
      <path d="M8 9h.01M8 15h.01" />
    </Svg>
  )
}

export function IconApi(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 8 3 12l4 4M17 8l4 4-4 4M14 6l-4 12" />
    </Svg>
  )
}

export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.2 6.2l1.4 1.4M18.4 16.4l1.4 1.4M3 12h2M19 12h2M4.2 17.8l1.4-1.4M18.4 7.6l1.4-1.4" />
    </Svg>
  )
}

export function IconDocs(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 4h7l4 4v12H7z" />
      <path d="M14 4v4h4M9 13h6M9 17h4" />
    </Svg>
  )
}
