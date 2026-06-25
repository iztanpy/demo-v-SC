import { useEffect, useState } from 'react'
import { INCIDENTS, SPEED } from './data/feed'

// Drives Panel 2 timing. Sequential: Resolution runs on its OWN clock, started when the presenter
// folds the Documents section (docs are already fully parsed by then). Every card SPAWNS at the same
// time (after a brief beat), but each runs its OWN matching duration, so they resolve STAGGERED.
// Outcomes live in ResolutionPanel.
export type ResPhase = 'pending' | 'matching' | 'resolved'
const APPEAR = 250 * SPEED  // brief beat after the section opens — then every card appears together

// per-incident matching-theater duration (ms, before the SPEED multiplier) — tune the stagger here
const MATCH_MS: Record<string, number> = {
  'INC-0537': 1900, // hero — longest (the focal exception)
  'INC-0488': 900,
  'INC-0501': 1300,
  'INC-0455': 1100,
  'INC-0472': 800,
}
const MATCH_DEFAULT = 1200

interface Win { id: string; start: number; end: number }
const WINS: Win[] = INCIDENTS.map((i) => ({
  id: i.id, start: APPEAR, end: APPEAR + (MATCH_MS[i.id] ?? MATCH_DEFAULT) * SPEED,
}))
export const RES_END = Math.max(...WINS.map((w) => w.end))

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// `active` — true once the Resolution section is triggered (the presenter folded Documents).
export function useResolution(active: boolean, runId: number): Map<string, ResPhase> {
  const [now, setNow] = useState(-1)

  useEffect(() => {
    if (!active) { setNow(-1); return }
    if (prefersReducedMotion()) { setNow(RES_END + 1); return }
    setNow(0)
    const bounds = Array.from(new Set(WINS.flatMap((w) => [w.start, w.end])))
      .filter((t) => t > 0).sort((a, b) => a - b)
    const timers = bounds.map((t) => setTimeout(() => setNow(t), t))
    return () => timers.forEach(clearTimeout)
  }, [active, runId])

  const map = new Map<string, ResPhase>()
  for (const w of WINS) {
    let p: ResPhase = 'pending'
    if (now < 0 || now < w.start) p = 'pending'
    else if (now < w.end) p = 'matching'
    else p = 'resolved'
    map.set(w.id, p)
  }
  return map
}
