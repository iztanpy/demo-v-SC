import { useEffect, useState } from 'react'
import { FEED, SPEED } from './data/feed'

// Drives the streaming Documents panel: each doc arrives → slides in → parses → extracts → done,
// derived from one shared clock. Timers live in the effect, re-armed on runId (WA: never in render).
export type FeedPhase = 'pending' | 'incoming' | 'parsing' | 'extracting' | 'done'
const SLIDE_MS = 420

interface Win { id: string; t0: number; t1: number; t2: number; t3: number }
const WINS: Win[] = FEED.map((d) => {
  const t0 = d.arriveAt * SPEED, t1 = t0 + SLIDE_MS, t2 = t1 + d.parseMs * SPEED, t3 = t2 + d.extractMs * SPEED
  return { id: d.id, t0, t1, t2, t3 }
})
const END = Math.max(...WINS.map((w) => w.t3))

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function useFeed(started: boolean, runId: number): Map<string, FeedPhase> {
  const [now, setNow] = useState(-1)

  useEffect(() => {
    if (!started) { setNow(-1); return }
    if (prefersReducedMotion()) { setNow(END + 1); return }
    setNow(0)
    const bounds = Array.from(new Set(WINS.flatMap((w) => [w.t0, w.t1, w.t2, w.t3])))
      .filter((t) => t > 0).sort((a, b) => a - b)
    const timers = bounds.map((t) => setTimeout(() => setNow(t), t))
    return () => timers.forEach(clearTimeout)
  }, [started, runId])

  const map = new Map<string, FeedPhase>()
  for (const w of WINS) {
    let p: FeedPhase = 'pending'
    if (now < 0 || now < w.t0) p = 'pending'
    else if (now < w.t1) p = 'incoming'
    else if (now < w.t2) p = 'parsing'
    else if (now < w.t3) p = 'extracting'
    else p = 'done'
    map.set(w.id, p)
  }
  return map
}
