# Design Spec — 3-Panel Concurrent Knowledge Graph (target build)

> **Status:** target design, agreed in the 2026-06-22 design session. Supersedes the linear
> 9-step model documented in `dspec.md` (which remains the *as-built* reference until this lands).
> Built against the agentic-harness framework in `agentic_harness.md`.

---

## 1. The shift

From a **9-step linear pipeline** (Next/Back through a script) → **3 panels running concurrently**,
like a live ops console. Documents stream in, get resolved against the graph, and new knowledge
crystallizes — visibly, at the same time. **The data flowing *between* panels is a first-class
visual**, not incidental.

### Why this is the right frame: the panels *are* the Control Panel
The harness's headline component — the **Control Panel** — "tracks which agents are active, what
they are processing, and where handoffs between agents are occurring… full observability, auditable,
not a black box." The 3-panel concurrent view renders exactly that. The old linear walk hid the
orchestration; this makes it the whole point.

---

## 2. Narrative (the credibility fix)

3 incidents, **all at JRG-CCGT-1** (one asset, recurring over time — not a cross-fleet pattern).
Critically: **not all three were misdiagnoses** (3-for-3 wrong is implausible to this audience).

- **2 incidents resolved cleanly → reaffirm** the existing graph. Everything their documents yield
  already exists in the KG. Payoff: the confirmed path lights **green** with **particles flowing
  along the edges** — "the graph already knew this."
- **1 incident is the exception** → its documents yield an entity/relationship the graph **can't
  explain** (the casing/weld-crack finding). That gap is what flows through to new knowledge.

The thesis: the graph is *mostly confirmed, occasionally extended*. It grows **smarter, not bigger**.

---

## 3. The three panels

### Panel 1 — Documents (Extraction) · harness: **Specs / Instructions**
- **Agents are pure extraction** — pull **entities + relationships** out of the documents and
  nothing more (extract, never commit). This tight remit *is* the Spec discipline.
- **Approved sources only** (the harness's Ingestion remit): workflow trace, notes/comments,
  service report, work order — per incident. One incident's workflow trace contains a **call**,
  parsed by a dedicated **Call Agent** (the "transcribed escalation calls" source).
- **Loading theater kept:** queued → parsing → extracting → done, per agent (per `useDocTimeline`).
- **On completion:** each finished document **emits a packet** downstream into Panel 2.

### Panel 2 — Synthesis / Resolution (Match vs. Gap) · harness: **Context Hub** (+ "compare, not commit")
- **Input:** extracted entities + relationships from Panel 1.
- **Job:** resolve each against the **knowledge graph** (the Context Hub — the system's memory of
  what's already known) → **match** (exists) or **gap** (missing).
- **Live, dynamic matching is the spectacle:** candidate pulses → a lookup ray/particles fly to the
  matching graph node → **green lock** on match; or search → finds nothing → amber **gap**.
  *The more visually impressive, the better.*
- **Match path** (2 reaffirm incidents): green path + particles along the edges. No change to graph.
- **Gap path** (1 exception): the unresolved candidate routes to Panel 3.
- **Scope now:** only the **gap path** produces an outcome. (The reaffirm visual still plays.)

### Panel 3 — Generated New Knowledge (Quality Gate → Sign-off) · harness: **Quality Gates + The Constitution**
1. **Gap/candidate arrives** from Panel 2 as a node/card.
2. **Compliance check (the Constitution made tangible):** a row of **SOP / safety document blocks**
   sits in the panel. **Particles travel from the candidate node → into the SOP/safety blocks** —
   the critique agent checking the candidate against the rulebook. Blocks light **green** → passes.
   - This rhymes with Panel 2's visual grammar: *check the candidate against a reference corpus* —
     the **graph** in P2, the **rulebook** in P3.
3. **Escalate to admin:** a single **visual** human-sign-off beat (not a multi-step dossier; no
   batches, no checklist for now — revisit later).
4. **On approval:** the new node + its confirming test + edges **commit into the graph**.

#### SOP / safety blocks (named, for credibility)
| Block | Represents | Confidence |
|---|---|---|
| `SOP-BFP-VIBR-001` | BFP vibration diagnostic SOP — does the new test/cause fit the procedure? | ✅ own internal id (already in `incidents.ts`) |
| `ISO 10816-7` | Mechanical vibration — industrial pumps (Zone C basis for SYM-001) | ✅ real, already in build |
| `ASME PCC-2` | Repair of Pressure Equipment & Piping — governs the casing weld repair | 🟡 real + apt; confirm Sembcorp citation |
| `HSE Hot-Work Permit` *(or ISO 45001)* | Safety gate for the weld repair (hot work) | 🟡 real concept; pick the Sembcorp-correct label |

> Fabrication guard: the two 🟡 rows are sanity-check items — real and well-chosen, but not verified
> against Sembcorp's actual citations. Do not invent fake standard numbers to fill gaps.

---

## 4. What gets generated (the new knowledge)

From the 1 exception only:
- **Add RootCause** `RC-CASING-CRACK` (pump casing / weld-toe crack).
- **Add DiagnosticTest** `DT-WELD-NDT` (weld NDT / dye-penetrant) + its `CONFIRMS` edge.
- **Wiring edges** to connect it into the SYM-001 cluster.

**Dropped from the old build:** the DT-PHASE→bent-shaft **re-weight** (you can't down-weight an edge
off a single incident — it was justified by the old 3/3-contradiction story, which is gone). The
**shortcut/runout-promotion** is also out of the core path for now. Result: a cleaner, defensible
"one new cause + its test" payoff.

---

## 5. Harness mapping (one-to-one)

| Harness component | In this design |
|---|---|
| **Specs / Instructions** | Panel 1 — extraction agents' tight remit (approved sources; extract, never commit). |
| **Context Hub** | The knowledge graph itself — system memory; Panel 2 resolves against it; reaffirms prove it remembers. |
| **Quality Gates** | Panel 3 step 2 — stress-test the candidate before any human sees it. |
| **The Constitution** | Panel 3's SOP/safety blocks — the rulebook critique agents check against. |
| **Control Panel** | The whole 3-panel shell + inter-panel packet flow + escalation routing. |

---

## 5b. Graph rendering engine (decided 2026-06-22) — **2D force-clustered**

The KG (Context Hub) is the hero, so its look is a first-class requirement, not polish. Engine
decision: **2D force-directed clustering** via `d3-force` (stays in the React/Vite/SVG-or-Canvas
stack; no WebGL).

- **Layout by physics, not by hand:** charge (repulsion) + link (edges pull) + a **cluster force**
  grouping same-family nodes into organic blobs that settle on their own. Replaces today's rigid
  radial ring + hand-placed columns.
- **Clusters group by family** — e.g. asset-class / symptom-group / test-tier — so the graph reads
  as distinct, labelled clumps rather than one circle. (Needs a `cluster`/`group` field per node.)
- **Depth + wow:** node size + blur/opacity by depth, soft glow on focus nodes, and **particles
  flowing along edges** (these double as the inter-panel data-flow visual).
- **Why this engine for *this* build:** everything stays in one 2D coordinate space, so Panel 2's
  match-particles and Panel 3's node-growth land in the same scene cleanly. (Full 3D was the
  max-wow alternative but harder to choreograph cross-panel; rejected for now.)
- **Dependency added:** `d3-force` (+ `@types/d3-force`).

## 6. Inter-panel data flow (the spine)

```
[P1 Documents] --packet(extracted entities/rels)--> [P2 Resolution] --particles--> [KG / Context Hub]
                                                          |  match -> green path + edge particles
                                                          |  gap   -> candidate --> [P3 New Knowledge]
[P3] candidate --particles--> [SOP/safety blocks] --green--> admin sign-off --> commit node into [KG]
```

---

## 7. Open / deferred decisions

- **What drives time?** Concurrent panels need a clock. Proposed default: a single **"Run the
  week"** trigger that kicks off the concurrent animation + a **Restart** — Next/Back retired.
  *(Flagged — confirm before wiring.)*
- **Where the KG physically lives** across the columns (it's both P2's reference corpus and P3's
  growth target). Proposed: the KG is the hero in/behind Panel 3; P2's match particles reach into
  it cross-panel. *(Flagged — confirm before layout.)*
- **Conflict Detection reframe** (harness "flag, not resolve"): frame the exception as a *flagged
  conflict routed to a human*, stronger than a passive "gap." Narrative-only, cheap. *(Deferred.)*
- **Context Hub across cycles** (show previously deferred/rejected knowledge). *(Deferred.)*
- **Control Panel resilience** (source-unavailable recovery, routing failures). *(Deferred.)*

---

## 8. Build phases

1. **Data layer** — rework `incidents.ts` (3× JRG-CCGT-1, richer doc mix incl. the call, 2 reaffirm
   + 1 exception); trim the changeset to the single casing-crack node + weld-NDT (drop re-weight /
   shortcut); add the SOP/safety blocks dataset. *(Unblocked — start here.)*
2. **Shell** — new concurrent 3-column layout + the Run/Restart clock (replaces the step machine).
3. **Panel 1** — Documents/extraction with theater + outbound packets.
4. **Panel 2** — live match/gap resolution against the KG + green reaffirm + particles.
5. **Panel 3** — candidate → SOP/safety particle check → admin sign-off → commit to graph.
6. **Inter-panel flow** — the packet/particle choreography end-to-end.
7. **Polish** — timing, legibility, the green reaffirm spectacle.
