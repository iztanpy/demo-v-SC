// ── Fleet-wide diagnostic KNOWLEDGE GRAPH (~100 nodes) for the 2D force renderer ──
// Modelled on the Tessera PRD: each ASSET CLASS is its own readable SECTION (its own hub +
// symptoms + tests + causes, settled in its own region), and interconnectedness comes from
// cross-class SIMILAR_TO bridges between analogous nodes (a failure mode / test that recurs on
// another asset class — e.g. "bearing wear" on the gas turbine ↔ "bearing wear" on the BFP).
// The bridges show the web WITHOUT collapsing the regions into one central hairball.
//
// Node COLOUR = type (asset/symptom/test/cause). Asset-class LABELS name each region; subtle
// tints give orientation. Every backdrop node now carries a curated, real P&U title (symptom /
// test / cause) drawn from CLUSTER_CHAINS — coherent symptom→test→cause trees, no invented
// standards. The fully-detailed real diagnostic tree is the BFP / SYM-001 cluster, imported from
// graph.ts and folded into the BFP region.
import { FOCUS_NODES, FOCUS_EDGES } from './graph'
import type { NodeLabel, RelType } from '../types'

export interface SimNodeData {
  id: string
  label: NodeLabel
  /** cluster key = asset-class key (every node belongs to exactly one region) */
  cluster: string
  r: number
  context: boolean
  /** only AssetClass hubs + the focus tree carry a title */
  title?: string
  tier?: 'triage' | 'followup'
  /** failure-mode / test family — drives the cross-class SIMILAR_TO bridges */
  kind?: string
}
export interface SimEdgeData {
  source: string
  target: string
  type: RelType
  context: boolean
  /** true = a cross-class bridge (rendered, but near-zero pull so regions stay apart) */
  cross?: boolean
  /** true = a thin tether from a free-floating (unclustered) node to a region node */
  loose?: boolean
}

export interface ClusterDef {
  key: string
  label: string
  color: string
  syms: number
}
// 5 regions = the combined-cycle train (a real, sensible grouping)
export const CLUSTERS: ClusterDef[] = [
  { key: 'BFP', label: 'Boiler feed pump', color: '#00A651', syms: 3 }, // + the real focus tree
  { key: 'GT', label: 'Compressor', color: '#2563EB', syms: 9 },
  { key: 'HRSG', label: 'Generator', color: '#F59E0B', syms: 7 },
  { key: 'ST', label: 'Air inlet', color: '#7C3AED', syms: 9 },
  { key: 'GEN', label: 'Combustor', color: '#0EA5A4', syms: 7 },
]

export const CLUSTER_LABEL: Record<string, string> = Object.fromEntries(CLUSTERS.map((c) => [c.key, c.label]))
export const CLUSTER_COLOR: Record<string, string> = Object.fromEntries(CLUSTERS.map((c) => [c.key, c.color]))

const seeded = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x) }

// the real BFP units (match the incident assets so a reaffirm can light its own machine green)
const BFP_UNITS = ['BFP-1A', 'BFP-2A', 'BFP-3A', 'BFP-4A', 'BFP-5A', 'BFP-1B', 'BFP-2B', 'BFP-3B']

// per-class curated diagnostic chains — each symptom carries its OWN coherent test→cause tree
// (real P&U failure modes; no invented standards). `kind` tags the shared failure-mode FAMILY so
// analogous causes bridge across asset classes via SIMILAR_TO (e.g. bearing wear on the compressor
// ↔ bearing wear on the BFP). Chain count per class matches CLUSTERS[].syms.
type CauseDef = { name: string; kind?: string }
type TestDef = { name: string; tier: 'triage' | 'followup'; causes: CauseDef[] }
type SymDef = { name: string; tests: TestDef[] }

const CLUSTER_CHAINS: Record<string, SymDef[]> = {
  // BFP backdrop symptoms OTHER than the real SYM-001 NDE-vibration tree (folded in from graph.ts)
  BFP: [
    { name: 'DE bearing temp high', tests: [
      { name: 'DE bearing thermography', tier: 'triage', causes: [{ name: 'Bearing overheating', kind: 'bearing wear' }] },
      { name: 'Lube oil sample', tier: 'followup', causes: [{ name: 'Oil cooler fouling', kind: 'fouling' }] },
    ] },
    { name: 'Mechanical seal leakage', tests: [
      { name: 'Seal face inspection', tier: 'triage', causes: [{ name: 'Seal face wear' }] },
      { name: 'Seal flush flow check', tier: 'followup', causes: [{ name: 'Flush plan blockage', kind: 'fouling' }] },
    ] },
    { name: 'Low discharge pressure', tests: [
      { name: 'Performance curve test', tier: 'triage', causes: [{ name: 'Impeller wear-ring clearance' }] },
    ] },
  ],
  // Compressor (axial GT compressor)
  GT: [
    { name: 'Compressor fouling', tests: [
      { name: 'Wash-cycle trend analysis', tier: 'triage', causes: [{ name: 'Airfoil deposit fouling', kind: 'fouling' }] },
      { name: 'Borescope inspection', tier: 'followup', causes: [{ name: 'Blade leading-edge erosion' }] },
    ] },
    { name: 'Surge margin loss', tests: [
      { name: 'Pressure-ratio trend', tier: 'triage', causes: [{ name: 'Compressor surge margin loss' }] },
    ] },
    { name: 'IGV schedule deviation', tests: [
      { name: 'IGV stroke test', tier: 'triage', causes: [{ name: 'IGV actuator drift' }] },
    ] },
    { name: 'Inter-stage temp deviation', tests: [
      { name: 'Thermocouple cross-check', tier: 'triage', causes: [{ name: 'Inter-stage seal leakage' }] },
    ] },
    { name: 'High axial vibration', tests: [
      { name: 'Vibration spectrum (1×/2×)', tier: 'triage', causes: [{ name: 'Rotor unbalance' }] },
      { name: 'Laser alignment check', tier: 'followup', causes: [{ name: 'Coupling misalignment', kind: 'misalignment' }] },
    ] },
    { name: 'Bearing metal temp high', tests: [
      { name: 'Bearing RTD trend', tier: 'triage', causes: [{ name: 'Journal bearing wear', kind: 'bearing wear' }] },
      { name: 'Lube oil analysis', tier: 'followup', causes: [{ name: 'Oil film breakdown', kind: 'lubrication' }] },
    ] },
    { name: 'Blade tip-clearance drift', tests: [
      { name: 'Tip-timing measurement', tier: 'triage', causes: [{ name: 'Blade creep elongation' }] },
    ] },
    { name: 'Blade crack indication', tests: [
      { name: 'Borescope crack mapping', tier: 'triage', causes: [{ name: 'Airfoil fatigue crack', kind: 'fatigue crack' }] },
    ] },
    { name: 'Discharge pressure low', tests: [
      { name: 'Corrected-flow performance test', tier: 'triage', causes: [{ name: 'Compressor efficiency loss', kind: 'fouling' }] },
    ] },
  ],
  // Generator (electrical generator)
  HRSG: [
    { name: 'Stator winding temp high', tests: [
      { name: 'Stator RTD trend', tier: 'triage', causes: [{ name: 'Stator cooling restriction', kind: 'fouling' }] },
      { name: 'Partial-discharge test', tier: 'followup', causes: [{ name: 'Stator insulation degradation' }] },
    ] },
    { name: 'Rotor ground fault', tests: [
      { name: 'Rotor IR / insulation test', tier: 'triage', causes: [{ name: 'Rotor winding ground fault' }] },
    ] },
    { name: 'High shaft vibration', tests: [
      { name: 'Vibration spectrum analysis', tier: 'triage', causes: [{ name: 'Generator-turbine misalignment', kind: 'misalignment' }] },
      { name: 'Pedestal phase check', tier: 'followup', causes: [{ name: 'Bearing pedestal looseness' }] },
    ] },
    { name: 'Bearing oil temp high', tests: [
      { name: 'Bearing RTD trend', tier: 'triage', causes: [{ name: 'Journal bearing wear', kind: 'bearing wear' }] },
      { name: 'Lube oil analysis', tier: 'followup', causes: [{ name: 'Lube oil contamination', kind: 'lubrication' }] },
    ] },
    { name: 'Seal-oil pressure low', tests: [
      { name: 'Seal-oil system check', tier: 'triage', causes: [{ name: 'Seal-oil pump degradation' }] },
    ] },
    { name: 'Core hot-spot', tests: [
      { name: 'Core monitor (ozone) check', tier: 'triage', causes: [{ name: 'Stator core lamination fault' }] },
    ] },
    { name: 'Excitation instability', tests: [
      { name: 'AVR diagnostic', tier: 'triage', causes: [{ name: 'Excitation system fault' }] },
    ] },
  ],
  // Air inlet (GT inlet / filter house)
  ST: [
    { name: 'Inlet filter dP high', tests: [
      { name: 'Filter dP trend', tier: 'triage', causes: [{ name: 'Filter media fouling', kind: 'fouling' }] },
      { name: 'Pulse-clean system check', tier: 'followup', causes: [{ name: 'Pulse valve failure' }] },
    ] },
    { name: 'Evap-cooler dP rise', tests: [
      { name: 'Cooler media inspection', tier: 'triage', causes: [{ name: 'Cooler media scaling', kind: 'fouling' }] },
    ] },
    { name: 'Anti-icing temp low', tests: [
      { name: 'Bleed-air flow check', tier: 'triage', causes: [{ name: 'Anti-icing valve fault' }] },
    ] },
    { name: 'Inlet duct vibration', tests: [
      { name: 'Duct accelerometer trend', tier: 'triage', causes: [{ name: 'Duct panel fatigue crack', kind: 'fatigue crack' }] },
    ] },
    { name: 'Silencer baffle damage', tests: [
      { name: 'Baffle borescope inspection', tier: 'triage', causes: [{ name: 'Baffle media migration' }] },
    ] },
    { name: 'Fogger humidity deviation', tests: [
      { name: 'Fogging nozzle inspection', tier: 'triage', causes: [{ name: 'Fogging nozzle blockage', kind: 'fouling' }] },
    ] },
    { name: 'Trash-screen blockage', tests: [
      { name: 'Screen dP check', tier: 'triage', causes: [{ name: 'Debris accumulation' }] },
    ] },
    { name: 'Inlet bleed-heat deviation', tests: [
      { name: 'IBH valve stroke test', tier: 'triage', causes: [{ name: 'IBH valve sticking' }] },
    ] },
    { name: 'Water carryover', tests: [
      { name: 'Drift / drain inspection', tier: 'triage', causes: [{ name: 'Drift eliminator failure' }] },
    ] },
  ],
  // Combustor (GT combustion system)
  GEN: [
    { name: 'Exhaust temp spread high', tests: [
      { name: 'EGT thermocouple mapping', tier: 'triage', causes: [{ name: 'Fuel nozzle coking', kind: 'fouling' }] },
      { name: 'Fuel-split rebalance check', tier: 'followup', causes: [{ name: 'Fuel distribution imbalance' }] },
    ] },
    { name: 'Combustion dynamics high', tests: [
      { name: 'Dynamic-pressure spectrum', tier: 'triage', causes: [{ name: 'Combustion instability' }] },
    ] },
    { name: 'Liner crack indication', tests: [
      { name: 'Borescope crack mapping', tier: 'triage', causes: [{ name: 'Liner thermal-fatigue crack', kind: 'fatigue crack' }] },
    ] },
    { name: 'Transition-piece distress', tests: [
      { name: 'Transition-piece borescope', tier: 'triage', causes: [{ name: 'Transition-piece burn-through' }] },
    ] },
    { name: 'Loss of flame', tests: [
      { name: 'Flame-scanner check', tier: 'triage', causes: [{ name: 'Flame detector fault' }] },
    ] },
    { name: 'Fuel nozzle dP deviation', tests: [
      { name: 'Nozzle flow test', tier: 'triage', causes: [{ name: 'Fuel nozzle erosion' }] },
    ] },
    { name: 'NOx emissions high', tests: [
      { name: 'Emissions trend analysis', tier: 'triage', causes: [{ name: 'DLN tuning drift' }] },
    ] },
  ],
}

function buildBackdrop(): { nodes: SimNodeData[]; edges: SimEdgeData[] } {
  const nodes: SimNodeData[] = []
  const edges: SimEdgeData[] = []
  let seed = 1
  const rnd = () => seeded(seed++)

  for (const c of CLUSTERS) {
    nodes.push({ id: `${c.key}-AC`, label: 'AssetClass', cluster: c.key, r: 28, context: true, title: c.label })
    // physical machines (units) per asset class — green instance nodes off the hub. The BFP units
    // are the REAL incident assets, so a reaffirming incident can light up its own machine.
    const units = c.key === 'BFP' ? BFP_UNITS : Array.from({ length: 2 + Math.floor(rnd() * 3) }, (_, m) => `${c.key}-M${m}`)
    for (const mid of units) {
      nodes.push({ id: mid, label: 'Machine', cluster: c.key, r: c.key === 'BFP' ? 13 : 11 + rnd() * 3, context: true, title: c.key === 'BFP' ? mid : undefined })
      edges.push({ source: mid, target: `${c.key}-AC`, type: 'INSTANCE_OF', context: true })
    }
    const chains = CLUSTER_CHAINS[c.key] ?? []
    chains.forEach((sym, s) => {
      const symId = `${c.key}-S${s}`
      nodes.push({ id: symId, label: 'Symptom', cluster: c.key, r: 15 + rnd() * 5, context: true, title: sym.name })
      edges.push({ source: symId, target: `${c.key}-AC`, type: 'OCCURS_IN', context: true })
      sym.tests.forEach((test, t) => {
        const testId = `${symId}-T${t}`
        nodes.push({ id: testId, label: 'DiagnosticTest', cluster: c.key, r: 10 + rnd() * 4, context: true, tier: test.tier, title: test.name })
        edges.push({ source: symId, target: testId, type: 'TRIGGERS', context: true })
        test.causes.forEach((cause, k) => {
          const causeId = `${testId}-C${k}`
          nodes.push({ id: causeId, label: 'RootCause', cluster: c.key, r: 12 + rnd() * 4, context: true, kind: cause.kind, title: cause.name })
          edges.push({ source: testId, target: causeId, type: 'CONFIRMS', context: true })
        })
      })
    })
  }

  // ── cross-class SIMILAR_TO bridges: for each failure-mode family, chain ONE representative per
  // class together. Connects the regions into one web without dragging them to the centre. ──
  const addBridges = (familyNodes: SimNodeData[]) => {
    const byKind: Record<string, SimNodeData[]> = {}
    for (const n of familyNodes) {
      if (!n.kind) continue
      ;(byKind[n.kind] ??= [])
      // one representative per class per kind
      if (!byKind[n.kind].some((x) => x.cluster === n.cluster)) byKind[n.kind].push(n)
    }
    for (const reps of Object.values(byKind)) {
      for (let i = 0; i < reps.length - 1; i++) {
        edges.push({ source: reps[i].id, target: reps[i + 1].id, type: 'SIMILAR_TO', context: true, cross: true })
      }
    }
  }
  addBridges(nodes.filter((n) => n.label === 'RootCause')) // bridge failure modes only (fewer, cleaner)

  return { nodes, edges }
}

const backdrop = buildBackdrop()

// Fold the REAL BFP diagnostic tree (graph.ts focus) into the BFP region. The PROPOSED elements
// (the casing-crack node + its test/edges) are EXCLUDED from the initial graph — their absence is
// the gap the exception incident surfaces; Panel 3 adds them on approval.
const focusR = (n: { label: NodeLabel; tier?: 'triage' | 'followup' }) =>
  n.label === 'AssetClass' ? 28 : n.label === 'Symptom' ? 22 : n.label === 'RootCause' ? 18 : n.tier === 'followup' ? 13 : 16
const PROPOSED = new Set(FOCUS_NODES.filter((n) => n.state === 'proposed').map((n) => n.id))

const focusNodes: SimNodeData[] = FOCUS_NODES.filter((n) => n.state !== 'proposed').map((n) => ({
  id: n.id, label: n.label, cluster: 'BFP', r: focusR(n), context: false, title: n.title, tier: n.tier,
}))
const focusEdges: SimEdgeData[] = FOCUS_EDGES
  .filter((e) => e.state !== 'proposed' && !PROPOSED.has(e.source) && !PROPOSED.has(e.target))
  .map((e) => ({ source: e.source, target: e.target, type: e.type, context: false }))

// the proposed casing-crack node + test + edges — added to the graph by Panel 3 on sign-off
export const PROPOSED_NODES: SimNodeData[] = FOCUS_NODES.filter((n) => n.state === 'proposed').map((n) => ({
  id: n.id, label: n.label, cluster: 'BFP', r: focusR(n), context: false, title: n.title, tier: n.tier,
}))
export const PROPOSED_EDGES: SimEdgeData[] = [
  ...FOCUS_EDGES
    .filter((e) => e.state === 'proposed' || PROPOSED.has(e.source) || PROPOSED.has(e.target))
    .map((e) => ({ source: e.source, target: e.target, type: e.type, context: false })),
  // The DE-bearing temperature spike is what prompted the dye-penetrant weld NDT — renders when
  // DT-WELD-NDT is committed (Panel 3 approval). BFP-S0 = "DE bearing temp high" backdrop symptom.
  { source: 'BFP-S0', target: 'DT-WELD-NDT', type: 'TRIGGERS', context: false },
]

// drop the generated BFP hub in favour of the real AC-BFP; reroute generated BFP symptoms to it
const SIM_NODES: SimNodeData[] = [...backdrop.nodes.filter((n) => n.id !== 'BFP-AC'), ...focusNodes]

// integrate the BFP units INTO the diagnostic pathway: each unit exhibits the SYM-001 symptom, so
// a reaffirming incident lights its machine → SYM-001 → test → cause as one connected green chain.
const machineSymptomEdges: SimEdgeData[] = BFP_UNITS.map((u) => ({ source: u, target: 'SYM-001', type: 'OCCURS_IN', context: true }))

const SIM_EDGES: SimEdgeData[] = [
  ...backdrop.edges.map((e) => (e.target === 'BFP-AC' ? { ...e, target: 'AC-BFP' } : e)),
  ...focusEdges,
  ...machineSymptomEdges,
]

export const FLEET_NODES = SIM_NODES
export const FLEET_EDGES = SIM_EDGES
export const FLEET_NODE_COUNT = SIM_NODES.length
export const FLEET_EDGE_COUNT = SIM_EDGES.length
