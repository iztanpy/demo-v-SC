import { create } from 'zustand'
import { TOTAL_STEPS } from './data/steps'

interface P2State {
  step: number
  maxStepReached: number
  next: () => void
  back: () => void
  restart: () => void
  /** how many approval batches the reviewer has run at the approval step (0 → 1 → 2) */
  approvedBatches: number
  approveBatch: () => void
  // UI drawers / focus-graph (feedback round 1)
  leftOpen: boolean
  rightOpen: boolean
  focusGraph: boolean
  toggleLeft: () => void
  toggleRight: () => void
  toggleFocus: () => void
}

export const useP2 = create<P2State>((set) => ({
  step: 1,
  maxStepReached: 1,
  // navigating always re-arms the approval gate (batches reset to 0)
  next: () =>
    set((s) => {
      const step = Math.min(TOTAL_STEPS, s.step + 1)
      return { step, maxStepReached: Math.max(s.maxStepReached, step), approvedBatches: 0 }
    }),
  back: () => set((s) => ({ step: Math.max(1, s.step - 1), approvedBatches: 0 })),
  restart: () => set({ step: 1, maxStepReached: 1, approvedBatches: 0 }),
  approvedBatches: 0,
  approveBatch: () => set((s) => ({ approvedBatches: Math.min(2, s.approvedBatches + 1) })),
  leftOpen: true,
  rightOpen: true,
  focusGraph: false,
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
  toggleFocus: () => set((s) => ({ focusGraph: !s.focusGraph })),
}))

export { TOTAL_STEPS }
