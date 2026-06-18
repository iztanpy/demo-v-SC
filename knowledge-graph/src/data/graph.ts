import type { GraphNode, GraphEdge, NodeLabel } from '../types'

// Property graph mirroring cypher_queries/relevant_nodes.cypher (canonical BFP-3A scenario).
// Hand-authored radial layout: Symptom (centre-left) → 3 HISTORICAL Incidents the system
// references. INC-101 (Sakra-CCGT-1) is the rich reference case on the right (a past
// wrong-turn-then-corrected example); INC-102 / INC-103 are simpler precedents upper-/
// lower-left. The LIVE Part 1 incident (JRG-CCGT-1 · BFP-3A) is NOT here yet — it is
// generated during the step-through (R4). Coordinates authored against the viewBox below.
export const VIEWBOX = { w: 1500, h: 980 }

// Node-type → fill colour (distinct hue per label, Neo4j-Bloom style, light-theme safe).
export const NODE_COLORS: Record<NodeLabel, string> = {
  Symptom: '#F59E0B',       // amber — the alert
  Incident: '#00A5A8',      // teal
  Diagnosis: '#2563EB',     // blue
  RootCause: '#DC2626',     // red — the culprit
  Outcome: '#16A34A',       // green — success
  Technician: '#8B5CF6',    // purple
  WorkOrder: '#0EA5E9',     // sky
  Conversation: '#EC4899',  // pink
  ChecklistItem: '#64748B', // slate
}

// Order used by the legend.
export const NODE_LABELS: NodeLabel[] = [
  'Symptom', 'Incident', 'Diagnosis', 'RootCause', 'Outcome',
  'Technician', 'WorkOrder', 'Conversation', 'ChecklistItem',
]

export const NODES: GraphNode[] = [
  // ── centre ──
  {
    id: 'SYM-001', label: 'Symptom', title: 'BFP NDE vib high', x: 520, y: 490, step: 1,
    props: {
      name: 'BFP NDE Vibration High (Zone C)',
      description: 'NDE bearing-housing vibration RMS exceeds ISO 10816-7 Zone C alarm threshold',
      severity: 'Amber', urgency: 'Immediate',
    },
  },

  // ── INC-101 · Sakra-CCGT-1 (historical reference case — rich lobe, right) ──
  // A past wrong-turn-then-corrected incident the system references; NOT the live
  // Part 1 incident (different plant + people + date) so it reads as prior knowledge.
  {
    id: 'INC-101', label: 'Incident', title: 'Sakra-CCGT-1 · Blk 1', x: 820, y: 490, step: 1,
    props: { location: 'Sakra-CCGT-1 · Block 1', datetime: '2026-03-18T01:30 SGT', asset: 'BFP-2A', status: 'Resolved' },
  },
  {
    id: 'DIA-101', label: 'Diagnosis', title: 'Bearing race spalling', x: 1010, y: 300, step: 1,
    props: {
      name: 'Bearing race spalling', confidence: 0.78, status: 'Incorrect',
      created_at: '2026-03-18T01:50 SGT', rationale: 'NDE vibration signature matched fleet bearing-spalling precedents',
    },
  },
  {
    id: 'DIA-102', label: 'Diagnosis', title: 'Bent shaft', x: 1050, y: 520, step: 1,
    props: {
      name: 'Bent shaft', confidence: 0.96, status: 'Confirmed',
      created_at: '2026-03-18T04:10 SGT', rationale: 'Dial-indicator runout + 1×RPM-dominant vibration with ~180° NDE-DE phase shift',
    },
  },
  { id: 'CHK-101', label: 'ChecklistItem', title: 'Inspect NDE brg', x: 1230, y: 180, step: 1, props: { task: 'Inspect NDE bearing housing', completed: true, result: 'No race damage found' } },
  { id: 'CHK-102', label: 'ChecklistItem', title: 'Runout test', x: 1230, y: 320, step: 1, props: { task: 'Dial-indicator shaft runout test', completed: true, result: 'Runout 0.18 mm — out of tolerance' } },
  { id: 'WORK-102', label: 'WorkOrder', title: 'WO · bearing replace', x: 1010, y: 145, step: 1, props: { description: 'Bearing inspection / replace', comments: 'No race damage found on inspection' } },
  { id: 'TECH-004', label: 'Technician', title: 'A. Wong', x: 850, y: 220, step: 1, props: { name: 'A. Wong', certifications: ['Sulzer BFP Maintenance'] } },
  { id: 'CONV-101', label: 'Conversation', title: 'J. Tan ↔ M. Lim', x: 1250, y: 450, step: 1, props: { participants: ['J. Tan', 'M. Lim'], summary: 'Bearing hypothesis challenged after runout finding; remote phase analysis confirms bent shaft', extracted_finding: '1×RPM-dominant + ~180° NDE-DE phase shift = bent shaft' } },
  { id: 'TECH-001', label: 'Technician', title: 'J. Tan', x: 1380, y: 540, step: 1, props: { name: 'J. Tan', certifications: ['Sulzer BFP Maintenance', 'ISO 10816-7 Vibration Analysis'] } },
  { id: 'WORK-101', label: 'WorkOrder', title: 'WO · shaft replace', x: 1190, y: 600, step: 1, props: { description: 'Shaft straighten / replace', duration_hours: 6.0, comments: 'NDE vibration dropped to 6.1 mm/s after shaft replacement' } },
  { id: 'ROOT-101', label: 'RootCause', title: 'Bent shaft', x: 820, y: 740, step: 1, props: { description: 'Bent BFP-2A shaft causing elevated NDE vibration' } },
  { id: 'OUT-101', label: 'Outcome', title: 'Success · 6.1 mm/s', x: 1050, y: 740, step: 1, props: { status: 'Success', verification: 'NDE vibration stable at 6.1 mm/s over 24 h' } },

  // ── INC-102 · Jurong-CCGT-2 (precedent — upper-left) ──
  { id: 'INC-102', label: 'Incident', title: 'Jurong-CCGT-2', x: 430, y: 250, step: 1, props: { location: 'Jurong-CCGT-2', datetime: '2026-04-12T09:15 SGT', asset: 'BFP-2B', status: 'Resolved' } },
  { id: 'DIA-201', label: 'Diagnosis', title: 'Bearing race spalling', x: 270, y: 150, step: 1, props: { name: 'Bearing race spalling', confidence: 0.89, status: 'Confirmed', created_at: '2026-04-12T10:00 SGT' } },
  { id: 'ROOT-201', label: 'RootCause', title: 'Race spalling', x: 260, y: 350, step: 1, props: { description: 'NDE bearing race spalling' } },
  { id: 'OUT-201', label: 'Outcome', title: 'Success', x: 570, y: 170, step: 1, props: { status: 'Success' } },
  { id: 'TECH-002', label: 'Technician', title: 'S. Ibrahim', x: 110, y: 230, step: 1, props: { name: 'S. Ibrahim', certifications: ['Sulzer BFP Maintenance'] } },
  { id: 'WORK-201', label: 'WorkOrder', title: 'WO · bearing replace', x: 130, y: 80, step: 1, props: { description: 'Replace NDE bearing' } },

  // ── INC-103 · Banyan-CHP (precedent — lower-left) ──
  { id: 'INC-103', label: 'Incident', title: 'Banyan-CHP', x: 430, y: 730, step: 1, props: { location: 'Banyan-CHP', datetime: '2026-02-11T08:05 SGT', asset: 'BFP-1A', status: 'Resolved' } },
  { id: 'DIA-301', label: 'Diagnosis', title: 'Bearing Race spiralling', x: 270, y: 830, step: 1, props: { name: 'Bent shaft', confidence: 0.84, status: 'Confirmed', created_at: '2026-02-11T08:30 SGT' } },
  { id: 'ROOT-301', label: 'RootCause', title: 'Bent shaft', x: 260, y: 630, step: 1, props: { description: 'Bent shaft (thermal bow)' } },
  { id: 'OUT-301', label: 'Outcome', title: 'Success', x: 570, y: 810, step: 1, props: { status: 'Success' } },
  { id: 'TECH-003', label: 'Technician', title: 'P. Subramaniam', x: 110, y: 750, step: 1, props: { name: 'P. Subramaniam', certifications: ['Sulzer BFP Maintenance'] } },
  { id: 'WORK-301', label: 'WorkOrder', title: 'WO · bearing replace', x: 130, y: 900, step: 1, props: { description: 'Bearing replacement' } },

  // ── LIVE incident · JRG-CCGT-1 · BFP-3A — generated during the step-through (R4). ──
  // Built full-size in the freed centre/right as history recedes. `step` = step it appears.
  { id: 'LIVE-INC', label: 'Incident', title: 'JRG-CCGT-1 · Blk 2', x: 720, y: 470, step: 2, live: true, props: { location: 'Jurong-CCGT-1 · Block 2', datetime: '2026-05-27T02:47 SGT', asset: 'BFP-3A', status: 'Open' } },
  { id: 'LIVE-DIA1', label: 'Diagnosis', title: 'Bearing race spalling', x: 940, y: 330, step: 2, live: true, props: { name: 'Bearing race spalling', confidence: 0.78, status: 'Incorrect', created_at: '2026-05-27T03:05 SGT', rationale: 'NDE vibration signature matched fleet bearing-spalling precedents' } },
  { id: 'LIVE-WO1', label: 'WorkOrder', title: 'WO · bearing inspect', x: 1160, y: 250, step: 3, live: true, props: { description: 'Bearing inspection / replace' } },
  { id: 'LIVE-TECH', label: 'Technician', title: 'Lim Wei Jie', x: 760, y: 250, step: 3, live: true, props: { name: 'Lim Wei Jie', certifications: ['Sulzer BFP Maintenance', 'ISO 10816-7 Vibration Analysis'] } },
  { id: 'LIVE-CHK', label: 'ChecklistItem', title: 'Runout test', x: 1180, y: 400, step: 4, live: true, props: { task: 'Dial-indicator shaft runout test', completed: true, result: 'Runout 0.2 mm — out of tolerance' } },
  { id: 'LIVE-CONV', label: 'Conversation', title: 'Lim ↔ Dr. Ismail', x: 960, y: 180, step: 4, live: true, props: { participants: ['Lim Wei Jie', 'Dr. A. Ismail'], summary: 'Bearing hypothesis challenged after runout finding; remote phase analysis confirms bent shaft', extracted_finding: '1×RPM-dominant + ~180° NDE-DE phase shift = bent shaft' } },
  { id: 'LIVE-DIA2', label: 'Diagnosis', title: 'Bent shaft', x: 1000, y: 620, step: 6, live: true, props: { name: 'Bent shaft', confidence: 0.96, status: 'Confirmed', created_at: '2026-05-27T05:10 SGT', rationale: 'Dial-indicator runout + 1×RPM-dominant vibration with ~180° NDE-DE phase shift' } },
  { id: 'LIVE-WO2', label: 'WorkOrder', title: 'WO · shaft replace', x: 1240, y: 660, step: 6, live: true, props: { description: 'Shaft straighten / replace', comments: 'NDE vibration dropped to 6.1 mm/s after replacement' } },
  { id: 'LIVE-ROOT', label: 'RootCause', title: 'Bent shaft', x: 760, y: 700, step: 8, live: true, props: { description: 'Bent BFP-3A shaft causing elevated NDE vibration' } },
  { id: 'LIVE-OUT', label: 'Outcome', title: 'Success · 6.1 mm/s', x: 1020, y: 820, step: 8, live: true, props: { status: 'Success', verification: 'NDE vibration stable at 6.1 mm/s over 24 h' } },
]

export const EDGES: GraphEdge[] = [
  // symptom → incidents
  { source: 'SYM-001', target: 'INC-101', type: 'HAS_INCIDENT', step: 1 },
  { source: 'SYM-001', target: 'INC-102', type: 'HAS_INCIDENT', step: 1 },
  { source: 'SYM-001', target: 'INC-103', type: 'HAS_INCIDENT', step: 1 },

  // INC-101 (historical reference case — fully present from the start)
  { source: 'INC-101', target: 'DIA-101', type: 'HAS_DIAGNOSIS', step: 1 },
  { source: 'INC-101', target: 'DIA-102', type: 'HAS_DIAGNOSIS', step: 1 },
  { source: 'INC-101', target: 'ROOT-101', type: 'HAS_ROOT_CAUSE', step: 1 },
  { source: 'INC-101', target: 'OUT-101', type: 'HAS_OUTCOME', step: 1 },
  { source: 'DIA-101', target: 'DIA-102', type: 'CORRECTED_BY', step: 1 },
  { source: 'DIA-101', target: 'CHK-101', type: 'HAS_CHECKLIST_ITEM', step: 1 },
  { source: 'DIA-101', target: 'CHK-102', type: 'HAS_CHECKLIST_ITEM', step: 1 },
  { source: 'DIA-102', target: 'TECH-001', type: 'ASSIGNED_TO', step: 1 },
  { source: 'DIA-102', target: 'WORK-101', type: 'HAS_WORK_ORDER', step: 1 },
  { source: 'DIA-102', target: 'CONV-101', type: 'HAS_CONVERSATION', step: 1 },
  { source: 'DIA-101', target: 'TECH-004', type: 'ASSIGNED_TO', step: 1 },
  { source: 'DIA-101', target: 'WORK-102', type: 'HAS_WORK_ORDER', step: 1 },

  // INC-102 (precedent)
  { source: 'INC-102', target: 'DIA-201', type: 'HAS_DIAGNOSIS', step: 1 },
  { source: 'INC-102', target: 'ROOT-201', type: 'HAS_ROOT_CAUSE', step: 1 },
  { source: 'INC-102', target: 'OUT-201', type: 'HAS_OUTCOME', step: 1 },
  { source: 'DIA-201', target: 'TECH-002', type: 'ASSIGNED_TO', step: 1 },
  { source: 'DIA-201', target: 'WORK-201', type: 'HAS_WORK_ORDER', step: 1 },

  // INC-103 (precedent)
  { source: 'INC-103', target: 'DIA-301', type: 'HAS_DIAGNOSIS', step: 1 },
  { source: 'INC-103', target: 'ROOT-301', type: 'HAS_ROOT_CAUSE', step: 1 },
  { source: 'INC-103', target: 'OUT-301', type: 'HAS_OUTCOME', step: 1 },
  { source: 'DIA-301', target: 'TECH-003', type: 'ASSIGNED_TO', step: 1 },
  { source: 'DIA-301', target: 'WORK-301', type: 'HAS_WORK_ORDER', step: 1 },

  // ── LIVE incident edges (R4) — revealed at the later endpoint's step ──
  { source: 'SYM-001', target: 'LIVE-INC', type: 'HAS_INCIDENT', step: 2, live: true },
  { source: 'LIVE-INC', target: 'LIVE-DIA1', type: 'HAS_DIAGNOSIS', step: 2, live: true },
  { source: 'LIVE-DIA1', target: 'LIVE-WO1', type: 'HAS_WORK_ORDER', step: 3, live: true },
  { source: 'LIVE-DIA1', target: 'LIVE-TECH', type: 'ASSIGNED_TO', step: 3, live: true },
  { source: 'LIVE-DIA1', target: 'LIVE-CHK', type: 'HAS_CHECKLIST_ITEM', step: 4, live: true },
  { source: 'LIVE-DIA1', target: 'LIVE-CONV', type: 'HAS_CONVERSATION', step: 4, live: true },
  { source: 'LIVE-INC', target: 'LIVE-DIA2', type: 'HAS_DIAGNOSIS', step: 6, live: true },
  { source: 'LIVE-DIA2', target: 'LIVE-WO2', type: 'HAS_WORK_ORDER', step: 6, live: true },
  { source: 'LIVE-DIA1', target: 'LIVE-DIA2', type: 'CORRECTED_BY', step: 7, live: true },
  { source: 'LIVE-INC', target: 'LIVE-ROOT', type: 'HAS_ROOT_CAUSE', step: 8, live: true },
  { source: 'LIVE-INC', target: 'LIVE-OUT', type: 'HAS_OUTCOME', step: 8, live: true },
]
