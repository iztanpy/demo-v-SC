import type { StepCopy } from '../types'

// The 10-step story, mapped onto the canonical BFP-3A bent-shaft incident
// (INC-2026-0537). Each step: goal · narration · which member agents light ·
// which handoff packets animate · parallel? · orchestrator live caption.
// Source: knowledge-graph/part2-demo.md.
export const STEPS: StepCopy[] = [
  {
    n: 1,
    title: 'Consulting the graph',
    goal: 'ranked diagnosis candidates',
    body: 'The Data agent searches the knowledge graph for past incidents matching the BFP-3A vibration signature.  The Evaluator ranks them into diagnosis candidates.',
    activeAgents: ['data-retrieval', 'eval-rank'],
    handoffs: [
      { from: 'kg', to: 'data', label: 'matching incidents' },
      { from: 'data', to: 'eval', label: 'candidates' },
    ],
    live: 'Dispatching Retrieval to search the graph; Diagnosis Ranking on standby for candidates.',
  },
  {
    n: 2,
    title: 'First node created',
    goal: 'record initial diagnosis',
    body: 'A diagnosis is selected — NDE bearing race spalling, 78%. The Graph Writer records it as a new node linked to the symptom, while the SOP & Safety Validator confirms it is safe to proceed.',
    activeAgents: ['data-writer', 'eval-sop'],
    handoffs: [
      { from: 'data', to: 'kg', label: 'write: initial Dx' },
      { from: 'kg', to: 'data', label: 'logged ✓' },
    ],
    parallel: true,
    live: 'Graph Writer recording the initial diagnosis — SOP & Safety validating in parallel.',
  },
  {
    n: 3,
    title: 'Work order + technician',
    goal: 'work order + technician',
    body: 'The Evaluator matches a cert-qualified technician (Lim Wei Jie, Sulzer BFP) while the Output team drafts the work order in parallel; the SOP & Safety Validator clears the scope.',
    activeAgents: ['data-retrieval', 'eval-tech', 'eval-sop', 'out-wo'],
    handoffs: [
      { from: 'data', to: 'eval', label: 'cert-matched techs' },
      { from: 'eval', to: 'output', label: 'WO request' },
    ],
    parallel: true,
    live: 'Fanning out: Technician Matching and Work Order Generation running together.',
  },
  {
    n: 4,
    title: 'The diagnosis turns out wrong',
    goal: 'capture the correction',
    body: "Onsite, Lim's dial-indicator runout test rules out the bearing. The Documentation team captures the Lim ↔ Dr. Ismail call, extracts the findings, and logs the field observations — handing structured information to the Graph Writer.",
    activeAgents: ['doc-transcript', 'doc-entity', 'doc-field', 'data-writer'],
    handoffs: [{ from: 'doc', to: 'data', label: 'structured findings' }],
    live: 'Documentation team capturing the field correction; routing structured findings to Data.',
  },
  {
    n: 5,
    title: 'Re-query with new evidence',
    goal: 'find the real precedent',
    body: 'Armed with the runout + 1×RPM phase data, Retrieval queries the graph again. A different precedent now dominates — the Banyan-CHP bent-shaft case, surfaced by vibration-signature similarity.',
    activeAgents: ['data-retrieval'],
    handoffs: [{ from: 'kg', to: 'data', label: 'bent-shaft precedent' }],
    live: 'Re-querying with new evidence — Retrieval surfacing the bent-shaft precedent.',
  },
  {
    n: 6,
    title: 'A corrected diagnosis',
    goal: 'corrected diagnosis + WO',
    body: 'The Evaluator reaches a new diagnosis — bent shaft, confirmed by 1×RPM-dominant vibration and a ~180° NDE–DE phase shift — clears it via the SOP & Safety Validator, and the Output team generates a new work order.',
    activeAgents: ['eval-rank', 'eval-sop', 'out-wo'],
    handoffs: [
      { from: 'data', to: 'eval', label: 'new evidence' },
      { from: 'eval', to: 'output', label: 'corrected WO' },
    ],
    live: 'Evaluator re-ranking to the corrected diagnosis; Output drafting the new work order.',
  },
  {
    n: 7,
    title: 'The wrong path is kept',
    goal: 'keep the wrong path',
    body: 'The initial diagnosis is NOT deleted. The Graph Writer tags it incorrect and draws a corrected-by edge to the bent-shaft node — preserved as a future learning point, cleared by the SOP & Safety check.',
    activeAgents: ['data-writer', 'eval-sop'],
    handoffs: [{ from: 'data', to: 'kg', label: 'write: corrected-by + relabel' }],
    live: 'Graph Writer preserving the wrong path — tagging it incorrect, linking corrected-by.',
  },
  {
    n: 8,
    title: 'The fix succeeds',
    goal: 'confirm the fix',
    body: 'The shaft is replaced; NDE vibration drops to 6.1 mm/s. The Graph Writer confirms the corrected node and attaches a separate outcome node, keeping remedy and diagnosis independently reusable.',
    activeAgents: ['data-writer'],
    handoffs: [{ from: 'data', to: 'kg', label: 'write: confirm + outcome' }],
    live: 'Confirming the fix; attaching the outcome node to close the loop.',
  },
  {
    n: 9,
    title: 'Service report, drafted from the graph',
    goal: 'draft service report',
    body: 'The Output team drafts the service report while Retrieval pulls the incident nodes in parallel — richer than today’s, because it carries the full arc: what was suspected, why it was wrong, and what actually worked.',
    activeAgents: ['out-report', 'data-retrieval'],
    handoffs: [
      { from: 'kg', to: 'data', label: 'incident nodes' },
      { from: 'data', to: 'output', label: 'draft input' },
    ],
    parallel: true,
    live: 'Retrieval and Report Drafting running in parallel to assemble the service report.',
  },
  {
    n: 10,
    title: 'Step back and see what was built',
    goal: 'the learned incident',
    body: 'One incident captured as a connected story — the symptom, the wrong turn that was kept, the corrected diagnosis, and the successful outcome. The dead-end linked to the fix is the thesis of the demo.',
    activeAgents: [],
    handoffs: [],
    live: 'Cycle complete — the incident is captured as a connected, corrected story.',
  },
]

export const TOTAL_STEPS = STEPS.length
