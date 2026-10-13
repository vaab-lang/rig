import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchHealth, type Health } from '../lib/api'
import {
  IconApi,
  IconAuth,
  IconDatabase,
  IconDocs,
  IconHome,
  IconSettings,
  IconSql,
  IconStorage,
  IconTable,
} from '../lib/icons'

const NAV = [
  { to: '/', tip: 'Home', icon: IconHome, end: true },
  { to: '/editor', tip: 'Table Editor', icon: IconTable },
  { to: '/sql', tip: 'SQL Editor', icon: IconSql },
  { to: '/database', tip: 'Database', icon: IconDatabase },
  { to: '/auth', tip: 'Authentication', icon: IconAuth },
  { to: '/storage', tip: 'Storage', icon: IconStorage },
  { to: '/api', tip: 'API Docs', icon: IconApi },
  { to: '/settings', tip: 'Project Settings', icon: IconSettings },
] as const

function titleFor(pathname: string): string {
  if (pathname.startsWith('/editor')) return 'Table Editor'
  if (pathname.startsWith('/sql')) return 'SQL Editor'
  if (pathname.startsWith('/database')) return 'Database'
  if (pathname.startsWith('/auth')) return 'Authentication'
  if (pathname.startsWith('/storage')) return 'Storage'
  if (pathname.startsWith('/api')) return 'API Docs'
  if (pathname.startsWith('/settings')) return 'Project Settings'
  return 'Project Overview'
}

export function Shell() {
  const location = useLocation()
  const [health, setHealth] = useState<Health | null>(null)
  const [healthError, setHealthError] = useState(false)

  useEffect(() => {
    let alive = true
    fetchHealth()
      .then((value) => {
        if (alive) {
          setHealth(value)
          setHealthError(false)
        }
      })
      .catch(() => {
        if (alive) setHealthError(true)
      })
    return () => {
      alive = false
    }
  }, [])

  const statusClass = healthError ? 'down' : health?.ok ? '' : 'warn'

  return (
    <div className="app-shell">
      <aside className="icon-rail">
        <div className="brand" title="rig studio">
          <img src="/rig-mark.svg" alt="rig" />
        </div>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
            className={({ isActive }) => `rail-btn${isActive ? ' active' : ''}`}
            data-tip={item.tip}
          >
            <item.icon />
          </NavLink>
        ))}
        <div className="rail-spacer" />
        <a
          className="rail-btn"
          href="https://github.com/vaab-lang/rig"
          target="_blank"
          rel="noreferrer"
          data-tip="Documentation"
        >
          <IconDocs />
        </a>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="crumb">
            <strong>default</strong>
            <span>/</span>
            <span>{titleFor(location.pathname)}</span>
          </div>
          <div className="top-actions">
            <span className={`pill ${statusClass}`}>
              <span className="dot" />
              {healthError ? 'API offline' : health ? `${health.name} ${health.version}` : 'checking…'}
            </span>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
