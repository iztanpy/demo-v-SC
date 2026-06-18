import type { GraphNode, GraphEdge, NodeLabel } from '../types'

// One bounded, pure-knowledge graph (no incident instances) for the SYM-001 diagnostic
// domain. Two test layers, then root causes LAST — realistic diagnostic flow where one
// test sometimes resolves a cause and sometimes a follow-up test is needed:
//
//   AssetClass ← Symptom → Test layer 1 → (sometimes) Test layer 2 → Root causes (LAST)
//        OCCURS_IN  TRIGGERS    FOLLOW_UP (when needed)    CONFIRMS / RULES_OUT
//
// Only the single L1→L2 hop is a test→test edge (FOLLOW_UP); no long chains. Layer-2
// (confirmatory) tests render smaller. DT-THERMOGRAPHY dropped for legibility.
export const VIEWBOX = { w: 1600, h: 1100 }

// Column x positions (used for node coords + column headers).
export const COLS = { asset: 110, symptom: 320, l1: 600, l2: 880, cause: 1230 }

export const NODE_COLORS: Record<NodeLabel, string> = {
  AssetClass: '#64748B',     // slate — the equipment class
  Symptom: '#F59E0B',        // amber — the alert
  DiagnosticTest: '#2563EB', // blue — the tests
  RootCause: '#DC2626',      // red — the culprits
  Inconclusive: '#7C3AED',   // violet — the "more info needed" escalation sink
}

export const NODE_LABELS: NodeLabel[] = ['AssetClass', 'Symptom', 'DiagnosticTest', 'RootCause', 'Inconclusive']

// Column headers drawn across the top of the graph.
export const COL_HEADERS: { x: number; label: string }[] = [
  { x: COLS.symptom, label: 'Symptom' },
  { x: COLS.l1, label: 'Test layer 1' },
  { x: COLS.l2, label: 'Test layer 2' },
  { x: COLS.cause, label: 'Root causes' },
]

export const NODES: GraphNode[] = [
  // ── asset class + symptom ──
  { id: 'AC-BFP', label: 'AssetClass', title: 'Boiler feed pump', x: COLS.asset, y: 500, props: { name: 'Boiler feed pump (BFP)', description: 'High-pressure multistage boiler feed pump class' } },
  {
    id: 'SYM-001', label: 'Symptom', title: 'BFP NDE vib high', x: COLS.symptom, y: 500,
    props: { name: 'BFP NDE Vibration High (Zone C)', description: 'NDE bearing-housing vibration RMS exceeds ISO 10816-7 Zone C alarm threshold', severity: 'Amber', urgency: 'Immediate' },
  },

  // ── TEST LAYER 1 (triage, off the symptom) ──
  { id: 'DT-PHASE', label: 'DiagnosticTest', title: 'Phase / spectrum', x: COLS.l1, y: 360, tier: 'triage', props: { name: 'Vibration phase / spectrum analysis', layer: 'triage (first-line)', method: 'Compare NDE-DE phase and harmonic content', cost_band: 'low', required_certs: ['ISO 10816-7 Vibration Analysis'] } },
  { id: 'DT-HOUSING-INSPECT', label: 'DiagnosticTest', title: 'Housing inspect', x: COLS.l1, y: 680, tier: 'triage', props: { name: 'NDE bearing housing inspection', layer: 'triage (first-line)', method: 'Visual / borescope inspection of NDE bearing race', cost_band: 'low', required_certs: ['Sulzer BFP Maintenance'] } },

  // ── TEST LAYER 2 (follow-up / confirmatory, smaller; reached via FOLLOW_UP) ──
  { id: 'DT-RUNOUT', label: 'DiagnosticTest', title: 'Shaft runout', x: COLS.l2, y: 210, tier: 'followup', props: { name: 'Dial-indicator shaft runout test', layer: 'follow-up (confirmatory)', method: 'Dial indicator on shaft, measure total indicated runout', cost_band: 'med', required_certs: ['Rotating Equipment Specialist', 'ISO 10816-7 Vibration Analysis'] } },
  { id: 'DT-ALIGNMENT', label: 'DiagnosticTest', title: 'Laser alignment', x: COLS.l2, y: 490, tier: 'followup', props: { name: 'Laser shaft alignment check', layer: 'follow-up (confirmatory)', method: 'Laser alignment of pump-driver coupling', cost_band: 'med', required_certs: ['Laser Alignment Certified', 'Rotating Equipment Specialist'] } },
  { id: 'DT-OIL-ANALYSIS', label: 'DiagnosticTest', title: 'Oil analysis', x: COLS.l2, y: 725, tier: 'followup', props: { name: 'Lubricant / oil debris analysis', layer: 'follow-up (confirmatory)', method: 'Sample bearing oil; ferrography + particle count', cost_band: 'med', required_certs: ['Lubrication Analysis Level 1'] } },

  // ── ROOT CAUSES (LAST column) — each carries a `solution` remedy ──
  { id: 'RC-BENT-SHAFT', label: 'RootCause', title: 'Bent shaft', x: COLS.cause, y: 210, props: { name: 'Bent shaft', description: 'Shaft bow (mechanical or thermal) driving 1×RPM vibration', solution: 'Straighten or replace shaft; re-balance rotor; re-check runout' } },
  { id: 'RC-MISALIGN', label: 'RootCause', title: 'Misalignment', x: COLS.cause, y: 400, props: { name: 'Coupling misalignment', description: 'Pump-driver misalignment driving 2×RPM vibration and bearing load', solution: 'Laser-align pump-driver coupling to tolerance; renew worn coupling element' } },
  { id: 'RC-BEARING-SPALL', label: 'RootCause', title: 'Bearing spalling', x: COLS.cause, y: 590, props: { name: 'Bearing race spalling', description: 'NDE bearing race surface fatigue / spalling', solution: 'Replace NDE bearing; verify lubrication & housing fit' } },
  { id: 'RC-LUBE-FAIL', label: 'RootCause', title: 'Lube failure', x: COLS.cause, y: 780, props: { name: 'Lubrication failure', description: 'Oil starvation / contamination degrading the NDE bearing', solution: 'Flush & replace lubricant; correct oil supply / cooler; fit breather' } },

  // ── inconclusive sink — the second outcome of every confirmatory test ──
  { id: 'NEEDS-INFO', label: 'Inconclusive', title: 'More info needed', x: 1050, y: 1020, props: { name: 'More information needed', description: 'Confirmatory test inconclusive — escalate for expert review / further data before committing a repair' } },

  // ── PROPOSED nodes (the week's recommended add — dashed/ghost until approval at step 8) ──
  { id: 'DT-WELD-NDT', label: 'DiagnosticTest', title: 'Weld NDT', x: COLS.l2, y: 940, tier: 'followup', state: 'proposed', proposeStep: 5, props: { name: 'Weld NDT / dye-penetrant inspection (volute, near discharge)', layer: 'follow-up (confirmatory)', method: 'PT/MT of casing volute & discharge-weld region', cost_band: 'med', required_certs: ['NDT Level 2 (PT/MT)'] } },
  { id: 'RC-CASING-CRACK', label: 'RootCause', title: 'Casing crack', x: COLS.cause, y: 970, state: 'proposed', proposeStep: 5, props: { name: 'Pump casing crack / weld fatigue', description: 'Volute / discharge weld-toe crack; casing fatigue mimicking 1×RPM shaft signatures', solution: 'Weld repair + PWHT of volute / discharge weld; MPI re-check; review casing fatigue life' } },
]

// `result` on every test edge = the observed test finding that drives it (shown when the
// edge is clicked). On FOLLOW_UP it's the triage outcome that escalates to the next test.
export const EDGES: GraphEdge[] = [
  // symptom scoped to asset class
  { source: 'SYM-001', target: 'AC-BFP', type: 'OCCURS_IN' },

  // symptom → layer-1 (triage) tests (cheap/decisive first)
  { source: 'SYM-001', target: 'DT-PHASE', type: 'TRIGGERS', order: 1, result: 'First-line: cheap, non-invasive, most discriminating' },
  { source: 'SYM-001', target: 'DT-HOUSING-INSPECT', type: 'TRIGGERS', order: 2, result: 'First-line visual / borescope of NDE bearing race' },

  // FOLLOW_UP — single L1→L2 hop when a triage test isn't decisive on its own
  { source: 'DT-PHASE', target: 'DT-RUNOUT', type: 'FOLLOW_UP', result: '1×RPM dominant → confirm shaft bow with runout' },
  { source: 'DT-PHASE', target: 'DT-ALIGNMENT', type: 'FOLLOW_UP', result: '2×RPM dominant → confirm with alignment check' },
  { source: 'DT-HOUSING-INSPECT', target: 'DT-OIL-ANALYSIS', type: 'FOLLOW_UP', result: 'No visible spalling → escalate to oil debris analysis' },

  // test → root cause (probability = how diagnostic). 1-layer (triage confirms) + 2-layer (follow-up confirms).
  // ⭐ re-weight target: phase over-confirms bent shaft at 0.88 today; week proposes 0.70
  { source: 'DT-PHASE', target: 'RC-BENT-SHAFT', type: 'CONFIRMS', band: 'high', probability: 0.88, oldProbability: 0.88, newProbability: 0.70, reweightProposeStep: 6, result: '1×RPM-dominant with ~180° NDE–DE phase shift' },
  { source: 'DT-PHASE', target: 'RC-MISALIGN', type: 'CONFIRMS', band: 'med', probability: 0.7, result: '2×RPM component elevated relative to 1×RPM' },
  { source: 'DT-HOUSING-INSPECT', target: 'RC-BEARING-SPALL', type: 'CONFIRMS', band: 'high', probability: 0.95, result: 'Visible race spalling / pitting on NDE bearing' },
  { source: 'DT-HOUSING-INSPECT', target: 'RC-BENT-SHAFT', type: 'RULES_OUT', band: 'med', probability: 0.6, result: 'Bearing housing intact — bow unlikely the primary' },
  { source: 'DT-RUNOUT', target: 'RC-BENT-SHAFT', type: 'CONFIRMS', band: 'high', probability: 0.9, result: 'Total indicated runout exceeds tolerance' },
  { source: 'DT-ALIGNMENT', target: 'RC-MISALIGN', type: 'CONFIRMS', band: 'high', probability: 0.92, result: 'Offset / angularity out of tolerance' },
  { source: 'DT-ALIGNMENT', target: 'RC-BENT-SHAFT', type: 'RULES_OUT', band: 'low', probability: 0.4, result: 'Coupling aligned within tolerance' },
  { source: 'DT-OIL-ANALYSIS', target: 'RC-LUBE-FAIL', type: 'CONFIRMS', band: 'high', probability: 0.9, result: 'High particle/water count; viscosity off-spec' },
  { source: 'DT-OIL-ANALYSIS', target: 'RC-BEARING-SPALL', type: 'CONFIRMS', band: 'med', probability: 0.65, result: 'Ferrous spall debris in ferrography' },

  // INCONCLUSIVE — the second outcome of each confirmatory test (test ran, didn't confirm → escalate)
  { source: 'DT-RUNOUT', target: 'NEEDS-INFO', type: 'INCONCLUSIVE', result: 'Runout within tolerance → shaft bow not confirmed; gather more data' },
  { source: 'DT-ALIGNMENT', target: 'NEEDS-INFO', type: 'INCONCLUSIVE', result: 'Alignment within tolerance → misalignment not confirmed; gather more data' },
  { source: 'DT-OIL-ANALYSIS', target: 'NEEDS-INFO', type: 'INCONCLUSIVE', result: 'Oil clean → lube failure / spalling not confirmed; gather more data' },

  // ── PROPOSED edges (wiring for the new cause — dashed until approval) ──
  { source: 'DT-PHASE', target: 'DT-WELD-NDT', type: 'FOLLOW_UP', result: 'Harmonics near discharge weld → run weld NDT', state: 'proposed', proposeStep: 5 },
  { source: 'DT-WELD-NDT', target: 'RC-CASING-CRACK', type: 'CONFIRMS', band: 'high', probability: 0.9, result: 'PT/MT indication at volute weld toe', state: 'proposed', proposeStep: 5 },
  { source: 'DT-WELD-NDT', target: 'NEEDS-INFO', type: 'INCONCLUSIVE', result: 'No weld indication → casing crack not confirmed; gather more data', state: 'proposed', proposeStep: 5 },
]
