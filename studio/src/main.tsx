import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { applyTheme, readTheme } from './lib/prefs'
import './index.css'

applyTheme(readTheme())

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

const STUDIO_SECTIONS = new Set([
  'editor',
  'sql',
  'database',
  'auth',
  'storage',
  'functions',
  'realtime',
  'advisors',
  'observability',
  'logs',
  'api',
  'integrations',
  'settings',
])

function detectBasename(): string {
  if (typeof window === 'undefined') {
    return import.meta.env.BASE_URL.replace(/\/$/, '') || '/'
  }
  const parts = window.location.pathname.split('/').filter(Boolean)
  const sectionIdx = parts.findIndex((part) => STUDIO_SECTIONS.has(part))
  if (sectionIdx === 0) return '/'
  if (sectionIdx > 0) return '/' + parts.slice(0, sectionIdx).join('/')
  return parts.length > 0 ? '/' + parts.join('/') : '/'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={detectBasename()}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
