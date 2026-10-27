import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DataGrid } from '@/components/DataGrid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { fetchStudioTables } from '@/lib/platform-api'
import { useRoleStore } from '@/lib/role-store'
import { EmptyState, ErrorBanner, PageHeader } from '@/pages/home/ui'

type RealtimeEvent = {
  ts: string
  type: string
  payload: string
}

const REALTIME_LINKS = [
  { to: '/realtime', label: 'Inspector', end: true },
  { to: '/realtime/policies', label: 'Policies' },
  { to: '/realtime/settings', label: 'Settings' },
]

export function RealtimePage() {
  const { pathname } = useLocation()
  const pane = pathname.includes('/policies') ? 'policies' : pathname.includes('/settings') ? 'settings' : 'inspector'

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Realtime" detail="Inspect channels and postgres changes on this session." />
      <div className="mb-4 flex flex-wrap gap-1">
        {REALTIME_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-elevated'}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
      {pane === 'policies' ? <RealtimePolicies /> : pane === 'settings' ? <RealtimeSettings /> : <RealtimeInspector />}
    </div>
  )
}

function realtimeSocketUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/realtime/v1/websocket`
}

function RealtimeInspector() {
  const role = useRoleStore((state) => state.role)
  const tables = useQuery({ queryKey: ['studio', 'tables', role], queryFn: () => fetchStudioTables(role) })
  const [channel, setChannel] = useState('room')
  const [joined, setJoined] = useState(false)
  const [payload, setPayload] = useState('{"event":"ping"}')
  const [listenTable, setListenTable] = useState('')
  const [events, setEvents] = useState<RealtimeEvent[]>([])
  const socketRef = useRef<WebSocket | null>(null)

  function push(type: string, next: string) {
    setEvents((current) => [{ ts: new Date().toISOString(), type, payload: next }, ...current].slice(0, 50))
  }

  useEffect(() => {
    if (!joined) {
      socketRef.current?.close()
      socketRef.current = null
      return
    }
    const socket = new WebSocket(realtimeSocketUrl())
    socketRef.current = socket
    socket.onmessage = (event) => {
      setEvents((current) =>
        [{ ts: new Date().toISOString(), type: 'message', payload: String(event.data) }, ...current].slice(0, 50),
      )
    }
    socket.onerror = () => {
      setEvents((current) =>
        [{ ts: new Date().toISOString(), type: 'error', payload: 'socket error' }, ...current].slice(0, 50),
      )
    }
    return () => {
      socket.close()
      if (socketRef.current === socket) socketRef.current = null
    }
  }, [joined])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="rt-channel">Channel</Label>
          <div className="flex gap-2">
            <Input id="rt-channel" value={channel} onChange={(event) => setChannel(event.target.value)} />
            <Button
              type="button"
              variant={joined ? 'outline' : 'default'}
              onClick={() => {
                setJoined((value) => !value)
                push(joined ? 'leave' : 'join', channel)
                if (joined) setEvents([])
              }}
            >
              {joined ? 'Leave' : 'Join'}
            </Button>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rt-payload">Broadcast</Label>
          <Textarea id="rt-payload" className="font-mono text-[13px]" value={payload} onChange={(event) => setPayload(event.target.value)} />
          <Button
            type="button"
            disabled={!joined}
            onClick={() => {
              socketRef.current?.send(payload)
              push('broadcast', payload)
            }}
          >
            Send
          </Button>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rt-table">Listen</Label>
          <select
            id="rt-table"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={listenTable}
            onChange={(event) => {
              setListenTable(event.target.value)
              if (event.target.value) push('listen', event.target.value)
            }}
          >
            <option value="">Select a table</option>
            {(tables.data ?? []).map((table) => (
              <option key={table.name} value={table.name}>
                {table.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <h2 className="mb-2 text-sm font-medium">Events</h2>
        {events.length === 0 ? (
          <EmptyState message="No events yet. Join a channel." />
        ) : (
          <ul className="grid gap-2">
            {events.map((event, index) => (
              <li key={`${event.ts}-${index}`} className="rounded-md border border-border bg-surface px-3 py-2">
                <div className="text-xs text-muted-foreground">
                  {event.ts} · {event.type}
                </div>
                <pre className="mt-1 overflow-auto font-mono text-[13px]">{event.payload}</pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function RealtimePolicies() {
  const rows = useMemo(() => [] as Record<string, string>[], [])
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">Realtime policies are not mounted on this gateway.</p>
      <DataGrid columns={['name', 'table', 'command']} rows={rows} empty="No realtime policies" />
    </div>
  )
}

function readRealtimePrefs() {
  try {
    const raw = window.localStorage.getItem('rig.studio.realtime')
    if (!raw) return { enabled: true, maxPresence: '10', privateChannels: false }
    const parsed = JSON.parse(raw) as { enabled?: boolean; maxPresence?: string; privateChannels?: boolean }
    return {
      enabled: parsed.enabled !== false,
      maxPresence: parsed.maxPresence ?? '10',
      privateChannels: Boolean(parsed.privateChannels),
    }
  } catch {
    return { enabled: true, maxPresence: '10', privateChannels: false }
  }
}

function RealtimeSettings() {
  const initial = readRealtimePrefs()
  const [enabled, setEnabled] = useState(initial.enabled)
  const [maxPresence, setMaxPresence] = useState(initial.maxPresence)
  const [privateChannels, setPrivateChannels] = useState(initial.privateChannels)

  return (
    <div className="grid max-w-lg gap-4">
      <ErrorBanner error={null} />
      <label className="flex items-center justify-between gap-3 text-sm">
        Enable
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </label>
      <div className="grid gap-1.5">
        <Label htmlFor="rt-presence">Max presence</Label>
        <Input id="rt-presence" value={maxPresence} onChange={(event) => setMaxPresence(event.target.value)} />
      </div>
      <label className="flex items-center justify-between gap-3 text-sm">
        Private channels
        <Switch checked={privateChannels} onCheckedChange={setPrivateChannels} />
      </label>
      <Button
        type="button"
        onClick={() => {
          window.localStorage.setItem(
            'rig.studio.realtime',
            JSON.stringify({ enabled, maxPresence, privateChannels }),
          )
          toast.success('Saved')
        }}
      >
        Save
      </Button>
    </div>
  )
}
