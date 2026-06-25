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
// viewBox frame around the SYM-001 focus cluster (slide ≥2 lands here, on the RIGHT of canvas).
export const VIEWBOX = { x: 1030, y: 120, w: 1490, h: 1010 }

// Column x positions — the focus cluster sits to the RIGHT of the central AssetClass hub.
export const COLS = { asset: 1150, symptom: 1430, l1: 1710, l2: 2000, cause: 2350 }

export const NODE_COLORS: Record<NodeLabel, string> = {
  AssetClass: '#64748B',     // slate — the equipment class
  Machine: '#16A34A',        // green — a physical unit (instance of the class)
  Symptom: '#F59E0B',        // amber — the alert
  DiagnosticTest: '#2563EB', // blue — the tests
  RootCause: '#DC2626',      // red — the culprits
  Inconclusive: '#7C3AED',   // violet — the "more info needed" escalation sink
}

export const NODE_LABELS: NodeLabel[] = ['AssetClass', 'Machine', 'Symptom', 'DiagnosticTest', 'RootCause', 'Inconclusive']

// Column headers drawn across the top of the graph.
export const COL_HEADERS: { x: number; label: string }[] = [
  { x: COLS.symptom, label: 'Symptom' },
  { x: COLS.l1, label: 'Test layer 1' },
  { x: COLS.l2, label: 'Test layer 2' },
  { x: COLS.cause, label: 'Root causes' },
]

export const FOCUS_NODES: GraphNode[] = [
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
  { id: 'RC-BENT-SHAFT', label: 'RootCause', title: 'Shaft misalignment', x: COLS.cause, y: 210, props: { name: 'Shaft misalignment', description: 'Pump-driver shaft misalignment driving elevated vibration and bearing load', solution: 'Laser-align pump-driver shaft to tolerance; correct soft foot; renew worn coupling element' } },
  { id: 'RC-MISALIGN', label: 'RootCause', title: 'Coupling misalignment', x: COLS.cause, y: 400, props: { name: 'Coupling misalignment', description: 'Pump-driver coupling misalignment driving 2×RPM vibration and bearing load', solution: 'Laser-align pump-driver coupling to tolerance; renew worn coupling element' } },
  { id: 'RC-BEARING-SPALL', label: 'RootCause', title: 'Bearing spalling', x: COLS.cause, y: 590, props: { name: 'Bearing race spalling', description: 'NDE bearing race surface fatigue / spalling', solution: 'Replace NDE bearing; verify lubrication & housing fit' } },
  { id: 'RC-LUBE-FAIL', label: 'RootCause', title: 'Lube failure', x: COLS.cause, y: 780, props: { name: 'Lubrication failure', description: 'Oil starvation / contamination degrading the NDE bearing', solution: 'Flush & replace lubricant; correct oil supply / cooler; fit breather' } },

  // ── inconclusive sink — the second outcome of every confirmatory test ──
  { id: 'NEEDS-INFO', label: 'Inconclusive', title: 'More info needed', x: 1850, y: 1050, props: { name: 'More information needed', description: 'Confirmatory test inconclusive — escalate for expert review / further data before committing a repair' } },

  // ── PROPOSED nodes (the week's recommended add — dashed/ghost until approval at step 8) ──
  { id: 'DT-WELD-NDT', label: 'DiagnosticTest', title: 'Weld NDT', x: COLS.l2, y: 940, tier: 'followup', state: 'proposed', proposeStep: 6, batch: 1, props: { name: 'Weld NDT / dye-penetrant inspection (volute, near discharge)', layer: 'follow-up (confirmatory)', method: 'PT/MT of casing volute & discharge-weld region', cost_band: 'med', required_certs: ['NDT Level 2 (PT/MT)'] } },
  { id: 'RC-CASING-CRACK', label: 'RootCause', title: 'Casing crack', x: COLS.cause, y: 970, state: 'proposed', proposeStep: 6, batch: 1, props: { name: 'Pump casing crack / weld fatigue', description: 'Volute / discharge weld-toe crack; casing fatigue mimicking shaft-misalignment vibration signatures', solution: 'Weld repair + PWHT of volute / discharge weld; MPI re-check; review casing fatigue life' } },
]

// `result` on every test edge = the observed test finding that drives it (shown when the
// edge is clicked). On FOLLOW_UP it's the triage outcome that escalates to the next test.
export const FOCUS_EDGES: GraphEdge[] = [
  // symptom scoped to asset class
  { source: 'SYM-001', target: 'AC-BFP', type: 'OCCURS_IN' },

  // symptom → layer-1 (triage) tests (cheap/decisive first)
  { source: 'SYM-001', target: 'DT-PHASE', type: 'TRIGGERS', order: 1, result: 'First-line: cheap, non-invasive, most discriminating' },
  { source: 'SYM-001', target: 'DT-HOUSING-INSPECT', type: 'TRIGGERS', order: 2, result: 'First-line visual / borescope of NDE bearing race' },

  // FOLLOW_UP — single L1→L2 hop when a triage test isn't decisive on its own
  { source: 'DT-PHASE', target: 'DT-RUNOUT', type: 'FOLLOW_UP', result: 'Directional phase signature → confirm with shaft runout (TIR)' },
  { source: 'DT-PHASE', target: 'DT-ALIGNMENT', type: 'FOLLOW_UP', result: '2×RPM dominant → confirm with alignment check' },
  { source: 'DT-HOUSING-INSPECT', target: 'DT-OIL-ANALYSIS', type: 'FOLLOW_UP', result: 'No visible spalling → escalate to oil debris analysis' },

  // test → root cause (probability = how diagnostic). 1-layer (triage confirms) + 2-layer (follow-up confirms).
  // ⭐ re-weight target: phase over-confirms shaft misalignment at 0.88 today; week proposes 0.70
  { source: 'DT-PHASE', target: 'RC-BENT-SHAFT', type: 'CONFIRMS', band: 'high', probability: 0.88, oldProbability: 0.88, newProbability: 0.70, reweightProposeStep: 6, batch: 1, result: 'Elevated 1×/2×RPM with ~180° phase shift across the coupling' },
  { source: 'DT-PHASE', target: 'RC-MISALIGN', type: 'CONFIRMS', band: 'med', probability: 0.7, result: '2×RPM component elevated relative to 1×RPM' },
  { source: 'DT-HOUSING-INSPECT', target: 'RC-BEARING-SPALL', type: 'CONFIRMS', band: 'high', probability: 0.95, result: 'Visible race spalling / pitting on NDE bearing' },
  { source: 'DT-RUNOUT', target: 'RC-BENT-SHAFT', type: 'CONFIRMS', band: 'high', probability: 0.9, result: 'Shaft / coupling TIR exceeds tolerance' },
  { source: 'DT-ALIGNMENT', target: 'RC-MISALIGN', type: 'CONFIRMS', band: 'high', probability: 0.92, result: 'Offset / angularity out of tolerance' },
  { source: 'DT-OIL-ANALYSIS', target: 'RC-LUBE-FAIL', type: 'CONFIRMS', band: 'high', probability: 0.9, result: 'High particle/water count; viscosity off-spec' },
  { source: 'DT-OIL-ANALYSIS', target: 'RC-BEARING-SPALL', type: 'CONFIRMS', band: 'med', probability: 0.65, result: 'Ferrous spall debris in ferrography' },

  // INCONCLUSIVE — the second outcome of each confirmatory test (test ran, didn't confirm → escalate)
  { source: 'DT-RUNOUT', target: 'NEEDS-INFO', type: 'INCONCLUSIVE', result: 'TIR within tolerance → shaft misalignment not confirmed; gather more data' },
  { source: 'DT-ALIGNMENT', target: 'NEEDS-INFO', type: 'INCONCLUSIVE', result: 'Alignment within tolerance → misalignment not confirmed; gather more data' },
  { source: 'DT-OIL-ANALYSIS', target: 'NEEDS-INFO', type: 'INCONCLUSIVE', result: 'Oil clean → lube failure / spalling not confirmed; gather more data' },

  // ── PROPOSED edges (wiring for the new cause — dashed until approval) ──
  { source: 'DT-PHASE', target: 'DT-WELD-NDT', type: 'FOLLOW_UP', result: 'Harmonics near discharge weld → run weld NDT', state: 'proposed', proposeStep: 6, batch: 1 },
  { source: 'DT-WELD-NDT', target: 'RC-CASING-CRACK', type: 'CONFIRMS', band: 'high', probability: 0.9, result: 'PT/MT indication at volute weld toe', state: 'proposed', proposeStep: 6, batch: 1 },
  { source: 'DT-WELD-NDT', target: 'NEEDS-INFO', type: 'INCONCLUSIVE', result: 'No weld indication → casing crack not confirmed; gather more data', state: 'proposed', proposeStep: 6, batch: 1 },

  // ── PROPOSED shortcut (batch 2) — captured from a call: skip triage, go straight to runout.
  // On approval this formalises into a first-line TRIGGERS edge (Shaft runout promoted to L1). ──
  { source: 'SYM-001', target: 'DT-RUNOUT', type: 'SHORTCUT', order: 3, result: 'Captured call: “Signature’s obvious — skip phase, go straight to the runout (TIR)”', state: 'proposed', proposeStep: 6, batch: 2 },
]

// ── Decorative "rest of the KG" — a dense RADIAL field: other BFP symptoms ringing the
// centre, with their tests / causes radiating outward, and varied node sizes for an organic,
// non-uniform look. Dense on slide 1; dimmed + clipped once we zoom into SYM-001 on slide 2.
// Coordinates are generated deterministically (seeded) so the layout is stable across renders.
const CTX_CENTER = { x: COLS.asset, y: 500 } // the AssetClass hub
const seeded = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x) }

// Each chain mirrors the real structure radiating outward: Symptom → triage test →
// (sometimes) follow-up test → root cause. Some chains are 3-tier (no follow-up).
type CtxChain = { triage: string; followup?: string; cause: string }
const CTX_DEFS: { id: string; title: string; chains: CtxChain[] }[] = [
  { id: 'SYM-002', title: 'DE bearing temp high', chains: [{ triage: 'Thermography', followup: 'Lube sample', cause: 'Bearing overheating' }, { triage: 'IR scan', cause: 'Cooler fouling' }] },
  { id: 'SYM-003', title: 'Mech seal leakage', chains: [{ triage: 'Seal face inspect', cause: 'Seal face wear' }, { triage: 'Flush check', followup: 'Pressure test', cause: 'Flush failure' }] },
  { id: 'SYM-004', title: 'Low discharge head', chains: [{ triage: 'Performance test', followup: 'Clearance check', cause: 'Impeller wear' }, { triage: 'Flow trend', cause: 'Recirculation' }] },
  { id: 'SYM-005', title: 'Motor current high', chains: [{ triage: 'Current spectrum', followup: 'Insulation test', cause: 'Winding fault' }, { triage: 'Rotor scan', cause: 'Rotor bar fault' }] },
  { id: 'SYM-006', title: 'Suction press low', chains: [{ triage: 'NPSH check', cause: 'Cavitation' }, { triage: 'Strainer inspect', cause: 'Strainer blockage' }] },
  { id: 'SYM-007', title: 'Casing vib broadband', chains: [{ triage: 'Spectrum scan', followup: 'Foundation check', cause: 'Soft foot' }, { triage: 'Bolt torque check', cause: 'Looseness' }] },
  { id: 'SYM-008', title: 'Thrust bearing wear', chains: [{ triage: 'Axial probe', followup: 'Pad temp check', cause: 'Thrust pad wear' }] },
  { id: 'SYM-009', title: 'Gland steam leak', chains: [{ triage: 'Visual inspect', cause: 'Gland wear' }] },
  { id: 'SYM-010', title: 'Coupling vibration', chains: [{ triage: 'Alignment check', cause: 'Coupling wear' }, { triage: 'Spacer inspect', cause: 'Spacer fault' }] },
  { id: 'SYM-011', title: 'Discharge temp high', chains: [{ triage: 'Flow trend', followup: 'Valve check', cause: 'Min-flow valve' }, { triage: 'Thermal scan', cause: 'Dead-head' }] },
]

const CONTEXT_NODES: GraphNode[] = []
const CONTEXT_EDGES: GraphEdge[] = []
CTX_DEFS.forEach((def, i) => {
  const seed = i + 1
  // ring the hub through the left / top / bottom arc (avoid the right, where the focus lives)
  const ang = Math.PI * 0.30 + (i / (CTX_DEFS.length - 1)) * Math.PI * 1.40 + (seeded(seed) - 0.5) * 0.10
  const symR = 320 + seeded(seed * 2) * 160
  CONTEXT_NODES.push({ id: def.id, label: 'Symptom', title: def.title, x: CTX_CENTER.x + Math.cos(ang) * symR, y: CTX_CENTER.y + Math.sin(ang) * symR, context: true, size: 30 + seeded(seed * 3) * 16, props: { name: def.title } })
  CONTEXT_EDGES.push({ source: def.id, target: 'AC-BFP', type: 'OCCURS_IN', context: true }) // yellow spoke into the hub
  const m = def.chains.length
  // downward-pointing (bottom) symptoms get a NARROWER chain fan so their chains don't collide
  // with neighbours; sides/top keep the full fan. downness: 0 at sides/top → 1 straight down.
  const downness = Math.max(0, Math.sin(ang))
  const chainSpread = 0.44 - 0.20 * downness
  def.chains.forEach((ch, k) => {
    const chAng = ang + (k - (m - 1) / 2) * chainSpread + (seeded(seed * 5 + k) - 0.5) * 0.06
    const pt = (radius: number) => ({ x: CTX_CENTER.x + Math.cos(chAng) * radius, y: CTX_CENTER.y + Math.sin(chAng) * radius })
    // tiers radiate outward: triage (blue) → optional follow-up (blue) → cause (red)
    const rTriage = symR + 200 + seeded(seed * 7 + k) * 50
    const triageId = `${def.id}-T${k}`
    CONTEXT_NODES.push({ id: triageId, label: 'DiagnosticTest', title: ch.triage, tier: 'triage', context: true, ...pt(rTriage), size: 18 + seeded(seed * 8 + k) * 10, props: { name: ch.triage } })
    CONTEXT_EDGES.push({ source: def.id, target: triageId, type: 'TRIGGERS', context: true })
    let lastId = triageId
    let rCause = rTriage + 210
    if (ch.followup) {
      const rFu = rTriage + 200
      const fuId = `${def.id}-F${k}`
      CONTEXT_NODES.push({ id: fuId, label: 'DiagnosticTest', title: ch.followup, tier: 'followup', context: true, ...pt(rFu), size: 14 + seeded(seed * 9 + k) * 8, props: { name: ch.followup } })
      CONTEXT_EDGES.push({ source: triageId, target: fuId, type: 'FOLLOW_UP', context: true })
      lastId = fuId
      rCause = rFu + 200
    }
    const causeId = `${def.id}-C${k}`
    CONTEXT_NODES.push({ id: causeId, label: 'RootCause', title: ch.cause, context: true, ...pt(rCause), size: 22 + seeded(seed * 10 + k) * 10, props: { name: ch.cause } })
    CONTEXT_EDGES.push({ source: lastId, target: causeId, type: 'CONFIRMS', context: true })
  })
})

// Full canvas = the SYM-001 focus cluster + the dense radial backdrop.
export const NODES: GraphNode[] = [...FOCUS_NODES, ...CONTEXT_NODES]
export const EDGES: GraphEdge[] = [...FOCUS_EDGES, ...CONTEXT_EDGES]

// Fit the whole dense canvas into the focus viewBox frame (slide 1, zoomed out). On slide ≥2
// the zoom group returns to identity → the viewBox lands on the SYM-001 focus on the right.
function fitTransform(nodes: GraphNode[], vb: { x: number; y: number; w: number; h: number }): string {
  const pad = 90
  const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y)
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad
  const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad
  const ew = maxX - minX, eh = maxY - minY
  const s = Math.min(vb.w / ew, vb.h / eh)
  const tx = vb.x + (vb.w - s * ew) / 2 - s * minX
  const ty = vb.y + (vb.h - s * eh) / 2 - s * minY
  return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(4)})`
}
export const DENSE_TRANSFORM = fitTransform(NODES, VIEWBOX)
