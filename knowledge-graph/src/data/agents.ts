import type { TeamDef, AgentDef } from '../types'

// 4 teams · four-verb spine: documentation captures · data finds · evaluator judges · output produces
export const TEAMS: TeamDef[] = [
  { key: 'doc', label: 'Documentation', verb: 'captures', color: '#F59E0B' },
  { key: 'data', label: 'Data', verb: 'finds', color: '#2563EB' },
  { key: 'eval', label: 'Evaluator', verb: 'judges', color: '#00A651' },
  { key: 'output', label: 'Output', verb: 'produces', color: '#8B5CF6' },
]

// 11 agents, ordered by team (render order in the hub band).
export const AGENTS: AgentDef[] = [
  // Documentation — captures into the graph
  { id: 'doc-transcript', name: 'Transcript Parser', role: 'radio / call audio → text', team: 'doc' },
  { id: 'doc-entity', name: 'Entity Extraction', role: 'structured findings: equipment IDs, runout/phase, actions', team: 'doc' },
  { id: 'doc-field', name: 'Field Observation', role: "Lim's dial-indicator runout readings · photos · notes", team: 'doc' },

  // Data — sole KG gateway
  { id: 'data-retrieval', name: 'Retrieval', role: 'semantic + similarity KG search', team: 'data' },
  { id: 'data-writer', name: 'Graph Writer', role: 'create / update nodes + edges (incl. corrected-by)', team: 'data' },
  { id: 'data-guardian', name: 'Schema & Provenance Guardian', role: 'KG schema conformance + source/lineage stamp', team: 'data' },

  // Evaluator — judges
  { id: 'eval-rank', name: 'Diagnosis Ranking', role: 'ranked hypotheses + confidence', team: 'eval' },
  { id: 'eval-tech', name: 'Technician Matching', role: 'cert / skills match (Sulzer BFP)', team: 'eval' },
  { id: 'eval-sop', name: 'SOP & Safety Validator', role: 'gates node-writes + recommendations for SOP compliance + safety', team: 'eval' },

  // Output — produces artifacts from the graph
  { id: 'out-wo', name: 'Work Order Generation', role: 'work-order scope', team: 'output' },
  { id: 'out-report', name: 'Service Report Drafting', role: 'service report from incident nodes', team: 'output' },
]
