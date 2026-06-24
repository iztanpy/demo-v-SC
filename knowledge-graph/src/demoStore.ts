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

  /** proposed-node ids the human signed off on (per-card) → the graph grows exactly these */
  committedNodes: string[]
  /** add one approved proposed-node id to the graph (idempotent) */
  approveNode: (id: string) => void

  /** transient amber flash on the graph — bumped each time a resolution card emits a
   *  "graph-imperfection" beat (re-weight + the 2 gaps). The graph pulses these node/edge ids
   *  amber for ~1s then reverts. `seq` makes repeat pulses on the same target distinct. */
  flashPulse: { seq: number; nodes: string[]; edges: string[] } | null
  pulse: (nodes: string[], edges: string[]) => void
}

export const useDemo = create<DemoState>((set) => ({
  started: false,
  runId: 0,
  start: () => set((s) => ({ started: true, runId: s.runId + 1, matchedNodes: [], reweight: false, reweightApplied: false, gap: false, committedNodes: [], flashPulse: null })),
  reset: () => set({ started: false, matchedNodes: [], reweight: false, reweightApplied: false, gap: false, committedNodes: [], flashPulse: null }),

  matchedNodes: [],
  reweight: false,
  reweightApplied: false,
  gap: false,
  setMatched: (ids) => set({ matchedNodes: ids }),
  setReweight: (v) => set({ reweight: v }),
  setReweightApplied: (v) => set({ reweightApplied: v }),
  setGap: (v) => set({ gap: v }),

  committedNodes: [],
  approveNode: (id) => set((s) => (s.committedNodes.includes(id) ? s : { committedNodes: [...s.committedNodes, id] })),

  flashPulse: null,
  pulse: (nodes, edges) => set((s) => ({ flashPulse: { seq: (s.flashPulse?.seq ?? 0) + 1, nodes, edges } })),
}))
