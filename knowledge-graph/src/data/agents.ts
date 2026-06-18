import type { TeamDef, SkillDef } from '../types'

// 4 agents · ingest → analyze → recommend → validate spine (+ a human approval gate).
// Mantra: documents in · patterns found · edits proposed · human approves.
export const TEAMS: TeamDef[] = [
  { key: 'intake', label: 'Documentation Intake', verb: 'captures', color: '#F59E0B' },
  { key: 'synth', label: 'Pattern Synthesis', verb: 'finds', color: '#2563EB' },
  { key: 'curator', label: 'KG Curator', verb: 'proposes', color: '#00A651' },
  { key: 'critic', label: 'Validation Critic', verb: 'validates', color: '#8B5CF6' },
]

// 9 skills, each assigned to one agent. `role` = the plain-English line under the name.
export const SKILLS: SkillDef[] = [
  // Documentation Intake — captures the week's documents into structured findings
  { id: 'intake-report', name: 'Report Parser', role: 'Pulls confirmed root cause, fix & vibration delta from service reports', team: 'intake' },
  { id: 'intake-transcript', name: 'Transcript Parser', role: 'Extracts the expert’s tacit finding from call transcripts', team: 'intake' },
  { id: 'intake-workflow', name: 'Workflow Tracer', role: 'Recovers the tests run, each outcome & the off-path discovery step', team: 'intake' },

  // Pattern Synthesis — finds the pattern across incidents
  { id: 'synth-mining', name: 'Pattern Mining', role: 'Clusters findings across incidents to surface the shared signature', team: 'synth' },
  { id: 'synth-gap', name: 'Gap Detection', role: 'Compares the pattern to the graph and locates what it can’t explain', team: 'synth' },

  // KG Curator — proposes bounded edits
  { id: 'curator-node', name: 'Node Proposal', role: 'Drafts a new node when a recurring cause has no home', team: 'curator' },
  { id: 'curator-reweight', name: 'Edge Re-weighting', role: 'Drafts confidence re-weights from observed outcomes', team: 'curator' },

  // Validation Critic — validates proposals before the human
  { id: 'critic-consistency', name: 'Consistency Check', role: 'Checks edits against existing edges, SOP & safety for conflicts', team: 'critic' },
  { id: 'critic-evidence', name: 'Evidence Audit', role: 'Confirms each edit is justified by the cited incidents', team: 'critic' },
]
