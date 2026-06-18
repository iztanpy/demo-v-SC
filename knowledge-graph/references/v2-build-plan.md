# Part 2 KG — v2 Redesign: "The graph learns without growing an incident log"

> Living build plan for the Part 2 knowledge-graph app (mirrored from the planning session).
> Sections: the v2 core build, then **Feedback round 1** refinements (A–F + A′/A″, D′/D″/D‴).

## Context

The current Part 2 demo (`knowledge-graph/`, React+Vite+TS) models **incidents as nodes** — every incident accretes Diagnosis / WorkOrder / Conversation / Outcome nodes, and the signature beat is "wrong diagnosis kept + `CORRECTED_BY` edge." That design is **flawed**: N incidents → N×(many) nodes, an unbounded incident-log explosion. It is not a knowledge graph; it is a case archive.

**New model (per `knowlede-graph-v2/references/knowledge_graph_1.cypher`):** the KG is **pure, timeless diagnostic knowledge** — bounded by the diagnostic domain, *no incident instances*. Incidents live **outside** the graph as documents. The new thesis the demo makes visible:

> A week of incidents is documented; agents read the service reports / workflows / conversations, find patterns, and **recommend bounded edits to the knowledge graph** — adding what was missing and re-calibrating what was wrong. The graph gets **smarter, not bigger**.

This supersedes the old `knowledge-graph/references/part2-demo.md` and `part2-build-plan.md` (which describe the flawed incident-centric version — leave them on disk but they are no longer the spec).

### Decisions locked with the user
- **Climax = two KG edits:** (1) **ADD a node** — `RootCause` "Pump casing crack / weld fatigue" + a confirming `DiagnosticTest` (weld NDT / dye-penetrant of the volute); (2) **RE-WEIGHT an edge** — `DT-PHASE -[CONFIRMS]-> RC-BENT-SHAFT` drops `0.88 → 0.70`.
- **Story:** 3 incidents across "the week," ~9 steps.
- **Agent roster:** redesigned from scratch around ingest → analyze → recommend → validate → approve (proposed below).
- **KG fidelity:** faithful-but-trimmed render of the cypher schema (same node/edge types; drop the lowest-signal test, DT-THERMOGRAPHY, for projector legibility).
- **Incident staging:** an **external "incident inbox"** of 3 cards rendered *outside* the SVG graph — visually proving incidents are inputs, not graph bloat.
- **Location:** rework the existing `knowledge-graph/` React app on the `kg-v2` branch (it already has the 3-pane layout + step engine). No new app.

### The Part 1 → Part 2 hook (and a flagged inconsistency)
Part 1 (`app.js:1980`) ends on the revised diagnosis **"Crack in pump casing on BFP-3A"** (60 mm hairline, 4-o'clock on the volute, near the discharge weld; bearing damage secondary). That root cause **does not exist** in the cypher KG (which knows only bearing spall, bent shaft, lube failure, misalignment) — which is exactly why "add the casing-crack node" is the natural climax and closes the Part 1 → Part 2 loop.
- ⚠️ **Flag:** the repo is internally inconsistent — `CLAUDE.md`'s canonical scenario and the cypher file both center on **bent shaft**, while Part 1's actual ending is **casing crack**. This plan anchors Part 2 v2 to Part 1's *actual* ending (casing crack).

---

## New knowledge-graph model (`src/data/graph.ts`)

Trimmed faithful render of `knowledge_graph_1.cypher`. Node `id`s/props copied verbatim for ITP schema fidelity.

**Committed nodes:** `AssetClass` `AC-BFP` · `Symptom` `SYM-001` · `DiagnosticTest` ×5 (`DT-PHASE`, `DT-HOUSING-INSPECT`, `DT-OIL-ANALYSIS`, `DT-RUNOUT`, `DT-ALIGNMENT`; dropped `DT-THERMOGRAPHY`) · `RootCause` ×4 (`RC-BEARING-SPALL`, `RC-BENT-SHAFT`, `RC-LUBE-FAIL`, `RC-MISALIGN`).
**Proposed nodes (climax add):** `RC-CASING-CRACK` + `DT-WELD-NDT`.

**Two test layers, root causes LAST** (supersedes the cypher's `THEN_IF` chaining for clarity — user-directed):

```
AssetClass ← Symptom → Test layer 1 → (sometimes) Test layer 2 → Root causes (LAST)
       OCCURS_IN  TRIGGERS     FOLLOW_UP (when needed)      CONFIRMS / RULES_OUT
```

- **Layer 1 (triage):** `DT-PHASE`, `DT-HOUSING-INSPECT` off the symptom (`TRIGGERS {order}`).
- **1 layer** when a triage test is decisive → it `CONFIRMS` a cause directly (e.g. `DT-HOUSING-INSPECT -CONFIRMS-> RC-BEARING-SPALL` 0.95).
- **2 layers** when inconclusive → one `FOLLOW_UP` hop to a **Layer 2** confirmatory test (`DT-RUNOUT`, `DT-ALIGNMENT`, `DT-OIL-ANALYSIS`, +proposed `DT-WELD-NDT`), which `CONFIRMS {band, probability}` the cause.
- Only the single L1→L2 hop is a test→test edge; all test→cause edges flow rightward into the final cause column.
- Re-weight target = `DT-PHASE -CONFIRMS-> RC-BENT-SHAFT` 0.88 → 0.70. Proposed wiring: `DT-PHASE -FOLLOW_UP-> DT-WELD-NDT` + `DT-WELD-NDT -CONFIRMS-> RC-CASING-CRACK`.
- `DiagnosticTest` nodes carry `tier: 'triage' | 'followup'`; Layer-2 render smaller. SVG column headers (Symptom · Test layer 1 · Test layer 2 · Root causes).
- **Confirmatory tests have two outcomes:** each Layer-2 test either `CONFIRMS` its cause **or** comes back inconclusive → a shared **`NEEDS-INFO`** node (label `Inconclusive`, violet) via an `INCONCLUSIVE` edge (faint grey-violet dotted + curved).
- **Every `RootCause` carries a `solution` prop** (remedy), shown in the Inspector.

## Types (`src/types.ts`)
- `NodeLabel = 'AssetClass' | 'Symptom' | 'DiagnosticTest' | 'RootCause' | 'Inconclusive'`
- `RelType = 'OCCURS_IN' | 'TRIGGERS' | 'FOLLOW_UP' | 'CONFIRMS' | 'RULES_OUT' | 'INCONCLUSIVE' | 'SHORTCUT'`
- `GraphNode`: `tier?`, `context?`, `size?`, `state?: 'committed'|'proposed'`, `proposeStep?`, `batch?`.
- `GraphEdge`: `order?`, `band?`, `probability?`, `result?`, `context?`, `state?`, `proposeStep?`, `oldProbability?`, `newProbability?`, `reweightProposeStep?`, `batch?`.
- `StepCopy.sequence: StepBeat[]` where `StepBeat = { skills: { id; durMs }[] }` (beats sequential; within a beat skills start together, each ends at its own `durMs`).
- `ProposedChange { id, kind: 'add-node'|'add-edge'|'reweight'|'shortcut', label, detail, proposeStep, batch, cites[], evidence, quote }`.

## Agent roster (`src/data/agents.ts`)
Ingest → analyze → recommend → validate + human gate. Mantra: *documents in · patterns found · edits proposed · human approves*. 9 skills:

| key | label | verb | skills |
|---|---|---|---|
| `intake` | Documentation Intake | captures | Report Parser · Transcript Parser · Workflow Tracer |
| `synth` | Pattern Synthesis | finds | Pattern Mining · Gap Detection |
| `curator` | KG Curator | proposes | Node Proposal · Edge Re-weighting |
| `critic` | Validation Critic | validates | Consistency Check · Evidence Audit |

Human-in-the-loop (Reliability Engineer) = the approval beat at step 8, not an agent card.

## Timed agent handoff animation (`src/useStepTimeline.ts` + `AgentSidebar.tsx`)
- `useStepTimeline(step)` — `useEffect` keyed on step builds a per-skill schedule from `sequence`, sets start/end timers, returns `{ pulsing, done }`. Timers in the effect, never in render (WA#7). Reduced-motion → snap to done.
- Skill rows: `idle` (dim) · `pulsing` (flash) · `done` (steady ✓). `BEAT_MULTIPLIER` (in `steps.ts`) scales every `durMs`.

## The week's incidents + extraction (`src/data/incidents.ts`)
Three closed BFP NDE-vibration incidents (JRG-CCGT-1 · BFP-3A, Sakra-CCGT-1 · BFP-2A, Banyan-CHP · BFP-1A). All share the signature: DT-PHASE → bent shaft → ruled out → casing/weld crack found off-path. Per-doc `ExtractionChip { skill, doc, field, value, detail, refs[] }`. `PARSE_MULTIPLIER` inflates step-3 timing. `GAPS` (2 gaps + 1 shortcut), `CHANGES` (changeset, batches), `APPROVE_STEP = 8`.

## 9-step narrative (`src/data/steps.ts`)
1. **The knowledge graph** — dense, zoomed out.
2. **Zoom in** — focus SYM-001; 3 incidents arrive in the inbox.
3. **Extract** — documents parse live (staged "agents working").
4. **Synthesize the pattern.**
5. **Surface the gaps + a shortcut** — 2 gaps + 1 efficiency shortcut.
6. **Propose the changes** — changeset, 2 batches.
7. **Validate the changeset.**
8. **Approve** — rationale dossier; 2-batch tick→Proceed; graph mutates only here.
9. **Step back — sharper & shorter.**

---

# Feedback round 1 — refinements on the built v2

`knowledge-graph/references/feedback_1.md` (6 items). Locked: build all 6 over reviewable batches · 2nd capture = **one** shortcut edge · approval in **2 batches** (tick-all → proceed ×2) · dense multi-symptom backdrop zooming to SYM-001 · full-right-panel rationale dossier only at approval.

**A · Dense graph + zoom (item 6).** Decorative context symptoms under `AC-BFP`; step 1 fit-all (dense), step ≥2 zoom to the SYM-001 focus, context dimmed; CSS transform transition.

**A′ · Dense-graph refinement.** No "undefined" labels on context edges; `AC-BFP` (grey) central hub with every Symptom `OCCURS_IN`-spoking into it; focus cluster on the RIGHT; `VIEWBOX` = `{x,y,w,h}` frame on the focus; `DENSE_TRANSFORM` computed from the node bounding box (fit-all); column headers inside the frame.

**A″ · Context clusters follow the real tier structure.** Each context chain mirrors the focus: Symptom (yellow) → triage test (blue) → follow-up test (blue) → root cause (red), via `TRIGGERS`→`FOLLOW_UP`→`CONFIRMS`. Some 4-tier, some 3-tier. No symptom→cause edges. 1–2 chains per symptom, radiating outward, sizes varied by tier.

**B · Drawers (item 2).** `leftOpen`/`rightOpen` in store; collapse chevrons; grid columns animate to a thin reopen handle. **Left pane is a tabbed panel: Story | Incident inbox** (inbox moved out of the centre; auto-switches to inbox at steps 2–3).

**C · Fullscreen KG (item 4).** Top-bar **Focus graph** toggle collapses both side panels + hides inbox/context → KG fills the viewport.

**D′ · Live parsing rework ("agents are working").** Step-3 extraction in `IncidentInbox` is staged & timed: each doc transitions **queued → parsing… → extracting… → done**, staggered by incident, durations inflated by `PARSE_MULTIPLIER`. New `src/useDocTimeline.ts` hook (timers in effect; reduced-motion → done). Output condensed to **field · value**. Auto-show the inbox tab at steps 2–3.

**D″ · Loading feel from app.js + dropdowns + references.** While parsing/extracting, show the **reveal-dots theater** (3 bouncing dots + `<Agent> · parsing…/extracting…`), result **slides in** (`reveal-slide`). Each done chip has a `▸`→`▾` dropdown → fuller `detail` + full provenance `refs` (source doc · locator + system: OSIsoft PI / Maximo / SOP-BFP-VIBR-001 + the KG node it maps to).

**D‴ · Extend "agents working" to steps 4–6.** `KGHero` calls `useStepTimeline(step)`; while the step's skills pulse, the centre panel shows the reveal-dots theater (message = `STEPS[step-1].live`), then the result reveals. Step 4 = pattern table (after theater). Step 5 = findings as collapsible chips (`DerivedGap` gains `detail`+`refs`). Step 6 = changeset rows as the same collapsible chips (`quote`+`detail`+cites). Reuses the inbox `kg-inc-chip*` / `reveal-*` classes; `ctxExpanded` `useState` drives disclosure. Caveat: `useStepTimeline` called in both `AgentSidebar` and `KGHero` (synced enough for the demo).

**E · Rationale dossier (item 5).** At step 8 the right panel becomes a **Decision dossier** (`RationaleDossier.tsx`): per change — edit + evidence badge + one representative quote + compact validation pills. **Two-batch approval:** tick all in the current batch → **Approve & run Batch N** → that batch's elements solidify (`approvedBatches` in store; per-element `batch` gates apply). Navigating re-arms the gate.

**F · 2nd knowledge capture — shortcut (item 1).** Proposed `SHORTCUT` edge `SYM-001 → DT-RUNOUT` (skip triage), captured from a call; teal dashed + curved. Surfaced at step 5 as a 3rd finding (teal callout + Findings row), drafted into the changeset Batch 2 at step 6, applied at step 8. Payoff: "next time, skip straight to the runout."

## Files
- `src/data/graph.ts` — pure-knowledge model, two test tiers, central hub + radial context chains, `SHORTCUT` edge, `DENSE_TRANSFORM` fit, `VIEWBOX` frame.
- `src/data/incidents.ts` — 3 incidents + per-doc chips (`field/value/detail/refs`), `PARSE_MULTIPLIER`, `GAPS` (2 gaps + shortcut), `CHANGES` (batched, `evidence`/`quote`), `APPROVE_STEP`.
- `src/data/steps.ts` — 9-step narrative, `BEAT_MULTIPLIER`, per-beat `sequence`.
- `src/data/agents.ts` — 4-agent roster, 9 skills.
- `src/types.ts` — unions + interfaces above.
- `src/store.ts` — step nav + `leftOpen`/`rightOpen`/`focusGraph` + `approvedBatches`/`approveBatch`.
- `src/useStepTimeline.ts`, `src/useDocTimeline.ts` — timed animations.
- `src/App.tsx` — 3-pane grid, drawers, focus-graph toggle, dossier swap at approval.
- `src/components/Rail.tsx` — tabbed left pane (Story | Incident inbox).
- `src/components/IncidentInbox.tsx` — staged extraction + reveal-dots + dropdown/references.
- `src/components/KGHero.tsx` — graph render, zoom, gap callouts, context panel (theater + collapsible findings/changeset), inspectors.
- `src/components/AgentSidebar.tsx` — timed skill flashing.
- `src/components/RationaleDossier.tsx` — approval-step decision dossier.
- `src/index.css` — all styles.

## Out of scope
- No real graph DB / Cypher execution — hardcoded TS data only.
- No editing root `app.js` / Part 1 (the "See behind the scenes" link stays deferred).
- No restoring the incident-log model or `CORRECTED_BY` beat.

## Verification (per WA#13)
Run `cd knowledge-graph && npm run dev` (or `npm run build` + serve `dist/` on :8001). Click Next through all 9 steps:
1. Dense graph (hub centre, focus right) → Next zooms into SYM-001, context greyed.
2. Inbox (left tab) gets 3 incidents; step 3 shows staged "agents working" parsing → condensed results with dropdowns (detail + refs).
3. Step 4 pattern table, step 5 findings (2 gaps + shortcut, collapsible), step 6 changeset (2 batches, collapsible) — each gated by the working theater.
4. Step 7 validates; step 8 dossier → tick batch 1 → Approve (casing node solidifies, edge flips 0.88→0.70) → tick batch 2 → Approve (shortcut draws); inbox archives.
5. Step 9 payoff; Restart resets to pre-approval committed state.
- Subjective (timing/pacing, zoom feel, density/legibility) → human check.
