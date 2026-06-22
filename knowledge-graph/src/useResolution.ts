import { useEffect, useState } from 'react'
import { FEED, INCIDENTS, SPEED } from './data/feed'

// Drives Panel 2 timing: each incident is resolved against the KG AFTER its documents finish
// extracting. Outcomes (match / re-weight / gap) live in the per-incident defs in ResolutionPanel.
export type ResPhase = 'pending' | 'matching' | 'resolved'
const SLIDE_MS = 420
const MIN_MATCH = 1500 // floor so the matching theater is always visible

// PARALLEL but consistent: matching STARTS the moment the entry doc (workflow trace) is parsed —
// concurrently with the rest of the incident's docs streaming in — but the card only RESOLVES to
// an outcome once ALL that incident's documents have been extracted (so it never resolves on
// evidence that hasn't landed yet).
const ROOT_END: Record<string, number> = {}
const DONE: Record<string, number> = {}
for (const d of FEED) {
  const end = d.arriveAt * SPEED + SLIDE_MS + d.parseMs * SPEED + d.extractMs * SPEED
  DONE[d.incident] = Math.max(DONE[d.incident] ?? 0, end)
  if (d.root) ROOT_END[d.incident] = end
}
interface Win { id: string; start: number; end: number }
const WINS: Win[] = INCIDENTS.map((i) => {
  const start = (ROOT_END[i.id] ?? 0) + 400
  const end = Math.max((DONE[i.id] ?? 0) + 700, start + MIN_MATCH)
  return { id: i.id, start, end }
})
export const RES_END = Math.max(...WINS.map((w) => w.end))

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function useResolution(started: boolean, runId: number): Map<string, ResPhase> {
  const [now, setNow] = useState(-1)

  useEffect(() => {
    if (!started) { setNow(-1); return }
    if (prefersReducedMotion()) { setNow(RES_END + 1); return }
    setNow(0)
    const bounds = Array.from(new Set(WINS.flatMap((w) => [w.start, w.end])))
      .filter((t) => t > 0).sort((a, b) => a - b)
    const timers = bounds.map((t) => setTimeout(() => setNow(t), t))
    return () => timers.forEach(clearTimeout)
  }, [started, runId])

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
