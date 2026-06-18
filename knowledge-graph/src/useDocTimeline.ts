import { useEffect, useState } from 'react'
import { INCIDENTS, PARSE_MULTIPLIER } from './data/incidents'
import type { DocKind } from './data/incidents'

// Drives the step-3 "agents are working" extraction: every document (3 incidents × 3 docs)
// transitions queued → parsing → extracting → done over inflated time, staggered by incident.
// Timers live in the effect (kicked off when active), never in render (WA#7, React form).
export type DocPhase = 'queued' | 'parsing' | 'extracting' | 'done'

const DOCS: DocKind[] = ['report', 'workflow', 'transcript']
// base durations (ms), before PARSE_MULTIPLIER — tuned so the whole sweep reads as real work
const BASE = { incidentStagger: 1500, docStagger: 280, parse: 950, extract: 800 }

interface Win { key: string; start: number; parseEnd: number; end: number }
const WINS: Win[] = (() => {
  const m = PARSE_MULTIPLIER
  const wins: Win[] = []
  INCIDENTS.forEach((inc, i) => {
    DOCS.forEach((doc, j) => {
      const start = (i * BASE.incidentStagger + j * BASE.docStagger) * m
      const parseEnd = start + BASE.parse * m
      wins.push({ key: `${inc.id}:${doc}`, start, parseEnd, end: parseEnd + BASE.extract * m })
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
