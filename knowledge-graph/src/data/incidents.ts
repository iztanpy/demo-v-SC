import type { ProposedChange } from '../types'

// The week's closed BFP NDE-vibration incidents. These live OUTSIDE the knowledge
// graph — they are documents the agents read, not nodes. All three share the same
// signature (DT-PHASE → bent shaft → ruled out → casing/weld crack found off-path),
// which is what grounds the two proposed edits.

export type DocKind = 'report' | 'workflow' | 'transcript'

export interface ExtractionChip {
  /** which Intake skill pulled this finding (drives the skill tag) */
  skill: string
  doc: DocKind
  text: string
}

export interface WeekIncident {
  id: string
  plant: string
  asset: string
  date: string
  chips: ExtractionChip[]
}

export const DOC_LABEL: Record<DocKind, string> = {
  report: 'Service report',
  workflow: 'Workflow trace',
  transcript: 'Call transcript',
}

export const INCIDENTS: WeekIncident[] = [
  {
    id: 'INC-2026-0537',
    plant: 'JRG-CCGT-1',
    asset: 'BFP-3A',
    date: '2026-05-20',
    chips: [
      { skill: 'intake-report', doc: 'report', text: 'Root cause: casing weld-toe crack (60 mm, volute @ discharge) · fix: weld repair + PWHT · vib 8.4→5.9 mm/s' },
      { skill: 'intake-workflow', doc: 'workflow', text: 'DT-PHASE: 1×RPM dominant → KG suggested bent shaft · DT-RUNOUT: in-tol (ruled out) · casing NDT (off-path) → crack found' },
      { skill: 'intake-transcript', doc: 'transcript', text: 'Lim ↔ Dr. Ismail: “1×RPM + bursty harmonics near the discharge weld — volute crack, not a bent shaft”' },
    ],
  },
  {
    id: 'INC-2026-0488',
    plant: 'Sakra-CCGT-1',
    asset: 'BFP-2A',
    date: '2026-05-16',
    chips: [
      { skill: 'intake-report', doc: 'report', text: 'Root cause: casing crack near discharge flange · fix: weld + PWHT · vib 7.9→5.6 mm/s' },
      { skill: 'intake-workflow', doc: 'workflow', text: 'DT-PHASE → bent shaft (0.88) · DT-ALIGNMENT: in-tol · visual inspection → weld crack' },
      { skill: 'intake-transcript', doc: 'transcript', text: 'J. Tan ↔ expert: “phase read like shaft bow but alignment was clean — found a hairline at the volute”' },
    ],
  },
  {
    id: 'INC-2026-0501',
    plant: 'Banyan-CHP',
    asset: 'BFP-1A',
    date: '2026-05-18',
    chips: [
      { skill: 'intake-report', doc: 'report', text: 'Root cause: volute hairline crack · fix: weld repair · vib 8.1→5.8 mm/s' },
      { skill: 'intake-workflow', doc: 'workflow', text: 'DT-PHASE → bent shaft · DT-RUNOUT: borderline · dye-penetrant → crack confirmed' },
      { skill: 'intake-transcript', doc: 'transcript', text: 'S. Ibrahim note: “casing fatigue, recurring on Sulzer BFP discharge welds”' },
    ],
  },
]

// The shared signature row surfaced by Pattern Mining (step 3) — one cell per incident.
export interface PatternRow {
  label: string
  cells: string[] // aligned to INCIDENTS order
}
export const PATTERN_ROWS: PatternRow[] = [
  { label: 'DT-PHASE suggested', cells: ['Bent shaft', 'Bent shaft', 'Bent shaft'] },
  { label: 'Bent shaft', cells: ['Ruled out', 'Ruled out', 'Ruled out'] },
  { label: 'Confirmed cause', cells: ['Casing crack', 'Casing crack', 'Casing crack'] },
  { label: 'Found by', cells: ['Casing NDT', 'Visual inspect', 'Dye-penetrant'] },
]

// Two gaps Gap Detection draws onto the KG (step 4); each becomes a changeset line.
export interface DerivedGap {
  id: string
  kind: 'add' | 'reweight'
  headline: string
  evidence: string
  /** node or edge the callout pins to on the graph */
  target: string
}
export const GAPS: DerivedGap[] = [
  { id: 'gap-node', kind: 'add', headline: 'Casing crack has no root-cause node', evidence: 'confirmed 3/3 reports', target: 'RC-CASING-CRACK' },
  { id: 'gap-reweight', kind: 'reweight', headline: 'DT-PHASE → bent shaft over-weighted', evidence: 'contradicted 3/3', target: 'DT-PHASE>RC-BENT-SHAFT' },
]

// The changeset the Curator drafts (steps 5–6), validated at 7, applied at 8.
export const CHANGES: ProposedChange[] = [
  {
    id: 'chg-rc-casing',
    kind: 'add-node',
    label: 'Add RootCause',
    detail: 'Pump casing crack / weld fatigue (RC-CASING-CRACK) + confirming test DT-WELD-NDT',
    proposeStep: 5,
    cites: ['INC-2026-0537', 'INC-2026-0488', 'INC-2026-0501'],
  },
  {
    id: 'chg-reweight-phase',
    kind: 'reweight',
    label: 'Re-weight edge',
    detail: 'DT-PHASE → RC-BENT-SHAFT CONFIRMS 0.88 → 0.70',
    proposeStep: 6,
    cites: ['INC-2026-0537', 'INC-2026-0488', 'INC-2026-0501'],
  },
]

// Step at which the human approves and the changeset applies to the graph.
export const APPROVE_STEP = 8
