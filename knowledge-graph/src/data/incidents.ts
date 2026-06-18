import type { ProposedChange } from '../types'

// The week's closed BFP NDE-vibration incidents. These live OUTSIDE the knowledge
// graph — they are documents the agents read, not nodes. All three share the same
// signature (DT-PHASE → bent shaft → ruled out → casing/weld crack found off-path),
// which is what grounds the two proposed edits.

export type DocKind = 'report' | 'workflow' | 'transcript'

export interface ExtractionChip {
  /** which Intake skill pulled this finding (the "worker" shown while parsing) */
  skill: string
  doc: DocKind
  /** punchy condensed output: a short label + a short value (no long sentences) */
  field: string
  value: string
  /** fuller finding shown when the chip's dropdown is expanded */
  detail: string
  /** provenance reference lines (source doc · locator + system + KG node it maps to) */
  refs: string[]
}

// Artificially inflates the per-document parse/extract timings so the audience can watch
// the agents "work" at step 3 (2 = twice as slow). Applied in useDocTimeline.
export const PARSE_MULTIPLIER = 1.5

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
      { skill: 'intake-report', doc: 'report', field: 'Root cause', value: 'Casing weld-toe crack (volute)', detail: 'Casing weld-toe crack — ~60 mm hairline at the volute near the discharge weld. Repaired by weld + PWHT; NDE vibration fell 8.4 → 5.9 mm/s.', refs: ['Service report · §Root cause / Fix', 'Maximo · WO-4471 close-out', 'OSIsoft PI · NDE vib trend', '→ maps to RC-CASING-CRACK'] },
      { skill: 'intake-workflow', doc: 'workflow', field: 'Test path', value: 'Phase→bent shaft ✗ · casing NDT ✓', detail: 'DT-PHASE flagged 1×RPM dominant → KG suggested bent shaft. DT-RUNOUT in-tolerance (ruled out). A casing NDT — off the KG’s path — found the crack.', refs: ['Workflow trace · SOP-BFP-VIBR-001', 'DT-PHASE, DT-RUNOUT results', '→ DT-PHASE, DT-RUNOUT, (new) DT-WELD-NDT'] },
      { skill: 'intake-transcript', doc: 'transcript', field: 'Expert', value: 'Volute crack, not bent shaft', detail: 'Lim ↔ Dr. Ismail: 1×RPM with bursty harmonics near the discharge weld points to a volute crack, not a bent shaft.', refs: ['Call transcript · 07:23 SGT', 'Dr. A. Ismail · Offsite Expert', '→ RC-CASING-CRACK'] },
    ],
  },
  {
    id: 'INC-2026-0488',
    plant: 'Sakra-CCGT-1',
    asset: 'BFP-2A',
    date: '2026-05-16',
    chips: [
      { skill: 'intake-report', doc: 'report', field: 'Root cause', value: 'Casing crack @ discharge flange', detail: 'Casing crack near the discharge flange. Repaired by weld + PWHT; NDE vibration fell 7.9 → 5.6 mm/s.', refs: ['Service report · §Root cause / Fix', 'Maximo · WO-4392 close-out', '→ maps to RC-CASING-CRACK'] },
      { skill: 'intake-workflow', doc: 'workflow', field: 'Test path', value: 'Phase→bent shaft ✗ · inspect ✓', detail: 'DT-PHASE indicated bent shaft (0.88). DT-ALIGNMENT in-tolerance. A visual inspection found the weld crack.', refs: ['Workflow trace · SOP-BFP-VIBR-001', 'DT-PHASE, DT-ALIGNMENT results', '→ DT-PHASE, DT-ALIGNMENT'] },
      { skill: 'intake-transcript', doc: 'transcript', field: 'Expert', value: 'Alignment clean — hairline at volute', detail: 'J. Tan ↔ expert: phase read like shaft bow, but alignment was clean — a hairline was found at the volute.', refs: ['Call transcript · 14:05 SGT', 'J. Tan · Onsite', '→ RC-CASING-CRACK'] },
    ],
  },
  {
    id: 'INC-2026-0501',
    plant: 'Banyan-CHP',
    asset: 'BFP-1A',
    date: '2026-05-18',
    chips: [
      { skill: 'intake-report', doc: 'report', field: 'Root cause', value: 'Volute hairline crack', detail: 'Volute hairline crack. Repaired by weld; NDE vibration fell 8.1 → 5.8 mm/s.', refs: ['Service report · §Root cause / Fix', 'Maximo · WO-4310 close-out', '→ maps to RC-CASING-CRACK'] },
      { skill: 'intake-workflow', doc: 'workflow', field: 'Test path', value: 'Phase→bent shaft ✗ · dye-penetrant ✓', detail: 'DT-PHASE indicated bent shaft. DT-RUNOUT borderline. Dye-penetrant inspection confirmed the crack.', refs: ['Workflow trace · SOP-BFP-VIBR-001', 'DT-PHASE, DT-RUNOUT results', '→ DT-PHASE, DT-RUNOUT, (new) DT-WELD-NDT'] },
      { skill: 'intake-transcript', doc: 'transcript', field: 'Expert', value: 'Casing fatigue on discharge welds', detail: 'S. Ibrahim: casing fatigue recurring on Sulzer BFP discharge welds across the fleet.', refs: ['Call transcript · 09:40 SGT', 'S. Ibrahim · Onsite', '→ RC-CASING-CRACK'] },
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

// Findings Gap Detection draws onto the KG (step 5); each becomes a changeset line:
// two knowledge gaps (add a node, re-weight an edge) + one efficiency shortcut.
export interface DerivedGap {
  id: string
  kind: 'add' | 'reweight' | 'shortcut'
  headline: string
  evidence: string
  /** node or edge the callout pins to on the graph */
  target: string
  /** fuller finding + provenance, shown in the dropdown */
  detail: string
  refs: string[]
}
export const GAPS: DerivedGap[] = [
  { id: 'gap-node', kind: 'add', headline: 'Casing crack has no root-cause node', evidence: 'confirmed 3/3 reports', target: 'RC-CASING-CRACK', detail: 'A casing / weld crack was the confirmed cause in all three incidents, yet the graph has no root cause to hold it — and the test that catches it is off the graph’s path.', refs: ['Service reports · 3 / 3', 'OSIsoft PI · vib deltas', '→ add RC-CASING-CRACK + DT-WELD-NDT'] },
  { id: 'gap-reweight', kind: 'reweight', headline: 'DT-PHASE → bent shaft over-weighted', evidence: 'contradicted 3/3', target: 'DT-PHASE>RC-BENT-SHAFT', detail: 'DT-PHASE points at bent shaft at 0.88, but bent shaft was ruled out in every incident — phase over-attributes the 1×RPM signature that casing fatigue mimics.', refs: ['Workflow traces · 3 / 3', 'SOP-BFP-VIBR-001', '→ re-weight 0.88 → 0.70'] },
  { id: 'gap-shortcut', kind: 'shortcut', headline: 'Faster path — triage skipped to the runout', evidence: 'captured on a call', target: 'SYM-001>DT-RUNOUT', detail: 'On a call a technician skipped phase triage and went straight to the runout — and it held up. Worth capturing as a faster route for this symptom.', refs: ['Call transcript · INC-2026-0537', '→ add SYM-001 → DT-RUNOUT shortcut'] },
]

// The changeset the Curator drafts (steps 5–6), validated at 7, applied at 8.
export const CHANGES: ProposedChange[] = [
  {
    id: 'chg-rc-casing',
    kind: 'add-node',
    label: 'Add RootCause',
    detail: 'Pump casing crack / weld fatigue (RC-CASING-CRACK) + confirming test DT-WELD-NDT',
    proposeStep: 6,
    batch: 1,
    cites: ['INC-2026-0537', 'INC-2026-0488', 'INC-2026-0501'],
    evidence: '3 / 3 incidents',
    quote: 'Casing weld-toe crack — found by NDT, with no node on the graph.',
  },
  {
    id: 'chg-reweight-phase',
    kind: 'reweight',
    label: 'Re-weight edge',
    detail: 'DT-PHASE → RC-BENT-SHAFT CONFIRMS 0.88 → 0.70',
    proposeStep: 6,
    batch: 1,
    cites: ['INC-2026-0537', 'INC-2026-0488', 'INC-2026-0501'],
    evidence: 'contradicted 3 / 3',
    quote: 'Phase pointed at bent shaft — ruled out every single time.',
  },
  {
    id: 'chg-shortcut-runout',
    kind: 'shortcut',
    label: 'Add shortcut',
    detail: 'SYM-001 → DT-RUNOUT (skip phase triage) — captured from a technician call',
    proposeStep: 6,
    batch: 2,
    cites: ['INC-2026-0537'],
    evidence: 'captured on a call',
    quote: '“1×RPM is obvious — skip phase, go straight to the runout.”',
  },
]

// Step at which the human approves and the changeset applies to the graph.
export const APPROVE_STEP = 8
