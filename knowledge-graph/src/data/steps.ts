import type { StepCopy } from '../types'

// Global speed knob for the agent-skill pulses. Scales EVERY `durMs` below at once:
//   2 = twice as slow · 0.5 = twice as fast. Applied in useStepTimeline.
export const BEAT_MULTIPLIER = 3

// 9-step story: a week of BFP NDE-vibration incidents is documented; the agents read
// the service reports / workflows / transcripts, find a pattern the knowledge graph
// can't explain, and PROPOSE two bounded edits — add a casing-crack node + re-weight an
// over-confident edge. A human approves; only then does the graph mutate. The graph gets
// smarter, not bigger. `sequence` drives the timed agent-handoff flashing (useStepTimeline):
// beats run in order; within a beat skills start together and each pulses for its own durMs.
export const STEPS: StepCopy[] = [
  {
    n: 1,
    title: 'The week in review',
    goal: 'three incidents, documented',
    body: 'Three BFP NDE-vibration incidents closed this week — JRG-CCGT-1 · BFP-3A and two more across the fleet. They arrive as documents in the inbox, not as nodes: the knowledge graph stays bounded.',
    sequence: [],
    handoffs: [{ from: 'docs', to: 'intake', label: '3 closed incidents' }],
    live: 'Three incidents received — reports, workflow traces and call transcripts queued for Intake.',
  },
  {
    n: 2,
    title: 'Extract from the documents',
    goal: 'what each document says',
    body: 'Documentation Intake parses every document at once. The Report Parser pulls the confirmed root cause, fix and vibration delta; the Workflow Tracer recovers the tests run and the off-path discovery step; the Transcript Parser captures the expert’s tacit finding.',
    // all 3 extractor skills fire in ONE parallel beat — start together, staggered stops
    sequence: [
      {
        skills: [
          { id: 'intake-report', durMs: 2000 },
          { id: 'intake-workflow', durMs: 1400 },
          { id: 'intake-transcript', durMs: 900 },
        ],
      },
    ],
    handoffs: [{ from: 'docs', to: 'intake', label: 'reports · workflows · transcripts' }],
    live: 'Intake parsing all three documents in parallel — each finishing as it lands.',
  },
  {
    n: 3,
    title: 'Synthesize the pattern',
    goal: 'the shared signature',
    body: 'Pattern Mining stacks the findings across all three incidents. The same story repeats: phase analysis pointed at a bent shaft, the bent shaft was ruled out, and the confirmed cause was a casing / weld crack found by an off-path inspection.',
    sequence: [{ skills: [{ id: 'synth-mining', durMs: 1500 }] }],
    handoffs: [{ from: 'intake', to: 'synth', label: 'structured findings' }],
    live: 'Pattern Mining clustering the findings — one signature recurs across all three.',
  },
  {
    n: 4,
    title: 'Surface the gaps',
    goal: 'what the graph can’t explain',
    body: 'Gap Detection maps the pattern onto the graph and finds two gaps: a casing crack confirmed 3 / 3 with no root-cause node to hold it, and a DT-PHASE → bent-shaft edge weighted 0.88 yet contradicted 3 / 3.',
    sequence: [{ skills: [{ id: 'synth-gap', durMs: 1400 }] }],
    handoffs: [{ from: 'synth', to: 'kg', label: 'compare to graph' }],
    live: 'Gap Detection pinning the pattern to the graph — two gaps light up.',
  },
  {
    n: 5,
    title: 'Propose edit #1 — add a node',
    goal: 'draft the missing knowledge',
    body: 'The KG Curator drafts a new RootCause — pump casing crack / weld fatigue — with a confirming Weld-NDT test, and files it into the proposed-changes panel. Nothing is written yet: +1 root cause, not +N incident nodes. The graph stays bounded.',
    sequence: [{ skills: [{ id: 'curator-node', durMs: 1300 }] }],
    handoffs: [{ from: 'synth', to: 'curator', label: 'gap · missing cause' }],
    live: 'Curator drafting the casing-crack node into the changeset — a proposal, not a write.',
  },
  {
    n: 6,
    title: 'Propose edit #2 — re-weight',
    goal: 'recalibrate from evidence',
    body: 'The Curator drafts the second edit: drop DT-PHASE → bent-shaft confidence from 0.88 to 0.70, because the week showed phase analysis over-attributed the 1×RPM signature that casing fatigue mimics. The graph still reads 0.88 — the new value lives only in the proposal.',
    sequence: [{ skills: [{ id: 'curator-reweight', durMs: 1200 }] }],
    handoffs: [{ from: 'synth', to: 'curator', label: 'gap · over-weighted' }],
    live: 'Curator drafting the re-weight into the changeset — still pending, graph unchanged.',
  },
  {
    n: 7,
    title: 'Validate the edits',
    goal: 'check before the human',
    body: 'The Validation Critic reviews the changeset: a Consistency Check confirms neither edit conflicts with existing CONFIRMS / FOLLOW_UP / RULES_OUT edges, SOP or safety; an Evidence Audit confirms each edit is justified by the incidents it cites. Both lines pass — still awaiting a human.',
    sequence: [
      { skills: [{ id: 'critic-consistency', durMs: 1200 }] },
      { skills: [{ id: 'critic-evidence', durMs: 1200 }] },
    ],
    handoffs: [{ from: 'curator', to: 'critic', label: 'proposed changeset' }],
    live: 'Validation Critic checking consistency, then auditing the evidence behind each edit.',
  },
  {
    n: 8,
    title: 'Human approves & runs',
    goal: 'the graph learns',
    body: 'A reliability engineer approves and runs the changeset. Only now does the graph mutate: the casing-crack node and its test solidify, the DT-PHASE edge re-weights 0.88 → 0.70, and the week’s incidents archive — they never became nodes. Two nodes added, nothing auto-written.',
    sequence: [
      {
        skills: [
          { id: 'curator-node', durMs: 1500 },
          { id: 'curator-reweight', durMs: 1500 },
        ],
      },
    ],
    handoffs: [
      { from: 'critic', to: 'human', label: 'validated changeset' },
      { from: 'human', to: 'kg', label: 'approve & run' },
    ],
    live: 'Approved — Curator applying the changeset; the knowledge graph updates in place.',
  },
  {
    n: 9,
    title: 'Step back — sharper next time',
    goal: 'smarter, not bigger',
    body: 'The next BFP NDE-vibration case now routes to the casing-crack path with calibrated phase confidence. A week of incidents made the graph sharper while it grew by just two nodes — the graph learned without growing an incident log.',
    sequence: [],
    handoffs: [],
    live: 'Cycle complete — the graph is sharper, and it never became a case archive.',
  },
]

export const TOTAL_STEPS = STEPS.length
