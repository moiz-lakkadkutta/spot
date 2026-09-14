import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import type { ExerciseId, Frame, Framing as FramingT, Plan } from '@spot/contracts'
import { SessionMachine, checkFraming } from '@spot/heuristics'
import { Rail, Screen, T } from './components'
import { Home } from './screens/Home'
import { Framing } from './screens/Framing'
import { Exercise } from './screens/Exercise'
import { Summary } from './screens/Summary'
import { strings } from './strings'
export { tokens } from './theme/tokens'
export * from './components'

type Route = { name: 'home' } | { name: 'framing' } | { name: 'exercise' } | { name: 'rest' } | { name: 'summary' }

/**
 * Root: state router + the session machine. Frames arrive from the platform entry (Socket.IO join in apps/expo|vega) via `onFrame`.
 * All pose math is in packages/heuristics (tested against recorded landmark fixtures).
 */
export function Root({ apiBaseUrl, scale, deviceId = 'dev-device', frames }: { apiBaseUrl: string; scale: number; deviceId?: string; frames?: (cb: (f: Frame) => void) => () => void }) {
  const [route, setRoute] = useState<Route>({ name: 'home' })
  const [plan, setPlan] = useState<Plan | null>(null)
  const [framing, setFraming] = useState<FramingT | null>(null)
  const [view, setView] = useState({ reps: 0, rangePct: 0, inRange: false, cue: null as string | null })
  const [offline, setOffline] = useState(false)
  const machine = useRef<SessionMachine | null>(null)
  const api = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const r = await fetch(apiBaseUrl + path, { ...init, headers: { 'content-type': 'application/json', 'x-device-id': deviceId } })
    const j = (await r.json()) as { success: boolean; data: T }; if (!j.success) throw new Error('api'); return j.data
  }, [apiBaseUrl, deviceId])
  useEffect(() => { api<Plan>('/me/today').then((p) => { setPlan(p); setOffline(false) }).catch(() => setOffline(true)) }, [api])

  useEffect(() => {
    if (!frames) return
    return frames((f) => {
      if (route.name === 'framing') setFraming(checkFraming(f))
      if (route.name === 'exercise' && machine.current) {
        const out = machine.current.frame(f)
        setView({ reps: out.reps, rangePct: out.rangePct, inRange: out.inRange, cue: out.cue ? strings.cues[out.cue as keyof typeof strings.cues] : null })
        if (out.setDone) setRoute(machine.current.hasNext() ? { name: 'rest' } : { name: 'summary' })
      }
    })
  }, [frames, route.name])

  const start = () => { if (!plan) return; machine.current = new SessionMachine(plan); setRoute({ name: 'framing' }) }
  const rail = <Rail expanded={false} current={route.name} items={[{ key: 'home', label: strings.rail.today }, { key: 'programmes', label: strings.rail.programmes }, { key: 'history', label: strings.rail.history }, { key: 'settings', label: strings.rail.settings }]} onSelect={() => setRoute({ name: 'home' })} />
  if (offline) return <Screen><View style={{ flex: 1, justifyContent: 'center' }} accessibilityLiveRegion="polite"><T variant="display">{strings.offline}</T></View></Screen>
  const cur = machine.current?.current()
  switch (route.name) {
    case 'framing': return <Screen><Framing camera={cur?.spec.camera ?? 'side'} framing={framing} phone={{ name: 'Phone', pct: 100 }} onSkip={() => setRoute({ name: 'exercise' })} onManual={() => setRoute({ name: 'exercise' })} /></Screen>
    case 'exercise': return cur ? <Screen><Exercise exerciseId={cur.spec.id as ExerciseId} setIndex={cur.setIndex + 1} sets={cur.spec.sets} reps={view.reps} target={cur.spec.reps} rangePct={view.rangePct} inRange={view.inRange} cue={view.cue} paused={false} /></Screen> : null
    case 'rest': return <Screen><View style={{ flex: 1, justifyContent: 'center', gap: 24 }}><T variant="display">{strings.rest.title}</T><T variant="body" color="#A9B3B0">{strings.rest.next}: {cur ? strings.names[cur.spec.id as ExerciseId] : ''}</T></View></Screen>
    case 'summary': return <Screen><Summary results={machine.current?.results() ?? []} comparison={null} early={false} onDone={() => setRoute({ name: 'home' })} onShare={() => {}} /></Screen>
    default: return <Screen rail={rail}><Home plan={plan} phonePaired={!!frames} onStart={start} onConnect={() => {}} /></Screen>
  }
  void scale
}
