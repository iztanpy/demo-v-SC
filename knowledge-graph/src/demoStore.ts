import { create } from 'zustand'

// Sequential 3-panel demo clock. "Run the week" starts ONLY section 1 (Documents). Each subsequent
// section begins its own timeline either when the presenter FOLDS the previous one, OR when they
// OPEN the next (not-yet-run) section's strip directly — opening a fresh section auto-folds the
// previous one and starts its timeline (so clicking ahead "just works"). Folded sections collapse to
// a thin numbered strip; re-opening an ALREADY-run strip doesn't fold the others.
export type SectionKey = 'docs' | 'reso' | 'nk'
const ORDER: SectionKey[] = ['docs', 'reso', 'nk']

interface DemoState {
  started: boolean
  /** bumps on each run so panel timers re-arm cleanly */
  runId: number
  start: () => void
  reset: () => void

  /** which sections have begun their timeline (sequential — see ORDER) */
  sectionRun: Record<SectionKey, boolean>
  /** which sections are folded to a number strip */
  sectionFolded: Record<SectionKey, boolean>
  /** fold/unfold a section; folding the current one — or opening the next not-yet-run one —
   *  triggers the next section's timeline and folds the previous (idempotent) */
  toggleFold: (key: SectionKey) => void

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
  flashPulse: { seq: number; nodes: string[]; edges: string[]; ms?: number } | null
  pulse: (nodes: string[], edges: string[], ms?: number) => void

  /** PERSISTENT hover highlight — node/edge ids the graph emphasises while a Panel-2 / Panel-3
   *  card is hovered. `color` overrides the default teal (Panel 3 passes orange). Cleared (null)
   *  on mouse-leave. Edge keys are "SOURCE>TARGET". */
  hoverHighlight: { nodes: string[]; edges: string[]; color?: string } | null
  setHover: (h: { nodes: string[]; edges: string[]; color?: string } | null) => void
}

const ALL_FALSE: Record<SectionKey, boolean> = { docs: false, reso: false, nk: false }

export const useDemo = create<DemoState>((set) => ({
  started: false,
  runId: 0,
  // Run → only section 1 begins; sections 2 & 3 start folded (waiting strips).
  start: () => set((s) => ({
    started: true, runId: s.runId + 1,
    sectionRun: { docs: true, reso: false, nk: false },
    sectionFolded: { docs: false, reso: true, nk: true },
    matchedNodes: [], reweight: false, reweightApplied: false, gap: false, committedNodes: [], flashPulse: null, hoverHighlight: null,
  })),
  reset: () => set({
    started: false,
    sectionRun: { ...ALL_FALSE }, sectionFolded: { ...ALL_FALSE },
    matchedNodes: [], reweight: false, reweightApplied: false, gap: false, committedNodes: [], flashPulse: null, hoverHighlight: null,
  }),

  sectionRun: { ...ALL_FALSE },
  sectionFolded: { ...ALL_FALSE },
  toggleFold: (key) => set((s) => {
    const willFold = !s.sectionFolded[key]
    const sectionFolded = { ...s.sectionFolded, [key]: willFold }
    let sectionRun = s.sectionRun
    if (willFold) {
      // folding a section advances to + opens the next one (if it hasn't run yet)
      const next = ORDER[ORDER.indexOf(key) + 1]
      if (next && !s.sectionRun[next]) {
        sectionRun = { ...s.sectionRun, [next]: true }
        sectionFolded[next] = false // auto-open the freshly-triggered next section
      }
    } else if (!s.sectionRun[key]) {
      // OPENING a not-yet-run section = advance to it: start its timeline + fold the previous
      sectionRun = { ...s.sectionRun, [key]: true }
      const prev = ORDER[ORDER.indexOf(key) - 1]
      if (prev) sectionFolded[prev] = true
    }
    return { sectionFolded, sectionRun }
  }),

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
  pulse: (nodes, edges, ms) => set((s) => ({ flashPulse: { seq: (s.flashPulse?.seq ?? 0) + 1, nodes, edges, ms } })),

  hoverHighlight: null,
  setHover: (h) => set({ hoverHighlight: h }),
}))
