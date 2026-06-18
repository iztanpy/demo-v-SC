import type { TeamDef, SkillDef } from '../types'

// 4 agents · four-verb spine: documentation captures · data finds · evaluator judges · output produces
export const TEAMS: TeamDef[] = [
  { key: 'doc', label: 'Documentation', verb: 'captures', color: '#F59E0B' },
  { key: 'data', label: 'Data', verb: 'finds', color: '#2563EB' },
  { key: 'eval', label: 'Evaluator', verb: 'judges', color: '#00A651' },
  { key: 'output', label: 'Output', verb: 'produces', color: '#8B5CF6' },
]

// 10 skills, each assigned to one agent (team). `role` = the plain-English line
// rendered under the skill name in the sidebar. Render grouped under their agent.
export const SKILLS: SkillDef[] = [
  // Documentation — captures into the graph
  { id: 'doc-transcript', name: 'Transcript Parser', role: 'Turns radio & call audio into text', team: 'doc' },
  { id: 'doc-entity', name: 'Entity Extraction', role: 'Understands relationships & entities in texts and readings', team: 'doc' },
  { id: 'doc-field', name: 'Field Observation', role: 'Notes completed checklist items and comments on the work order', team: 'doc' },

  // Data — sole KG gateway
  { id: 'data-retrieval', name: 'Retrieval', role: 'Searches the graph for similar past incidents', team: 'data' },
  { id: 'data-writer', name: 'Graph Writer', role: 'Creates & links nodes, incl. corrected-by edges', team: 'data' },

  // Evaluator — judges
  { id: 'eval-rank', name: 'Diagnosis Ranking', role: 'Ranks diagnosis hypotheses by confidence', team: 'eval' },
  { id: 'eval-tech', name: 'Technician Matching', role: 'Matches cert-qualified techs (Sulzer BFP)', team: 'eval' },
  { id: 'eval-sop', name: 'SOP & Safety Validator', role: 'Checks SOP compliance & safety before dispatch', team: 'eval' },

  // Output — produces artifacts from the graph
  { id: 'out-wo', name: 'Work Order Generation', role: 'Drafts the work-order scope', team: 'output' },
  { id: 'out-report', name: 'Service Report Drafting', role: 'Assembles the service report from incident nodes', team: 'output' },
]
