// ── Streaming document feed for the 3-panel demo ──
// A week of 3 closed BFP incidents, ALL at JRG-CCGT-1. Documents stream IN one-by-one and run a
// parse theater as they land. 2 incidents reaffirm the graph (clean resolutions that match what
// the KG already knows); 1 is the EXCEPTION — a casing/weld crack the graph can't explain, which
// becomes the new knowledge. Pure extraction here: each agent pulls a short field·value finding.

export type DocKind = 'service-report' | 'workflow-trace' | 'work-order' | 'notes' | 'call' | 'comment'
export type Outcome = 'reaffirm' | 'exception'

export interface FeedDoc {
  id: string
  incident: string
  asset: string
  kind: DocKind
  label: string
  /** extraction agent shown working on this doc */
  agent: string
  outcome: Outcome
  /** the workflow trace is the entry doc; parsing it pulls in the related docs (root = true) */
  root?: boolean
  /** ms after Run when this doc streams in */
  arriveAt: number
  parseMs: number
  extractMs: number
  /** the extracted finding (condensed) */
  field: string
  value: string
}

// one colour per incident — cards are tinted so you can see which docs belong together
export const INCIDENTS = [
  { id: 'INC-0488', asset: 'BFP-2A', plant: 'JRG-CCGT-1', outcome: 'reaffirm' as Outcome, color: '#2563EB' },
  { id: 'INC-0501', asset: 'BFP-1A', plant: 'JRG-CCGT-1', outcome: 'reaffirm' as Outcome, color: '#0EA5A4' },
  { id: 'INC-0455', asset: 'BFP-4A', plant: 'JRG-CCGT-1', outcome: 'reaffirm' as Outcome, color: '#7C3AED' },
  { id: 'INC-0472', asset: 'BFP-2B', plant: 'JRG-CCGT-1', outcome: 'reaffirm' as Outcome, color: '#0891B2' },
  { id: 'INC-0510', asset: 'BFP-5A', plant: 'JRG-CCGT-1', outcome: 'reaffirm' as Outcome, color: '#DB2777' },
  { id: 'INC-0523', asset: 'BFP-1B', plant: 'JRG-CCGT-1', outcome: 'reaffirm' as Outcome, color: '#65A30D' },
  { id: 'INC-0544', asset: 'BFP-3B', plant: 'JRG-CCGT-1', outcome: 'reaffirm' as Outcome, color: '#4F46E5' },
  { id: 'INC-0537', asset: 'BFP-3A', plant: 'JRG-CCGT-1', outcome: 'exception' as Outcome, color: '#F59E0B' },
]
export const INCIDENT_COLOR: Record<string, string> = Object.fromEntries(INCIDENTS.map((i) => [i.id, i.color]))

export const DOC_KIND_LABEL: Record<DocKind, string> = {
  'service-report': 'Service report',
  'workflow-trace': 'Workflow trace',
  'work-order': 'Work order',
  notes: 'Field notes',
  call: 'Call transcript',
  comment: 'Comments',
}

// Workflows FIRST (the entry docs, arriving 0 / 0.9s / 1.8s). As each workflow finishes parsing,
// its related documents stream in (service report, work order, notes, the call). The exception
// incident (INC-0537) pulls in the most — its off-path notes + the expert call land last.
export const FEED: FeedDoc[] = [
  // ── the three workflow traces (entry docs) ──
  { id: 'w1', incident: 'INC-0488', asset: 'BFP-2A', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', outcome: 'reaffirm', root: true, arriveAt: 0, parseMs: 1400, extractMs: 900, field: 'Test path', value: 'Housing inspect → bearing spall ✓ · SOP followed' },
  { id: 'w2', incident: 'INC-0501', asset: 'BFP-1A', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', outcome: 'reaffirm', root: true, arriveAt: 900, parseMs: 1400, extractMs: 900, field: 'Test path', value: 'Alignment check → misalignment ✓' },
  { id: 'w3', incident: 'INC-0537', asset: 'BFP-3A', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', outcome: 'exception', root: true, arriveAt: 1800, parseMs: 1500, extractMs: 1000, field: 'Test path', value: 'Phase→bent shaft ✗ · casing NDT ✓ (off-path)' },

  // ── related docs, pulled in as each workflow gets parsed ──
  { id: 'd1', incident: 'INC-0488', asset: 'BFP-2A', kind: 'service-report', label: 'Service report', agent: 'Report Parser', outcome: 'reaffirm', arriveAt: 2750, parseMs: 1200, extractMs: 800, field: 'Root cause', value: 'Bearing wear — replaced, resolved' },
  { id: 'd2', incident: 'INC-0488', asset: 'BFP-2A', kind: 'work-order', label: 'Work order', agent: 'Work-order Parser', outcome: 'reaffirm', arriveAt: 3500, parseMs: 1000, extractMs: 700, field: 'WO close-out', value: 'NDE vib normalized · closed' },
  { id: 'd3', incident: 'INC-0501', asset: 'BFP-1A', kind: 'service-report', label: 'Service report', agent: 'Report Parser', outcome: 'reaffirm', arriveAt: 3050, parseMs: 1200, extractMs: 800, field: 'Root cause', value: 'Coupling misalignment — aligned' },
  { id: 'd4', incident: 'INC-0537', asset: 'BFP-3A', kind: 'service-report', label: 'Service report', agent: 'Report Parser', outcome: 'exception', arriveAt: 4300, parseMs: 1300, extractMs: 900, field: 'Root cause', value: 'Casing weld-toe crack (volute)' },
  { id: 'd5', incident: 'INC-0537', asset: 'BFP-3A', kind: 'notes', label: 'Field notes', agent: 'Notes Parser', outcome: 'exception', arriveAt: 5100, parseMs: 1100, extractMs: 750, field: 'Observation', value: 'Hairline at discharge weld — not the shaft' },
  { id: 'd6', incident: 'INC-0537', asset: 'BFP-3A', kind: 'call', label: 'Call transcript', agent: 'Call Agent', outcome: 'exception', arriveAt: 5900, parseMs: 1500, extractMs: 1000, field: 'Expert finding', value: 'Volute crack, not bent shaft' },

  // ── 5 more reaffirm incidents (varied doc mixes) — the parallel stream of confirmations ──
  { id: 'a-w', incident: 'INC-0455', asset: 'BFP-4A', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', outcome: 'reaffirm', root: true, arriveAt: 2200, parseMs: 1300, extractMs: 850, field: 'Test path', value: 'Housing inspect → bearing spall ✓' },
  { id: 'a-c', incident: 'INC-0455', asset: 'BFP-4A', kind: 'call', label: 'Call transcript', agent: 'Call Agent', outcome: 'reaffirm', arriveAt: 3400, parseMs: 1400, extractMs: 950, field: 'Expert finding', value: 'Confirmed race spalling on NDE bearing' },

  { id: 'b-w', incident: 'INC-0472', asset: 'BFP-2B', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', outcome: 'reaffirm', root: true, arriveAt: 2900, parseMs: 1300, extractMs: 850, field: 'Test path', value: 'Alignment check → misalignment ✓' },
  { id: 'b-n', incident: 'INC-0472', asset: 'BFP-2B', kind: 'notes', label: 'Field notes', agent: 'Notes Parser', outcome: 'reaffirm', arriveAt: 3900, parseMs: 1100, extractMs: 750, field: 'Observation', value: 'Coupling offset out of tolerance' },
  { id: 'b-r', incident: 'INC-0472', asset: 'BFP-2B', kind: 'service-report', label: 'Service report', agent: 'Report Parser', outcome: 'reaffirm', arriveAt: 4600, parseMs: 1300, extractMs: 900, field: 'Root cause', value: 'Coupling misalignment — re-aligned' },

  { id: 'e-w', incident: 'INC-0510', asset: 'BFP-5A', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', outcome: 'reaffirm', root: true, arriveAt: 3300, parseMs: 1300, extractMs: 850, field: 'Test path', value: 'Oil analysis → lube failure ✓' },
  { id: 'e-m', incident: 'INC-0510', asset: 'BFP-5A', kind: 'comment', label: 'Comments', agent: 'Comments Parser', outcome: 'reaffirm', arriveAt: 4500, parseMs: 1100, extractMs: 700, field: 'Operator note', value: 'Bearing oil looked milky / contaminated' },
  { id: 'e-o', incident: 'INC-0510', asset: 'BFP-5A', kind: 'work-order', label: 'Work order', agent: 'Work-order Parser', outcome: 'reaffirm', arriveAt: 5300, parseMs: 1000, extractMs: 700, field: 'WO close-out', value: 'Lube flushed & replaced · closed' },

  { id: 'f-w', incident: 'INC-0523', asset: 'BFP-1B', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', outcome: 'reaffirm', root: true, arriveAt: 3800, parseMs: 1300, extractMs: 850, field: 'Test path', value: 'Housing inspect → spalling ✓' },
  { id: 'f-c', incident: 'INC-0523', asset: 'BFP-1B', kind: 'call', label: 'Call transcript', agent: 'Call Agent', outcome: 'reaffirm', arriveAt: 5000, parseMs: 1400, extractMs: 950, field: 'Expert finding', value: 'Spall confirmed on NDE race' },
  { id: 'f-n', incident: 'INC-0523', asset: 'BFP-1B', kind: 'notes', label: 'Field notes', agent: 'Notes Parser', outcome: 'reaffirm', arriveAt: 5700, parseMs: 1100, extractMs: 750, field: 'Observation', value: 'Visible pitting on inspection' },

  { id: 'g-w', incident: 'INC-0544', asset: 'BFP-3B', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', outcome: 'reaffirm', root: true, arriveAt: 4200, parseMs: 1300, extractMs: 850, field: 'Test path', value: 'Alignment → misalignment ✓' },
  { id: 'g-r', incident: 'INC-0544', asset: 'BFP-3B', kind: 'service-report', label: 'Service report', agent: 'Report Parser', outcome: 'reaffirm', arriveAt: 5400, parseMs: 1300, extractMs: 900, field: 'Root cause', value: 'Misalignment — re-aligned, resolved' },
]

export const FEED_END = Math.max(...FEED.map((d) => d.arriveAt + d.parseMs + d.extractMs))

// global slow-down so the "agents working" loading theater lingers and reads at every step
export const SPEED = 2
