# Design Spec — Knowledge Graph (Part 2, as-built)

> **Status:** describes the app as it currently runs (`kg-part2`, Vite/React). This is the
> *as-built* reference — it documents what the code does, not what an older plan proposed.
> Note: `part2-demo.md` describes a superseded 10-step "data agent / evaluator" storyline; the
> shipped app is the **9-step Intake → Synthesis → Curator → Critic** storyline below.

---

## 1. What this is

A presenter-driven, click-through demo of a **self-improving diagnostic knowledge graph**. The
thesis it makes visible: a week of closed incidents arrives as *documents* (not graph nodes),
agents read them, find a pattern the graph can't explain, propose bounded edits, a human
approves — and **only then** does the graph mutate. The graph grows *smarter, not bigger*: two
nodes added, one edge re-weighted, one workflow shortcut captured.

Mantra (printed bottom-left): **documents in · patterns found · edits proposed · human approves.**

Single canonical happy path. Hardcoded data. No backend, no real LLM/agent execution — every
"agent working" beat is scripted animation on timers. Navigation is manual (Next / Back); nothing
auto-advances, so it is presenter-safe.

## 2. Tech stack

- **Vite + React 19 + TypeScript**, package name `kg-part2`. `npm run dev` → http://localhost:5173.
- **Zustand** for global step/UI state (`src/store.ts`).
- Graph is **hand-laid-out SVG** (not a force sim) — fixed `x`/`y` coordinates, CSS transitions
  for the zoom and the draw-on animations. (The *v2* sibling project is the 3D force-graph port;
  this project is the 2D SVG original.)
- All styling in one hand-rolled `src/index.css`. Light theme (Sembcorp green `#00A651` as accent,
  never dominant fill). No Tailwind, no CDN deps.

## 3. Files at a glance

| File | Role |
|---|---|
| `src/main.tsx` | React entry (StrictMode → `<App/>`). |
| `src/App.tsx` | Three-pane shell, top bar, footer nav, step-driven panel open/close effects. |
| `src/store.ts` | Zustand store: `step`, `approvedBatches`, drawer/focus flags + actions. |
| `src/types.ts` | All shared types: agents, step timeline, graph model, changeset. |
| `src/data/steps.ts` | The 9 step scripts (copy + agent-beat `sequence` + handoffs + live caption). |
| `src/data/agents.ts` | 4 agents (`TEAMS`) + their 9 skills (`SKILLS`). |
| `src/data/graph.ts` | The bounded SYM-001 graph (focus nodes/edges) + generated dense backdrop. |
| `src/data/incidents.ts` | The week's 3 incidents-as-documents, pattern rows, gaps, changeset. |
| `src/useStepTimeline.ts` | Timer hook → which skills are `pulsing` / `done` for the active step. |
| `src/useDocTimeline.ts` | Timer hook → per-document `queued→parsing→extracting→done` at step 3. |
| `src/components/KGHero.tsx` | The centre graph + contextual panel + node/edge inspectors. |
| `src/components/Rail.tsx` | Left pane: tabbed **Story** / **Incident inbox**. |
| `src/components/IncidentInbox.tsx` | The 3 incident cards × 3 documents, with parse theater. |
| `src/components/AgentSidebar.tsx` | Right pane: 4 agent cards, skills flashing per beat. |
| `src/components/RationaleDossier.tsx` | Right pane at step 8: two-batch reviewer sign-off. |

## 4. Layout (App.tsx)

Full-viewport three-column grid: **left rail · centre KG hero · right panel**. Column widths are
driven inline by state — an open side pane is `300px` (left) / `400px` (right); collapsed is a
`26px` reopen sliver (`›` / `‹`).

- **Top bar:** brand dot, title ("Hyperspace OS · Behind the Scenes"), a **Focus graph** toggle
  (hides both side panes to show the graph full-bleed), and a `step / 9` counter.
- **Footer nav:** Back (disabled at step 1), Restart (only at step 9), Next (disabled at step 9).
- **Right pane is conditional:** at the approval step (8) it renders `<RationaleDossier/>`;
  every other step it renders `<AgentSidebar/>`.

Two step-driven effects in `App.tsx` open/close panes on cue:
- Steps **2–3** force the left pane open (so the incident inbox shows); step **4** collapses it
  again to hand the stage to the graph beats.
- Step **8** opens the right pane (dossier); once `approvedBatches >= 2` it closes it again.

## 5. State model (store.ts)

Zustand store `useP2`:

- `step` (1–9, clamped) and `maxStepReached`.
- `approvedBatches` (0 → 1 → 2): how many approval batches the reviewer has run at step 8.
  **Every `next`/`back` resets this to 0**, so re-entering step 8 re-arms the approval gate.
- `leftOpen` / `rightOpen` / `focusGraph` drawer flags (all start closed; the step effects open
  them on cue). `focusGraph` hides both side panes regardless of their own flags.
- Actions: `next`, `back`, `restart` (full reset to step 1, panes closed), `approveBatch`,
  `toggleLeft`, `toggleRight`, `toggleFocus`.

`TOTAL_STEPS` is re-exported from `data/steps.ts` (= `STEPS.length` = 9).

## 6. The 9-step storyline (data/steps.ts)

| # | Title | Beat / agent at work | What the audience sees |
|---|---|---|---|
| 1 | The knowledge graph | — | Dense full backdrop, zoomed out. "Incidents are inputs, not nodes." |
| 2 | Zoom in — the week's incidents | Intake (`intake-report`) | Camera zooms to the SYM-001 corner; 3 incidents land in the inbox as documents. |
| 3 | Extract from the documents | Intake — 3 skills in **one parallel beat** | Each incident's report/workflow/transcript parses (staggered stops). |
| 4 | Synthesize the pattern | Pattern Synthesis (`synth-mining`) | Pattern table: same signature across all 3 incidents. |
| 5 | Surface the gaps + a shortcut | Pattern Synthesis (`synth-gap`) | Two gap callouts + one shortcut pinned onto the graph. |
| 6 | Propose the changes | KG Curator (`curator-node`, `curator-reweight`) | Changeset drafted; proposed nodes/edges appear **dashed** (not applied). |
| 7 | Validate the changes | Validation Critic — 2 sequential beats | Consistency Check, then Evidence Audit; ✓ ticks land. |
| 8 | Human approves & runs | reviewer (dossier) | Two-batch sign-off; on approval the graph **mutates in place**. |
| 9 | Step back — sharper & shorter | — | New nodes/edges pulse; rest dims. "Grew by just two nodes." |

Each step object carries: `title`, `goal`, `body` (rail copy), `sequence` (ordered beats of
timed skill pulses), `handoffs` (packet labels between hubs), and `live` (the orchestrator caption
in the agent panel). `BEAT_MULTIPLIER = 3` is the global speed knob scaling every `durMs`.

## 7. Agents & skills (data/agents.ts)

Four agents on the **ingest → analyze → recommend → validate** spine (+ a human gate):

| Agent (`TEAMS`) | verb | colour | Skills |
|---|---|---|---|
| Documentation Intake | captures | amber `#F59E0B` | Report Parser, Transcript Parser, Workflow Tracer |
| Pattern Synthesis | finds | blue `#2563EB` | Pattern Mining, Gap Detection |
| KG Curator | proposes | green `#00A651` | Node Proposal, Edge Re-weighting |
| Validation Critic | validates | violet `#8B5CF6` | Consistency Check, Evidence Audit |

9 skills total. In `AgentSidebar`, an agent card lights when any of its skills is pulsing or done
this step; each skill row shows idle / pulsing / done ✓ from `useStepTimeline`.

## 8. Timeline hooks (the "agents working" theater)

Both hooks set `setTimeout`s **inside an effect** (kicked off on step/active change, never in
render — the React form of the single-source-of-truth rule) and honour
`prefers-reduced-motion` (→ everything immediately "done").

- **`useStepTimeline(step)`** → `{ pulsing, done }` sets of skill ids. Walks the step's
  `sequence`: beats run in order; within a beat all skills START together but each ends at its own
  `durMs` (parallel, independent stop). A beat ends when its longest skill finishes. Steps ≥4 run
  a touch faster (`stepSpeed`). Drives the agent panel **and** the centre "panel working" gate.
- **`useDocTimeline(active)`** → `Map<docKey, phase>` for the 9 documents (3 incidents × 3 docs)
  at step 3. Each doc type has its own parse/extract duration; cards run at different speeds
  (`CARD_SPEED`) so nothing finishes in lockstep. `PARSE_MULTIPLIER = 1.5` inflates the timings.

## 9. Graph data model (types.ts + data/graph.ts)

**Pure knowledge graph — no incident instances live in it.** Layout is a left-to-right pipeline:

```
AssetClass ←OCCURS_IN— Symptom —TRIGGERS→ Test L1 —FOLLOW_UP→ (sometimes) Test L2 —CONFIRMS/RULES_OUT→ RootCause
```

- **Node labels:** `AssetClass` (slate), `Symptom` (amber), `DiagnosticTest` (blue),
  `RootCause` (red), `Inconclusive` (violet "more info needed" sink).
- **Edge types:** `OCCURS_IN`, `TRIGGERS` (with `order`), `FOLLOW_UP` (with routing `result`),
  `CONFIRMS` / `RULES_OUT` (with `probability` + `band`), `INCONCLUSIVE`, `SHORTCUT`.
- **Test tiers:** `triage` (first-line, full size) vs `followup` (confirmatory, smaller).
- **Columns** (`COLS`): asset 1150 · symptom 1430 · L1 1710 · L2 2000 · cause 2350. The focus
  cluster sits on the RIGHT of the canvas; `VIEWBOX` frames it for step ≥ 2.

**Focus cluster (`FOCUS_NODES`/`FOCUS_EDGES`):** AC-BFP, SYM-001 (BFP NDE vibration high), two L1
tests (Phase/spectrum, Housing inspect), three L2 tests (Runout, Alignment, Oil analysis), four
committed root causes (Bent shaft, Misalignment, Bearing spalling, Lube failure), the NEEDS-INFO
sink, **plus two `proposed` nodes** (DT-WELD-NDT, RC-CASING-CRACK) that ghost in at step 6.

**Dense backdrop (`CONTEXT_NODES`/`CONTEXT_EDGES`):** 11 other BFP symptoms (SYM-002…012) with
their tests/causes, generated **deterministically** (seeded sine) as a radial field ringing the
AC-BFP hub. Marked `context: true` → decorative, unlabeled, dimmed/clipped once we zoom in. Dense
on slide 1; `DENSE_TRANSFORM` (computed by `fitTransform`) fits the whole canvas into the viewBox
for step 1, then returns to identity (zoom-in) for step ≥ 2.

**Proposed → applied gating** (the core mechanic, in `KGHero`):
- A `proposed` element appears at its `proposeStep` (6). On step 6 itself it waits for the
  "Drafting changes…" theater to finish before mounting (so the draw-on animation fires *after*
  the agent drafts). Until applied it renders dashed with a `PROPOSED · not applied` tag.
- `batchApplied(batch)`: before step 8 → not applied; after step 8 → applied; *at* step 8 →
  applied once the reviewer has run that batch (`approvedBatches >= batch`).
- **Re-weight:** the committed DT-PHASE → RC-BENT-SHAFT `CONFIRMS` edge carries
  `oldProbability 0.88 → newProbability 0.70`; the flip only renders on approval.
- **Runout promotion (batch 2 payoff):** once both batches apply, the captured
  SYM-001 → DT-RUNOUT `SHORTCUT` formalises into a first-line `TRIGGERS` edge and DT-RUNOUT is
  re-pinned from Test L2 into the L1 column (`RUNOUT_PROMOTED`).
- **Step 9:** newly created nodes/edges + the re-weighted edge **pulse**; everything else dims.

## 10. The week's incidents (data/incidents.ts)

Three closed BFP NDE-vibration incidents — JRG-CCGT-1·BFP-3A, Sakra-CCGT-1·BFP-2A,
Banyan-CHP·BFP-1A — each with three documents: **Service report · Workflow trace · Call
transcript**. All three share one signature: *DT-PHASE pointed at bent shaft → bent shaft ruled
out → casing/weld crack found off-path*. Each document carries an `ExtractionChip` (which Intake
skill, condensed field·value, fuller detail, provenance refs).

Derived artifacts in the same file:
- **`PATTERN_ROWS`** — the step-4 pattern table (one column per incident).
- **`GAPS`** — the step-5 findings (2 knowledge gaps + 1 shortcut), each pinned to a graph target.
- **`CHANGES`** (`ProposedChange[]`) — the changeset, in **two batches**:
  - **Batch 1 · new knowledge:** add RC-CASING-CRACK (+ DT-WELD-NDT); re-weight DT-PHASE→bent
    shaft 0.88→0.70. (cites 3/3 incidents)
  - **Batch 2 · efficiency:** add the SYM-001→DT-RUNOUT shortcut. (captured on one call)
- **`APPROVE_STEP = 8`** — the gate the whole proposed/applied logic keys off.

## 11. Centre panel & inspectors (KGHero.tsx)

The contextual panel (top-right of the graph, hidden in Focus mode) is step-driven:
- While a step's skills still pulse → **reveal-dots theater** ("Synthesizing…/Scanning…/Drafting…").
- Step 4 → pattern table · Step 5 → findings list (expandable) · Steps 6–8 → changeset grouped
  by batch, with the Validation Critic "running" before the ✓ ticks land at step 7.

**Gap callouts (`renderGaps`, step 5 only, after the scan finishes):** a ghost "?" node where the
casing-crack cause is missing (3/3), an over-weight pill on the DT-PHASE→bent-shaft edge, and a
dashed teal shortcut curve SYM-001→DT-RUNOUT.

**Inspectors:** clicking a non-context node opens a property inspector (full cypher props);
clicking an edge opens an edge inspector (result / confidence+band / pending re-weight / order).
Clicking blank space clears the selection. Context (backdrop) nodes are not clickable.

## 12. Known simplifications / non-goals

- Single happy path; data hardcoded; no real agents/LLM/DB.
- Graph is fixed-coordinate SVG, not a force simulation (that's the v2 project).
- Backdrop nodes are decorative and unlabeled (deliberate — avoids fabricated vendor/standard
  names for a technically literate audience).
- `references/part2-demo.md` is a superseded earlier storyline; this dspec is the current source
  of truth for the as-built app.
