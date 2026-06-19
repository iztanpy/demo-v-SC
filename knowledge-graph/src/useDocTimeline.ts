import { useEffect, useState } from 'react'
import { INCIDENTS, PARSE_MULTIPLIER } from './data/incidents'
import type { DocKind } from './data/incidents'

// Drives the step-3 "agents are working" extraction: every document (3 incidents × 3 docs)
// transitions queued → parsing → extracting → done over inflated time, staggered by incident.
// Timers live in the effect (kicked off when active), never in render (WA#7, React form).
export type DocPhase = 'queued' | 'parsing' | 'extracting' | 'done'

const DOCS: DocKind[] = ['report', 'workflow', 'transcript']
// Each doc TYPE has its own parse/extract duration (ms, before PARSE_MULTIPLIER) so within a card
// they finish at different times — "some end faster than others".
const DOC_DUR: Record<DocKind, { parse: number; extract: number }> = {
  report:     { parse: 1100, extract: 950 }, // ~2050 — slowest (longest doc)
  workflow:   { parse: 900,  extract: 750 }, // ~1650
  transcript: { parse: 750,  extract: 600 }, // ~1350 — fastest
}
// All 9 docs START together (at t=0) but END independently: each card runs at its own pace, so
// even the same doc type across cards finishes at a different time — no lockstep.
const CARD_SPEED = [1.0, 0.8, 1.25]

interface Win { key: string; start: number; parseEnd: number; end: number }
const WINS: Win[] = (() => {
  const m = PARSE_MULTIPLIER
  const wins: Win[] = []
  INCIDENTS.forEach((inc, i) => {
    const speed = CARD_SPEED[i] ?? 1
    DOCS.forEach((doc) => {
      const d = DOC_DUR[doc]
      const start = 0
      const parseEnd = start + d.parse * speed * m
      wins.push({ key: `${inc.id}:${doc}`, start, parseEnd, end: parseEnd + d.extract * speed * m })
    })
  })
  return wins
})()
const TOTAL = Math.max(...WINS.map((w) => w.end))

export const docKey = (incidentId: string, doc: DocKind) => `${incidentId}:${doc}`

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function useDocTimeline(active: boolean): Map<string, DocPhase> {
  const [now, setNow] = useState(TOTAL + 1)

  useEffect(() => {
    if (!active) { setNow(TOTAL + 1); return }
    if (prefersReducedMotion()) { setNow(TOTAL + 1); return }
    setNow(0)
    const boundaries = Array.from(new Set(WINS.flatMap((w) => [w.start, w.parseEnd, w.end])))
      .filter((t) => t > 0)
      .sort((a, b) => a - b)
    const timers = boundaries.map((t) => setTimeout(() => setNow(t), t))
    return () => timers.forEach(clearTimeout)
  }, [active])

  const map = new Map<string, DocPhase>()
  for (const w of WINS) {
    map.set(w.key, now < w.start ? 'queued' : now < w.parseEnd ? 'parsing' : now < w.end ? 'extracting' : 'done')
  }
  return map
}
