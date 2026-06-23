// ── Streaming document feed for the 3-panel demo ──
// A week of 3 closed BFP incidents, ALL at JRG-CCGT-1. Documents stream IN one-by-one and run a
// parse theater as they land. 2 incidents reaffirm the graph (clean resolutions that match what
// the KG already knows); 1 is the EXCEPTION — a casing/weld crack the graph can't explain, which
// becomes the new knowledge. Pure extraction here: each agent pulls a short field·value finding.

export type DocKind = 'service-report' | 'workflow-trace' | 'work-order' | 'notes' | 'call' | 'comment' | 'diagnosis'
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
  /** provenance shown under the extract (instrument / system / person), echoing Part-1 vocab */
  source: string
  /** workflow-trace only — onsite step completion (Safety / Instrument), echoing Part-1's checklist */
  steps?: WorkflowStep[]
  /** diagnosis only — the human (Faye) override rationale recorded against the AI recommendation */
  rationale?: string
  /** an inner "recommendation" knowledge card (e.g. shutdown needed) — can repeat across docs */
  recommendation?: { label: string; detail?: string }
  /** extra extracted findings shown under the main value (e.g. downtime, output impact) */
  extras?: { k: string; v: string }[]
}

export interface WorkflowStep { label: string; done: number; total: number }

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
  diagnosis: 'Initial diagnosis',
}

// per-kind accent colour — each document type carries its own identity on the card
export const DOC_KIND_COLOR: Record<DocKind, string> = {
  'service-report': '#2563EB',
  'workflow-trace': '#6366F1',
  'work-order': '#00A651',
  notes: '#F59E0B',
  call: '#0EA5A4',
  comment: '#7C3AED',
  diagnosis: '#DB2777',
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
  { id: 'w3', incident: 'INC-0537', asset: 'BFP-3A', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', source: 'Bently Nevada 3500 / Honeywell Experion DCS', outcome: 'exception', root: true, slot: 0, parse: 1500, extract: 1000, field: 'Test path', value: 'Phase analysis → bent shaft · ruled out · casing NDT run off-path', steps: [{ label: 'Safety measures followed', done: 5, total: 5 }, { label: 'Instrument steps completed', done: 2, total: 3 }] },
  { id: 'w1', incident: 'INC-0488', asset: 'BFP-2A', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', source: 'Bently Nevada 3500 · OSIsoft PI', outcome: 'reaffirm', root: true, slot: 1, parse: 1400, extract: 900, field: 'Test path', value: 'NDE housing inspection → bearing race spalling ✓ · SOP-BFP-VIBR-001 followed' },
  { id: 'w2', incident: 'INC-0501', asset: 'BFP-1A', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', source: 'Bently Nevada 3500 · OSIsoft PI', outcome: 'reaffirm', root: true, slot: 2, parse: 1400, extract: 900, field: 'Test path', value: 'Laser shaft alignment → coupling misalignment ✓' },

  // ── related docs, pulled in as each workflow gets parsed ──
  { id: 'd1', incident: 'INC-0488', asset: 'BFP-2A', kind: 'service-report', label: 'Service report', agent: 'Report Parser', source: 'Service report · BFP-2A', outcome: 'reaffirm', slot: 5, parse: 1200, extract: 800, field: 'Root cause', value: 'NDE bearing race spalling — bearing replaced, resolved' },
  { id: 'd2', incident: 'INC-0488', asset: 'BFP-2A', kind: 'work-order', label: 'Work order', agent: 'Work-order Parser', source: 'Work order · close-out', outcome: 'reaffirm', slot: 11, parse: 1000, extract: 700, field: 'WO close-out', value: 'NDE vibration RMS normalized to ISO Zone A · closed' },
  { id: 'd3', incident: 'INC-0501', asset: 'BFP-1A', kind: 'service-report', label: 'Service report', agent: 'Report Parser', source: 'Service report · BFP-1A', outcome: 'reaffirm', slot: 8, parse: 1200, extract: 800, field: 'Root cause', value: 'Coupling misalignment — re-aligned to tolerance' },
  { id: 'dx', incident: 'INC-0537', asset: 'BFP-3A', kind: 'diagnosis', label: 'Initial diagnosis', agent: 'Diagnosis Parser', source: 'Faye Sit · ops override', outcome: 'exception', slot: 3, parse: 1200, extract: 800, field: 'Faye overrode the AI recommendation', value: 'AI recommended Shaft misalignment · 85% → Faye selected NDE bearing race spalling · 78%', rationale: 'Specific bearing and temperature conditions' },
  { id: 'd4', incident: 'INC-0537', asset: 'BFP-3A', kind: 'service-report', label: 'Initial findings', agent: 'Report Parser', source: 'Service report · BFP-3A', outcome: 'exception', slot: 4, parse: 1300, extract: 900, field: 'Root cause', value: 'Crack in pump casing on BFP-3A — 60 mm hairline at 4-o\'clock volute, near discharge weld', extras: [{ k: 'Estimated downtime', v: '~6h · casing dye-penetrant NDT + crack repair' }, { k: 'Output impact', v: 'Block 2 derate ~50 MW if unmitigated' }, { k: 'Secondary damage', v: 'NDE/DE bearing wear from imbalanced loading' }], recommendation: { label: 'Shutdown needed', detail: 'Cannot run with a propagating casing crack · isolate Block 2 feedwater' } },
  { id: 'd5', incident: 'INC-0537', asset: 'BFP-3A', kind: 'notes', label: 'Field notes', agent: 'Notes Parser', source: 'L. Lim · onsite', outcome: 'exception', slot: 7, parse: 1100, extract: 750, field: 'Onsite observation', value: 'Faint discontinuity at 4-o\'clock · ~60 mm from discharge weld · liquid penetrant would confirm' },
  { id: 'd6', incident: 'INC-0537', asset: 'BFP-3A', kind: 'call', label: 'Call transcript', agent: 'Call Agent', source: 'Dr. A. Ismail ↔ L. Lim', outcome: 'exception', slot: 12, parse: 1500, extract: 1000, field: 'Expert finding', value: 'Pump casing fatigue crack — not bearing race spalling · same mode as Jurong-CCGT-2 BFP (2023)', recommendation: { label: 'Shutdown needed', detail: 'Cannot run with a propagating casing crack · isolate Block 2 feedwater' } },

  // ── 5 more reaffirm incidents (varied doc mixes) — the parallel stream of confirmations ──
  { id: 'a-w', incident: 'INC-0455', asset: 'BFP-4A', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', source: 'Bently Nevada 3500 · OSIsoft PI', outcome: 'reaffirm', root: true, slot: 3, parse: 1300, extract: 850, field: 'Test path', value: 'NDE housing inspection → bearing race spalling ✓' },
  { id: 'a-c', incident: 'INC-0455', asset: 'BFP-4A', kind: 'call', label: 'Call transcript', agent: 'Call Agent', source: 'Expert call', outcome: 'reaffirm', slot: 10, parse: 1400, extract: 950, field: 'Expert finding', value: 'Confirmed race spalling on NDE bearing · 1×RPM dominant' },

  { id: 'b-w', incident: 'INC-0472', asset: 'BFP-2B', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', source: 'Bently Nevada 3500 · OSIsoft PI', outcome: 'reaffirm', root: true, slot: 6, parse: 1300, extract: 850, field: 'Test path', value: 'Laser shaft alignment → coupling misalignment ✓' },
  { id: 'b-n', incident: 'INC-0472', asset: 'BFP-2B', kind: 'notes', label: 'Field notes', agent: 'Notes Parser', source: 'Onsite notes', outcome: 'reaffirm', slot: 14, parse: 1100, extract: 750, field: 'Onsite observation', value: 'Coupling offset out of tolerance at DE face' },
  { id: 'b-r', incident: 'INC-0472', asset: 'BFP-2B', kind: 'service-report', label: 'Service report', agent: 'Report Parser', source: 'Service report · BFP-2B', outcome: 'reaffirm', slot: 17, parse: 1300, extract: 900, field: 'Root cause', value: 'Coupling misalignment — re-aligned, resolved' },

  { id: 'e-w', incident: 'INC-0510', asset: 'BFP-5A', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', source: 'Bently Nevada 3500 · OSIsoft PI', outcome: 'reaffirm', root: true, slot: 9, parse: 1300, extract: 850, field: 'Test path', value: 'Lube oil analysis → lubrication failure ✓' },
  { id: 'e-m', incident: 'INC-0510', asset: 'BFP-5A', kind: 'comment', label: 'Comments', agent: 'Comments Parser', source: 'Operator comment', outcome: 'reaffirm', slot: 16, parse: 1100, extract: 700, field: 'Operator note', value: 'Bearing oil milky / contaminated on draw-off' },
  { id: 'e-o', incident: 'INC-0510', asset: 'BFP-5A', kind: 'work-order', label: 'Work order', agent: 'Work-order Parser', source: 'Work order · close-out', outcome: 'reaffirm', slot: 19, parse: 1000, extract: 700, field: 'WO close-out', value: 'Lube flushed & replaced · NDE vib normalized · closed' },

  { id: 'f-w', incident: 'INC-0523', asset: 'BFP-1B', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', source: 'Bently Nevada 3500 · OSIsoft PI', outcome: 'reaffirm', root: true, slot: 13, parse: 1300, extract: 850, field: 'Test path', value: 'NDE housing inspection → bearing race spalling ✓' },
  { id: 'f-c', incident: 'INC-0523', asset: 'BFP-1B', kind: 'call', label: 'Call transcript', agent: 'Call Agent', source: 'Expert call', outcome: 'reaffirm', slot: 18, parse: 1400, extract: 950, field: 'Expert finding', value: 'Spalling confirmed on NDE race' },
  { id: 'f-n', incident: 'INC-0523', asset: 'BFP-1B', kind: 'notes', label: 'Field notes', agent: 'Notes Parser', source: 'Onsite notes', outcome: 'reaffirm', slot: 21, parse: 1100, extract: 750, field: 'Onsite observation', value: 'Visible pitting on NDE bearing inspection' },

  { id: 'g-w', incident: 'INC-0544', asset: 'BFP-3B', kind: 'workflow-trace', label: 'Workflow trace', agent: 'Workflow Tracer', source: 'Bently Nevada 3500 · OSIsoft PI', outcome: 'reaffirm', root: true, slot: 15, parse: 1300, extract: 850, field: 'Test path', value: 'Laser shaft alignment → coupling misalignment ✓' },
  { id: 'g-r', incident: 'INC-0544', asset: 'BFP-3B', kind: 'service-report', label: 'Service report', agent: 'Report Parser', source: 'Service report · BFP-3B', outcome: 'reaffirm', slot: 20, parse: 1300, extract: 900, field: 'Root cause', value: 'Coupling misalignment — re-aligned, resolved' },
]

// build the live feed from the knobs — arriveAt from the slot, durations from the scales
export const FEED: FeedDoc[] = RAW.map(({ slot, parse, extract, ...rest }) => ({
  ...rest,
  arriveAt: slot * ARRIVE_GAP,
  parseMs: Math.round(parse * PARSE_SCALE),
  extractMs: Math.round(extract * EXTRACT_SCALE),
}))

export const FEED_END = Math.max(...FEED.map((d) => d.arriveAt + d.parseMs + d.extractMs))
