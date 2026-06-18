export type TeamKey = 'doc' | 'data' | 'eval' | 'output'

/** hubs the handoff packets can flow between (the 4 teams + the KG itself) */
export type HubKey = TeamKey | 'kg'

export interface TeamDef {
  key: TeamKey
  label: string
  verb: string
  color: string
}

/** a single skill belonging to one agent (team). Skills light per step. */
export interface SkillDef {
  id: string
  name: string
  role: string
  team: TeamKey
}

export interface Handoff {
  from: HubKey
  to: HubKey
  label: string
}

export interface StepCopy {
  n: number
  title: string
  goal: string
  body: string
  /** skill ids that light inside their agent this step */
  activeAgents: string[]
  /** data packets that animate between hubs / KG this step */
  handoffs: Handoff[]
  /** parallel = handoffs fire concurrently + "∥" badge + simultaneous pulses */
  parallel?: boolean
  /** orchestrator's running-narration caption in the constellation panel */
  live: string
}

// ── Property-graph model (mirrors cypher_queries/relevant_nodes.cypher) ──
export type NodeLabel =
  | 'Symptom'
  | 'Incident'
  | 'Diagnosis'
  | 'RootCause'
  | 'Outcome'
  | 'Technician'
  | 'WorkOrder'
  | 'Conversation'
  | 'ChecklistItem'

export type RelType =
  | 'HAS_INCIDENT'
  | 'HAS_DIAGNOSIS'
  | 'HAS_ROOT_CAUSE'
  | 'HAS_OUTCOME'
  | 'ASSIGNED_TO'
  | 'HAS_WORK_ORDER'
  | 'HAS_CONVERSATION'
  | 'HAS_CHECKLIST_ITEM'
  | 'CORRECTED_BY'

export type PropVal = string | number | boolean | string[]

export interface GraphNode {
  id: string
  label: NodeLabel
  /** short headline rendered under the node circle */
  title: string
  /** full cypher properties, surfaced in the Inspector panel (R2) */
  props: Record<string, PropVal>
  x: number
  y: number
  /** first step at which this node is visible (W3 gating; ignored by static render) */
  step: number
}

export interface GraphEdge {
  source: string
  target: string
  type: RelType
  /** first step at which this edge is visible */
  step: number
}
