// ── Agent roster (v2 — ingest → analyze → recommend → validate + human gate) ──
export type TeamKey = 'intake' | 'synth' | 'curator' | 'critic'

export interface TeamDef {
  key: TeamKey
  label: string
  verb: string
  color: string
}

/** a single skill belonging to one agent. Skills flash in timed beats per step. */
export interface SkillDef {
  id: string
  name: string
  role: string
  team: TeamKey
}

/** hubs the handoff packets can flow between (the 4 teams + KG + the doc inbox + the human) */
export type HubKey = TeamKey | 'kg' | 'docs' | 'human'

export interface Handoff {
  from: HubKey
  to: HubKey
  label: string
}

// ── Step timeline ──
/** one skill's pulse within a beat: starts at beat start, pulses for its own durMs. */
export interface BeatSkill {
  id: string
  durMs: number
}
/** a beat: all its skills START together; each ends at its own durMs (parallel, independent
 *  stop). The next beat begins once the beat's longest skill finishes. */
export interface StepBeat {
  skills: BeatSkill[]
}

export interface StepCopy {
  n: number
  title: string
  goal: string
  body: string
  /** ordered beats — drives the timed agent-handoff flashing (useStepTimeline) */
  sequence: StepBeat[]
  /** data packets that animate between hubs at beat boundaries */
  handoffs: Handoff[]
  /** orchestrator's running-narration caption in the agent panel */
  live: string
}

// ── Pure-knowledge graph model (mirrors knowlede-graph-v2/references/knowledge_graph_1.cypher, trimmed) ──
export type NodeLabel = 'AssetClass' | 'Symptom' | 'DiagnosticTest' | 'RootCause' | 'Inconclusive'

// Two-layer diagnostic model, root causes LAST (clearer than the cypher's THEN_IF chaining):
//   Symptom -TRIGGERS-> triage test -FOLLOW_UP-> (sometimes) confirmatory test -CONFIRMS/RULES_OUT-> RootCause
// 1 layer when a triage test is decisive; 2 layers when it escalates via a single FOLLOW_UP hop.
// SIMILAR_TO = a cross-asset-class bridge (same failure mode / test recurring on another class) —
// what makes the fleet graph one interconnected web while each class stays its own region.
export type RelType = 'OCCURS_IN' | 'TRIGGERS' | 'FOLLOW_UP' | 'CONFIRMS' | 'RULES_OUT' | 'INCONCLUSIVE' | 'SHORTCUT' | 'SIMILAR_TO'

export type PropVal = string | number | boolean | string[]

export type NodeState = 'committed' | 'proposed'

/** which test tier a DiagnosticTest belongs to (drives layout column + node size) */
export type TestTier = 'triage' | 'followup'

export interface GraphNode {
  id: string
  label: NodeLabel
  /** short headline rendered under the node circle */
  title: string
  /** full cypher properties, surfaced in the Inspector panel */
  props: Record<string, PropVal>
  x: number
  y: number
  /** for DiagnosticTest nodes: triage (first-line) vs follow-up (confirmatory, smaller) */
  tier?: TestTier
  /** true = decorative "rest of the KG" backdrop (other symptoms) — dense on slide 1, dimmed on zoom-in */
  context?: boolean
  /** explicit circle radius override (used to vary sizes in the dense backdrop) */
  size?: number
  /** committed = part of the current graph; proposed = a pending edit (default committed) */
  state?: NodeState
  /** for proposed nodes: step its dashed `PROPOSED · not applied` preview appears */
  proposeStep?: number
  /** which approval batch applies this proposed node (1 or 2) */
  batch?: number
}

export interface GraphEdge {
  source: string
  target: string
  type: RelType
  // typed edge props
  order?: number
  band?: string
  probability?: number
  /** routing condition on a FOLLOW_UP edge (e.g. "1×RPM dominant") */
  result?: string
  /** true = part of the decorative context backdrop */
  context?: boolean
  /** committed | proposed (default committed) */
  state?: NodeState
  /** for proposed edges: step its preview appears */
  proposeStep?: number
  /** which approval batch applies this proposed element (1 or 2) */
  batch?: number
  // re-weight metadata (for an existing CONFIRMS edge whose probability the week revises)
  oldProbability?: number
  newProbability?: number
  /** step the re-weight proposal enters the changeset (the flip itself only fires on approval) */
  reweightProposeStep?: number
}

// ── Changeset (the "Proposed KG changes" review panel) ──
export type ChangeKind = 'add-node' | 'add-edge' | 'reweight' | 'shortcut'

export interface ProposedChange {
  id: string
  kind: ChangeKind
  /** short headline e.g. "Add RootCause" */
  label: string
  /** e.g. "Pump casing crack / weld fatigue (RC-CASING-CRACK)" */
  detail: string
  /** step at which this line enters the changeset */
  proposeStep: number
  /** which approval batch this change belongs to (1 or 2) */
  batch: number
  /** incident ids that justify this edit (Evidence Audit cites these) */
  cites: string[]
  /** punchy evidence stat for the dossier, e.g. "3 / 3 incidents" */
  evidence: string
  /** one representative quote (the dossier shows just this, not every incident) */
  quote: string
}
