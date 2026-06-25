// ── Fleet-wide diagnostic KNOWLEDGE GRAPH (~100 nodes) for the 2D force renderer ──
// Modelled on the Tessera PRD: each ASSET CLASS is its own readable SECTION (its own hub +
// symptoms + tests + causes, settled in its own region), and interconnectedness comes from
// cross-class SIMILAR_TO bridges between analogous nodes (a failure mode / test that recurs on
// another asset class — e.g. "bearing wear" on the gas turbine ↔ "bearing wear" on the BFP).
// The bridges show the web WITHOUT collapsing the regions into one central hairball.
//
// Node COLOUR = type (asset/symptom/test/cause). Asset-class LABELS name each region; subtle
// tints give orientation. Individual backdrop nodes stay generic/unlabelled (no fabricated
// per-node standards). The fully-detailed real diagnostic tree is the BFP / SYM-001 cluster,
// imported from graph.ts and folded into the BFP region.
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

// shared FAMILIES (not shared nodes) — each class gets its OWN node of a family; the families
// are what we bridge across classes with SIMILAR_TO.
const TEST_KINDS = ['vibration', 'thermal', 'oil', 'alignment', 'ndt']
const CAUSE_KINDS = ['bearing wear', 'misalignment', 'lubrication', 'fouling', 'fatigue crack']

function buildBackdrop(): { nodes: SimNodeData[]; edges: SimEdgeData[] } {
  const nodes: SimNodeData[] = []
  const edges: SimEdgeData[] = []
  let seed = 1
  const rnd = () => seeded(seed++)
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]

  for (const c of CLUSTERS) {
    nodes.push({ id: `${c.key}-AC`, label: 'AssetClass', cluster: c.key, r: 28, context: true, title: c.label })
    // physical machines (units) per asset class — green instance nodes off the hub. The BFP units
    // are the REAL incident assets, so a reaffirming incident can light up its own machine.
    const units = c.key === 'BFP' ? BFP_UNITS : Array.from({ length: 2 + Math.floor(rnd() * 3) }, (_, m) => `${c.key}-M${m}`)
    for (const mid of units) {
      nodes.push({ id: mid, label: 'Machine', cluster: c.key, r: c.key === 'BFP' ? 13 : 11 + rnd() * 3, context: true, title: c.key === 'BFP' ? mid : undefined })
      edges.push({ source: mid, target: `${c.key}-AC`, type: 'INSTANCE_OF', context: true })
    }
    for (let s = 0; s < c.syms; s++) {
      const symId = `${c.key}-S${s}`
      nodes.push({ id: symId, label: 'Symptom', cluster: c.key, r: 15 + rnd() * 5, context: true })
      edges.push({ source: symId, target: `${c.key}-AC`, type: 'OCCURS_IN', context: true })

      const nTests = 1 + Math.floor(rnd() * 2) // 1–2 tests
      for (let t = 0; t < nTests; t++) {
        const testId = `${symId}-T${t}`
        nodes.push({ id: testId, label: 'DiagnosticTest', cluster: c.key, r: 10 + rnd() * 4, context: true, tier: rnd() > 0.6 ? 'followup' : 'triage', kind: pick(TEST_KINDS) })
        edges.push({ source: symId, target: testId, type: 'TRIGGERS', context: true })
        const nCauses = 1 + (rnd() > 0.6 ? 1 : 0) // sometimes 2 — fills space with more nodes
        for (let k = 0; k < nCauses; k++) {
          const causeId = `${testId}-C${k}`
          nodes.push({ id: causeId, label: 'RootCause', cluster: c.key, r: 12 + rnd() * 4, context: true, kind: pick(CAUSE_KINDS) })
          edges.push({ source: testId, target: causeId, type: 'CONFIRMS', context: true })
        }
      }
    }
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
export const PROPOSED_EDGES: SimEdgeData[] = FOCUS_EDGES
  .filter((e) => e.state === 'proposed' || PROPOSED.has(e.source) || PROPOSED.has(e.target))
  .map((e) => ({ source: e.source, target: e.target, type: e.type, context: false }))

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
