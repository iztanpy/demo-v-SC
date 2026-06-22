import { create } from 'zustand'

// Concurrent 3-panel demo clock. No step machine — a single "Run the week" starts every panel's
// timeline at once; panels derive their own state from the shared elapsed clock + runId.
interface DemoState {
  started: boolean
  /** bumps on each run so panel timers re-arm cleanly */
  runId: number
  start: () => void
  reset: () => void

  // ── Resolution (Panel 2) outputs that the graph + Panel 3 react to ──
  /** graph node ids on confirmed (reaffirmed) paths — the graph lights these green */
  matchedNodes: string[]
  /** an existing edge's confidence should drop (graph's suggestion was overruled) → re-weight PROPOSED */
  reweight: boolean
  /** admin chose to recalculate → the re-weight is APPLIED to the edge */
  reweightApplied: boolean
  /** the exception surfaced a gap (no node for the casing crack) → feeds Panel 3 */
  gap: boolean
  setMatched: (ids: string[]) => void
  setReweight: (v: boolean) => void
  setReweightApplied: (v: boolean) => void
  setGap: (v: boolean) => void

  /** admin signed off → the new knowledge commits into the graph (Panel 3) */
  committed: boolean
  setCommitted: (v: boolean) => void
}

export const useDemo = create<DemoState>((set) => ({
  started: false,
  runId: 0,
  start: () => set((s) => ({ started: true, runId: s.runId + 1, matchedNodes: [], reweight: false, reweightApplied: false, gap: false, committed: false })),
  reset: () => set({ started: false, matchedNodes: [], reweight: false, reweightApplied: false, gap: false, committed: false }),

  matchedNodes: [],
  reweight: false,
  reweightApplied: false,
  gap: false,
  setMatched: (ids) => set({ matchedNodes: ids }),
  setReweight: (v) => set({ reweight: v }),
  setReweightApplied: (v) => set({ reweightApplied: v }),
  setGap: (v) => set({ gap: v }),

  committed: false,
  setCommitted: (v) => set({ committed: v }),
}))
