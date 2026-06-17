export type TeamKey = 'doc' | 'data' | 'eval' | 'output'

/** hubs the handoff packets can flow between (the 4 teams + the KG itself) */
export type HubKey = TeamKey | 'kg'

export interface TeamDef {
  key: TeamKey
  label: string
  verb: string
  color: string
}

export interface AgentDef {
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
  /** member agent ids that light inside the hubs this step */
  activeAgents: string[]
  /** data packets that animate between hubs / KG this step */
  handoffs: Handoff[]
  /** parallel = handoffs fire concurrently + "∥" badge + simultaneous pulses */
  parallel?: boolean
  /** orchestrator's running-narration caption in the constellation panel */
  live: string
}

// ── Knowledge-graph cluster ──
export type NodeState =
  | 'history'
  | 'proposed'
  | 'selected'
  | 'confirmed'
  | 'incorrect'
  | 'success'

export interface KGNode {
  id: string
  title: string
  sub: string
  state: NodeState
  cx: number
  cy: number
  /** first step at which this node is visible */
  step: number
}

export type EdgeKind = 'normal' | 'corrected-by'

export interface KGEdge {
  source: string
  target: string
  kind: EdgeKind
  /** first step at which this edge is visible */
  step: number
}
