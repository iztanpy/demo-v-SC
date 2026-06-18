import type { StepCopy } from '../types'

// Global speed knob for the agent-skill pulses. Scales EVERY `durMs` below at once:
//   2 = twice as slow · 0.5 = twice as fast. Applied in useStepTimeline.
export const BEAT_MULTIPLIER = 3

// 9-step story. Slide 1 establishes the dense, living knowledge graph; Next zooms into the
// BFP NDE-vibration corner. A week of incidents is then documented; agents read the reports
// / workflows / transcripts, find a pattern the graph can't explain, and PROPOSE bounded
// edits — add a casing-crack node, re-weight an over-confident edge, capture a workflow
// shortcut. A human approves; only then does the graph mutate. Smarter, not bigger.
// `sequence` drives the timed agent-handoff flashing (useStepTimeline).
export const STEPS: StepCopy[] = [
  {
    n: 1,
    title: 'The knowledge graph',
    goal: 'one bounded, living graph',
    body: 'This is the fleet’s diagnostic knowledge graph — every symptom, test and root cause it has learned, bounded by the domain. It stays this size no matter how many incidents run: incidents are inputs, not nodes.',
    sequence: [],
    handoffs: [],
    live: 'The knowledge graph — timeless diagnostic knowledge, not a case log.',
  },
  {
    n: 2,
    title: 'Zoom in — the week’s incidents',
    goal: 'focus + three incidents',
    body: 'Zooming into the BFP NDE-vibration corner. Three incidents closed this week — JRG-CCGT-1 · BFP-3A and two more across the fleet — arrive as documents in the inbox, not as nodes.',
    sequence: [{ skills: [{ id: 'intake-report', durMs: 900 }] }],
    handoffs: [{ from: 'docs', to: 'intake', label: '3 closed incidents' }],
    live: 'Focusing on SYM-001 · three incidents received and queued for Intake.',
  },
  {
    n: 3,
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
    n: 4,
    title: 'Synthesize the pattern',
    goal: 'the shared signature',
    body: 'Pattern Mining stacks the findings across all three incidents. The same story repeats: phase analysis pointed at a bent shaft, the bent shaft was ruled out, and the confirmed cause was a casing / weld crack found by an off-path inspection.',
    sequence: [{ skills: [{ id: 'synth-mining', durMs: 1500 }] }],
    handoffs: [{ from: 'intake', to: 'synth', label: 'structured findings' }],
    live: 'Pattern Mining clustering the findings — one signature recurs across all three.',
  },
  {
    n: 5,
    title: 'Surface the gaps + a shortcut',
    goal: 'what the graph can’t explain',
    body: 'Gap Detection maps the pattern onto the graph: a casing crack confirmed 3 / 3 with no node, and an over-weighted DT-PHASE → bent-shaft edge — plus a captured call where a technician skipped triage straight to the runout, a workflow shortcut worth keeping.',
    sequence: [{ skills: [{ id: 'synth-gap', durMs: 1400 }] }],
    handoffs: [{ from: 'synth', to: 'kg', label: 'compare to graph' }],
    live: 'Gap Detection pinning the pattern to the graph — two gaps and a shortcut light up.',
  },
  {
    n: 6,
    title: 'Propose the changes',
    goal: 'draft bounded edits',
    body: 'The KG Curator drafts the edits into the proposed-changes panel: add a casing-crack RootCause with a Weld-NDT test, re-weight DT-PHASE → bent shaft from 0.88 to 0.70, and add the captured shortcut straight to the runout. Nothing is written yet — the graph stays bounded.',
    sequence: [
      {
        skills: [
          { id: 'curator-node', durMs: 1500 },
          { id: 'curator-reweight', durMs: 1100 },
        ],
      },
    ],
    handoffs: [{ from: 'synth', to: 'curator', label: 'gaps + shortcut' }],
    live: 'Curator drafting the changeset — proposals, not writes; the graph is unchanged.',
  },
  {
    n: 7,
    title: 'Validate the changes',
    goal: 'check before the human',
    body: 'The Validation Critic reviews the changeset: a Consistency Check confirms nothing conflicts with existing CONFIRMS / FOLLOW_UP / RULES_OUT edges, SOP or safety; an Evidence Audit confirms each edit is justified by the incidents it cites. Everything passes — still awaiting a human.',
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
    body: 'A reliability engineer reviews the rationale and approves the changes in two batches. Only now does the graph mutate: the casing-crack node and its test solidify, the DT-PHASE edge re-weights 0.88 → 0.70, the shortcut draws, and the week’s incidents archive — they never became nodes.',
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
    title: 'Step back — sharper & shorter',
    goal: 'smarter, not bigger',
    body: 'The next BFP NDE-vibration case now routes to the casing-crack path with calibrated phase confidence, and can skip straight to the runout. A week of incidents made the graph sharper and the workflow shorter — while it grew by just two nodes.',
    sequence: [],
    handoffs: [],
    live: 'Cycle complete — the graph is sharper and shorter, and it never became a case archive.',
  },
]

export const TOTAL_STEPS = STEPS.length
