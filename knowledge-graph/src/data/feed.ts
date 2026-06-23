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

// one colour per incident — cards are tinted so you can see which docs belong together. INC-0537
// (the exception) leads so its gap → New-Knowledge flow runs in parallel with the reaffirm stream.
export const INCIDENTS = [
  { id: 'INC-0537', asset: 'BFP-3A', plant: 'JRG-CCGT-1', outcome: 'exception' as Outcome, color: '#F59E0B' },
  { id: 'INC-0488', asset: 'BFP-2A', plant: 'JRG-CCGT-1', outcome: 'reaffirm' as Outcome, color: '#2563EB' },
  { id: 'INC-0501', asset: 'BFP-1A', plant: 'JRG-CCGT-1', outcome: 'reaffirm' as Outcome, color: '#0EA5A4' },
  { id: 'INC-0455', asset: 'BFP-4A', plant: 'JRG-CCGT-1', outcome: 'reaffirm' as Outcome, color: '#7C3AED' },
  { id: 'INC-0472', asset: 'BFP-2B', plant: 'JRG-CCGT-1', outcome: 'reaffirm' as Outcome, color: '#0891B2' },
  { id: 'INC-0510', asset: 'BFP-5A', plant: 'JRG-CCGT-1', outcome: 'reaffirm' as Outcome, color: '#DB2777' },
  { id: 'INC-0523', asset: 'BFP-1B', plant: 'JRG-CCGT-1', outcome: 'reaffirm' as Outcome, color: '#65A30D' },
  { id: 'INC-0544', asset: 'BFP-3B', plant: 'JRG-CCGT-1', outcome: 'reaffirm' as Outcome, color: '#4F46E5' },
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

// ─────────────────────────────────────────────────────────────────────────────────────────────
//  DEMO PACING KNOBS — tweak these four to change the feel. Durations are in ms, BEFORE the global
//  SPEED multiplier that useFeed / useResolution apply.
// ─────────────────────────────────────────────────────────────────────────────────────────────
export const SPEED = 2        // global wall-clock multiplier — bigger = the whole demo runs slower
const ARRIVE_GAP = 1020        // ms between each successive document starting (its `slot` × this)
const PARSE_SCALE = 1         // multiply every doc's parse-theater duration (bigger = lingers longer)
const EXTRACT_SCALE = 1.5       // multiply every doc's extract duration

// Raw feed. `slot` = arrival ORDER (arriveAt = slot × ARRIVE_GAP), so spacing is one knob; incidents
// are interleaved across slots so several stream concurrently, and each child sits in a later slot
// than its workflow. `parse` / `extract` are base durations (scaled by PARSE_SCALE / EXTRACT_SCALE).
// INC-0537 (the exception) leads at slot 0; its off-path notes + expert call come later.
type RawDoc = Omit<FeedDoc, 'arriveAt' | 'parseMs' | 'extractMs'> & { slot: number; parse: number; extract: number }

const RAW: RawDoc[] = [
  // ── the three lead workflow traces (entry docs) ──
  { id: 'w3', incident: 'INC-0537', asset: 'BFP-3A', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', outcome: 'exception', root: true, slot: 0, parse: 1500, extract: 1000, field: 'Test path', value: 'Phase→bent shaft ✗ · casing NDT ✓ (off-path)' },
  { id: 'w1', incident: 'INC-0488', asset: 'BFP-2A', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', outcome: 'reaffirm', root: true, slot: 1, parse: 1400, extract: 900, field: 'Test path', value: 'Housing inspect → bearing spall ✓ · SOP followed' },
  { id: 'w2', incident: 'INC-0501', asset: 'BFP-1A', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', outcome: 'reaffirm', root: true, slot: 2, parse: 1400, extract: 900, field: 'Test path', value: 'Alignment check → misalignment ✓' },

  // ── related docs, pulled in as each workflow gets parsed ──
  { id: 'd1', incident: 'INC-0488', asset: 'BFP-2A', kind: 'service-report', label: 'Service report', agent: 'Report Parser', outcome: 'reaffirm', slot: 5, parse: 1200, extract: 800, field: 'Root cause', value: 'Bearing wear — replaced, resolved' },
  { id: 'd2', incident: 'INC-0488', asset: 'BFP-2A', kind: 'work-order', label: 'Work order', agent: 'Work-order Parser', outcome: 'reaffirm', slot: 11, parse: 1000, extract: 700, field: 'WO close-out', value: 'NDE vib normalized · closed' },
  { id: 'd3', incident: 'INC-0501', asset: 'BFP-1A', kind: 'service-report', label: 'Service report', agent: 'Report Parser', outcome: 'reaffirm', slot: 8, parse: 1200, extract: 800, field: 'Root cause', value: 'Coupling misalignment — aligned' },
  { id: 'd4', incident: 'INC-0537', asset: 'BFP-3A', kind: 'service-report', label: 'Service report', agent: 'Report Parser', outcome: 'exception', slot: 4, parse: 1300, extract: 900, field: 'Root cause', value: 'Casing weld-toe crack (volute)' },
  { id: 'd5', incident: 'INC-0537', asset: 'BFP-3A', kind: 'notes', label: 'Field notes', agent: 'Notes Parser', outcome: 'exception', slot: 7, parse: 1100, extract: 750, field: 'Observation', value: 'Hairline at discharge weld — not the shaft' },
  { id: 'd6', incident: 'INC-0537', asset: 'BFP-3A', kind: 'call', label: 'Call transcript', agent: 'Call Agent', outcome: 'exception', slot: 12, parse: 1500, extract: 1000, field: 'Expert finding', value: 'Volute crack, not bent shaft' },

  // ── 5 more reaffirm incidents (varied doc mixes) — the parallel stream of confirmations ──
  { id: 'a-w', incident: 'INC-0455', asset: 'BFP-4A', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', outcome: 'reaffirm', root: true, slot: 3, parse: 1300, extract: 850, field: 'Test path', value: 'Housing inspect → bearing spall ✓' },
  { id: 'a-c', incident: 'INC-0455', asset: 'BFP-4A', kind: 'call', label: 'Call transcript', agent: 'Call Agent', outcome: 'reaffirm', slot: 10, parse: 1400, extract: 950, field: 'Expert finding', value: 'Confirmed race spalling on NDE bearing' },

  { id: 'b-w', incident: 'INC-0472', asset: 'BFP-2B', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', outcome: 'reaffirm', root: true, slot: 6, parse: 1300, extract: 850, field: 'Test path', value: 'Alignment check → misalignment ✓' },
  { id: 'b-n', incident: 'INC-0472', asset: 'BFP-2B', kind: 'notes', label: 'Field notes', agent: 'Notes Parser', outcome: 'reaffirm', slot: 14, parse: 1100, extract: 750, field: 'Observation', value: 'Coupling offset out of tolerance' },
  { id: 'b-r', incident: 'INC-0472', asset: 'BFP-2B', kind: 'service-report', label: 'Service report', agent: 'Report Parser', outcome: 'reaffirm', slot: 17, parse: 1300, extract: 900, field: 'Root cause', value: 'Coupling misalignment — re-aligned' },

  { id: 'e-w', incident: 'INC-0510', asset: 'BFP-5A', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', outcome: 'reaffirm', root: true, slot: 9, parse: 1300, extract: 850, field: 'Test path', value: 'Oil analysis → lube failure ✓' },
  { id: 'e-m', incident: 'INC-0510', asset: 'BFP-5A', kind: 'comment', label: 'Comments', agent: 'Comments Parser', outcome: 'reaffirm', slot: 16, parse: 1100, extract: 700, field: 'Operator note', value: 'Bearing oil looked milky / contaminated' },
  { id: 'e-o', incident: 'INC-0510', asset: 'BFP-5A', kind: 'work-order', label: 'Work order', agent: 'Work-order Parser', outcome: 'reaffirm', slot: 19, parse: 1000, extract: 700, field: 'WO close-out', value: 'Lube flushed & replaced · closed' },

  { id: 'f-w', incident: 'INC-0523', asset: 'BFP-1B', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', outcome: 'reaffirm', root: true, slot: 13, parse: 1300, extract: 850, field: 'Test path', value: 'Housing inspect → spalling ✓' },
  { id: 'f-c', incident: 'INC-0523', asset: 'BFP-1B', kind: 'call', label: 'Call transcript', agent: 'Call Agent', outcome: 'reaffirm', slot: 18, parse: 1400, extract: 950, field: 'Expert finding', value: 'Spall confirmed on NDE race' },
  { id: 'f-n', incident: 'INC-0523', asset: 'BFP-1B', kind: 'notes', label: 'Field notes', agent: 'Notes Parser', outcome: 'reaffirm', slot: 21, parse: 1100, extract: 750, field: 'Observation', value: 'Visible pitting on inspection' },

  { id: 'g-w', incident: 'INC-0544', asset: 'BFP-3B', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', outcome: 'reaffirm', root: true, slot: 15, parse: 1300, extract: 850, field: 'Test path', value: 'Alignment → misalignment ✓' },
  { id: 'g-r', incident: 'INC-0544', asset: 'BFP-3B', kind: 'service-report', label: 'Service report', agent: 'Report Parser', outcome: 'reaffirm', slot: 20, parse: 1300, extract: 900, field: 'Root cause', value: 'Misalignment — re-aligned, resolved' },
]

// build the live feed from the knobs — arriveAt from the slot, durations from the scales
export const FEED: FeedDoc[] = RAW.map(({ slot, parse, extract, ...rest }) => ({
  ...rest,
  arriveAt: slot * ARRIVE_GAP,
  parseMs: Math.round(parse * PARSE_SCALE),
  extractMs: Math.round(extract * EXTRACT_SCALE),
}))

export const FEED_END = Math.max(...FEED.map((d) => d.arriveAt + d.parseMs + d.extractMs))
