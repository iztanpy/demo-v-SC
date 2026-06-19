import { useEffect, useState } from 'react'
import { STEPS, BEAT_MULTIPLIER } from './data/steps'

// Timed agent-handoff flashing. For the active step, walk its `sequence` of beats. Beats run
// in order (sequential handoff); within a beat all skills START together but each pulses for
// its own duration, so one can drop to DONE while another keeps pulsing (parallel, independent
// stop). A beat ends once its longest skill finishes; the next beat starts then.
//
// Implementation: compute each skill's [start, end) window, then set two timers per skill —
// one at start (→ pulsing) and one at end (→ done). Timers live in the effect, kicked off on
// step change, never in render — the React form of the WA#7 rule. Presenter-safe: nothing
// auto-advances the step; Next/Back simply re-keys the effect.
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

interface Cue { id: string; start: number; end: number }

function buildCues(step: number): Cue[] {
  const sequence = STEPS[step - 1]?.sequence ?? []
  // steps 4+ run the loading theater a little faster than the intake beats (1–3)
  const stepSpeed = step >= 4 ? 0.7 : 1
  const cues: Cue[] = []
  let beatStart = 0
  for (const beat of sequence) {
    let beatLen = 0
    for (const s of beat.skills) {
      const dur = s.durMs * BEAT_MULTIPLIER * stepSpeed
      cues.push({ id: s.id, start: beatStart, end: beatStart + dur })
      beatLen = Math.max(beatLen, dur)
    }
    beatStart += beatLen
  }
  return cues
}

export function useStepTimeline(step: number): { pulsing: Set<string>; done: Set<string> } {
  // tick = "current time" in ms since the step started; -1 = reduced-motion (everything done)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const cues = buildCues(step)
    if (cues.length === 0) {
      setTick(0)
      return
    }
    if (prefersReducedMotion()) {
      setTick(-1)
      return
    }
    setTick(0)
    // a timer at every distinct start/end boundary advances `tick` so derivation re-runs
    const boundaries = Array.from(new Set(cues.flatMap((c) => [c.start, c.end]))).sort((a, b) => a - b)
    const timers = boundaries
      .filter((t) => t > 0)
      .map((t) => setTimeout(() => setTick(t), t))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const cues = buildCues(step)
  const pulsing = new Set<string>()
  const done = new Set<string>()
  if (tick < 0) {
    // reduced motion → all done
    cues.forEach((c) => done.add(c.id))
  } else {
    for (const c of cues) {
      if (tick >= c.end) done.add(c.id)
      else if (tick >= c.start) pulsing.add(c.id)
    }
  }
  return { pulsing, done }
}
