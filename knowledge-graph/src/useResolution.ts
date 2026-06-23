import { useEffect, useState } from 'react'
import { FEED, INCIDENTS, SPEED } from './data/feed'

// Drives Panel 2 timing: each incident is resolved against the KG AFTER its documents finish
// extracting. Outcomes (match / re-weight / gap) live in the per-incident defs in ResolutionPanel.
export type ResPhase = 'pending' | 'matching' | 'resolved'
const SLIDE_MS = 420
const MIN_MATCH = 1000 // matching theater duration for reaffirm minis (snappy after the tick)
const HERO = 'INC-0537'
const HERO_MATCH = 1800 // longer matching theater for the hero incident (the focal point — slower)
const APPEAR_GAP = 150 // delay between the doc's green tick and the resolution card appearing

// A resolution card only APPEARS once all of its incident's documents have finished extracting —
// i.e. just after the green tick shows on the Documents card. The matching theater then runs and
// the card resolves. (No more parallel matching while docs are still streaming.)
const DONE: Record<string, number> = {}
for (const d of FEED) {
  const end = d.arriveAt * SPEED + SLIDE_MS + d.parseMs * SPEED + d.extractMs * SPEED
  DONE[d.incident] = Math.max(DONE[d.incident] ?? 0, end)
}
interface Win { id: string; start: number; end: number }
const WINS: Win[] = INCIDENTS.map((i) => {
  const start = (DONE[i.id] ?? 0) + APPEAR_GAP // appear just after the documents' green tick
  const end = start + (i.id === HERO ? HERO_MATCH : MIN_MATCH) // matching theater, then resolved
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
