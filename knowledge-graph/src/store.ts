import { create } from 'zustand'
import { TOTAL_STEPS } from './data/steps'

interface P2State {
  step: number
  maxStepReached: number
  next: () => void
  back: () => void
  restart: () => void
}

export const useP2 = create<P2State>((set) => ({
  step: 1,
  maxStepReached: 1,
  next: () =>
    set((s) => {
      const step = Math.min(TOTAL_STEPS, s.step + 1)
      return { step, maxStepReached: Math.max(s.maxStepReached, step) }
    }),
  back: () => set((s) => ({ step: Math.max(1, s.step - 1) })),
  restart: () => set({ step: 1 }),
}))

export { TOTAL_STEPS }
