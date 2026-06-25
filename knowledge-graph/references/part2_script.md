# Part 2 Script — "Behind the Scenes: How Hyperspace OS Learns"

> Presenter script for the BCG × Sembcorp ITP demo (2026-05-27). Part 2 is the **peel-back** of
> Part 1: the same `JRG-CCGT-1 · BFP-3A` incident, told from the knowledge side. Where Part 1
> showed *people doing the work* (Faye → Wei Jie → Dr. Ismail), Part 2 shows *the system learning
> from that work*. Thesis: **the quality of any diagnosis is only as good as the knowledge behind
> it — so the real product is the engine that keeps that knowledge growing, correct, and trusted.**
>
> Format per beat: **ON SCREEN** (what's displayed / what the presenter does in the live app) and
> **SCRIPT** (spoken narration). The live app (`knowledge-graph/`, `Demo.tsx`) interactively covers
> Beat 4 (the synthesis loop); Beats 1–3 and 5 are presenter narration framed around the graph.
> Open questions + factual flags are at the end — read those before finalising.

---

## Grounding — what Part 1 established (so the peel-back lands)

The single incident the whole demo turns on:

- **Asset:** `JRG-CCGT-1 · Block 2 · BFP-3A` (boiler feed pump). Vibration RMS on the NDE bearing
  housing breaches ISO 10816-7 Zone C. Severity AMBER. `INC-2026-0537`.
- **Faye Sit (Ops Control Tower)** — the AI's top-ranked diagnosis was **Shaft misalignment · 85%**.
  Faye **overrode** it and selected the alternate, **NDE bearing race spalling · 78%**, on specific
  bearing + temperature conditions. *Her rationale was logged.*
- **Lim Wei Jie (Onsite)** — worked the BFP vibration SOP (`SOP-BFP-VIBR-001`): safety checks, then
  root-cause isolation. Mid-inspection the **NDE bearing housing temperature spiked to 94 °C** —
  he judged something more serious was in play and **escalated to the offsite expert.**
- **Dr. A. Ismail (Offsite Expert)** — on the call, recognised it as a **pump casing fatigue crack**
  (~60 mm hairline at the 4-o'clock volute, near the discharge weld) — **not** a bearing failure.
  Same failure mode he'd seen on **Jurong-CCGT-2 BFP in 2023.** The bearing heat and vibration were
  *secondary.* Recommendation: shut down BFP-3A, isolate Block 2 feedwater.

Three of those moments are **knowledge** the organisation just generated. Part 2 is about what
happens to them.

---

## Beat 0 — Transition from Part 1

**ON SCREEN:** From Part 1's closing screen, open Part 2 ("Behind the scenes"). The graph (Context
Hub) sits on the right; the three process panels (Documents · Resolution · New Knowledge) are idle
on the left; "▶ Run the week" is not yet pressed.

**SCRIPT:**
> "What you just watched was how AI could enhance and assist the workflow and different opportunities for tacit knowledge capture."
> "Next, I want to show you something more fundamental."

---

## Beat 1 — Under the Hood: why knowledge, not another workflow

**ON SCREEN:** Hold on the full graph. Let it breathe — this is the "system's brain" reveal.

**SCRIPT:**
> "Through our conversations with your teams, one challenge came up again and again: the quality of
> any diagnosis, any RCA, any decision is only as good as the knowledge behind it.
>
> Your digital team has already started building a Knowledge Graph. 
>
> But the deeper question is this: how do you *continuously* grow and refresh
> institutional knowledge as your plants, your equipment, and your people change over time? How do
> you make sure what the system knows today reflects what your best engineers know tomorrow?
>

---

## Beat 2 — The Knowledge Graph: how the plant's diagnostic knowledge is structured

**ON SCREEN:** Gesture across the graph — the equipment clusters (boiler feed pumps, compressors,
generators, air inlets, combustors). Then settle on / zoom into the **boiler feed pump** cluster (the
incident asset), where the symptom → test → root-cause tree is laid out.

**SCRIPT:**
> "This is the knowledge graph — the plant's diagnostic memory for its equipment. Each
> cluster you see is an asset class: boiler feed pumps, compressors, generators, and so on.
>
> For each asset class the graph holds four things, and the links between them: the **symptoms** that
> show up in the field, the **tests** an engineer runs to investigate each symptom, and the **root causes** 
> those tests confirm or rule out — with a **confidence weight** on every test-to-cause link. 
> Finally, **machine history** allows us to generate a more tailored diagnosis based on the conditions of 
> each individual machine
>
> This is exactly the knowledge that powered Part 1 — the ranked diagnoses Faye weighed and the guided
> tests Wei Jie worked through. When the graph is right, those recommendations are sharp. When it has a
> gap, they're not — and this week's incident is about to expose one."

---

## Beat 3 — How new knowledge gets captured

**ON SCREEN:** Recall the Part 1 moments — narrate over the graph, or highlight the relevant nodes
(BFP-3A, the override, the escalation, the call). When you press "Run the week" next, these surface
as documents.

**SCRIPT:**
> "Across that one incident, there were several high-value moments of knowledge capture:
>
> - **Faye's override** — she disagreed with the top-ranked diagnosis and chose bearing race spalling.
>   Her rationale is logged — a signal that human expertise sometimes diverges from model confidence,
>   and *why.*
>
> - **Wei Jie's escalation** — The bearing housing temperature spiking to 94 °C. This unexpected behaviour marked
>   that something was wrong and that the original diagnosis was not correct. AI escalated this to an expert, creating
>   an opportunity to document new tacit knowlege.
>
> - **The Dr. Ismail conversation** — the collaborative troubleshooting, the revised failure mode, and
>   the final finding that this was a **pump casing crack, not a bearing failure** — is transcribed,
>   structured, and stored. That feeds directly into future RCA templates and diagnostic models.
>
> All of this surfaces in conversations, documents and selections made by both the Operations and Engineering teams"

---

## Beat 4 — The Weekly Knowledge Synthesis Loop  *(the interactive demo)*

**ON SCREEN:** Press **"▶ Run the week."** The three panels run as a sequential accordion; the graph
reacts on the right. Walk it panel by panel.

**SCRIPT (lead-in):**
> "Capture is continuous. Synthesis runs on a cadence. At the end of each week, a suite of agents runs
> automatically to process everything that was captured. Let me run a week."

### 4a — Ingestion  ·  *Documents panel*
**ON SCREEN:** A week of closed BFP incidents at JRG-CCGT-1 streams in as **documents** — service
reports, workflow traces, call transcripts, the override log. Each parses and an agent extracts a
short finding. Four incidents quietly reaffirm what the graph already knows; **INC-0537 (BFP-3A)**
leads as the exception.

**SCRIPT:**
> "**Ingestion agents** pull and structure all kinds of raw captures — initial diagnosis, work orders, 
> workflows completed, deviations and more. These agents consume unstructured data and conduct
> entity and relationship matching, extracting out key moments from these reports.


### 4b — Synthesis + Conflict Detection  ·  *Resolution panel*
**ON SCREEN:** Agents compare the week's findings against the existing graph, find the common
signature, and flag the one that doesn't fit: **INC-0537** — the graph's path pointed at the wrong
cause, and the real cause (a casing crack) was found *off-path.*

**SCRIPT:**
> "**Synthesis agents** compare the new information against what the graph already believes and look
> for patterns. They flag where the new findings contradict or refine the
> current model. Here, four incidents reaffirm the graph. The incident we showed in part 1 doesn't fit: 
> Not only, was the initial diagnosis not selected by Faye in the Operations Control site, but as works were 
> carried out, we realised that the true cause was found outside of the graph.

### 4c — Validation Staging + Human Approval  ·  *New Knowledge panel*
**ON SCREEN:** The flagged items are packaged into a human-readable review panel, each with rationale
and source citations: **re-weight** the over-confident edge (the phase-test → shaft path), add a new
**diagnostic test** (dye-penetrant / weld NDT), add a new **root cause** (casing weld-toe crack). The
reviewer accepts each.

**SCRIPT:**
> "**Validation-staging agents** package the flagged items into a review panel — each proposed update
> with its rationale and the evidence behind it.
>
> And this is the important part: **nothing is committed to the Knowledge Graph automatically.** A
> human — your SME or operations lead — reviews the panel, sees exactly why each update is proposed
> and what supports it, and makes the final call: accept, defer, or reject. That keeps the system
> honest, and keeps your experts in control of what the organisation officially knows."

### 4d — The graph mutates  ·  *KG hero / Context Hub*
**ON SCREEN:** On approval, the graph updates **in place**: the edge re-weights, the new nodes commit
and pulse. The graph didn't balloon — it got *sharper.*

**SCRIPT:**
> "On approval, and only on approval, the graph changes. One edge re-weighted, two nodes added. It
> didn't get bigger — it got smarter. The next time BFP vibration looks like this, the system already
> knows to consider a casing crack."

---

## Beat 5 — What makes this possible: the Agentic Harness

**ON SCREEN:** Conceptual close. Narrate over the graph / Context Hub. *(These five components don't
each have a dedicated screen in the current app — see flag #3; decide what to visualise vs. narrate.)*

**SCRIPT:**
> "All of this runs on a structured backend framework — what we call the **Agentic Harness.** Five
> components:
>
> - **Specs / Instructions** — every agent has a clearly defined remit. The ingestion agent only pulls
>   from approved sources; the synthesis agent compares, it doesn't commit; the conflict-detection
>   agent flags, it doesn't resolve. Without those boundaries, agents overreach — writing to the graph
>   prematurely or judging conflicts they aren't qualified to judge. Specs keep each agent doing
>   exactly its job, and nothing more.
> - **Context Hub** — the shared memory that persists across every interaction: Faye's override
>   rationale, Wei Jie's escalation trigger, the full Ismail transcript, the final service report —
>   plus what was previously accepted, deferred, or rejected. The weekly agents never start from
>   scratch; that accumulated context is how the system gets smarter instead of repeating the same gaps.
> - **Quality Gates** — not everything captured is good knowledge: a misdiagnosis that was later
>   corrected, an incomplete contractor report, a transcription error. Before anything reaches the
>   human panel, adversarial agents stress-test it — does this contradict an existing node without
>   enough evidence? Is this failure-mode-to-cause link supported by more than one incident? Does it
>   meet Sembcorp's documentation standard? Only what passes gets escalated. This is what stops the
>   graph becoming a repository of noise.
> - **The Constitution** — as the graph scales across the global portfolio — gas in Singapore, wind and
>   solar in India and China — you need consistent rules governing how agents behave wherever they run.
>   A valid failure mode for a gas turbine isn't valid for a wind turbine; regulations differ by
>   jurisdiction. The Constitution stops agents conflating knowledge across asset types, applying the
>   wrong SOP to the wrong plant, or bypassing local compliance for a global default. It's what lets
>   the graph scale broadly without losing the specificity that makes it trustworthy.
> - **Control Panel** — on any week, dozens of agents run in parallel. The Control Panel keeps it
>   orchestrated, not chaotic: which agents are active, what they're processing, where handoffs happen.
>   If synthesis surfaces a conflict it can't resolve, it routes to the right human. If an ingestion
>   agent fails because a source is down, it triggers recovery instead of silently dropping the
>   capture. And it gives your team full observability — the system stays auditable, not a black box."

---

## Close — the line that lands

**SCRIPT:**
> "Together, these aren't just engineering guardrails. They're what let you *trust* the system — and
> *scale* it — without losing oversight or control. Hyperspace OS isn't a tool that answers a question
> once. It's an operating system that learns: every incident makes the next decision sharper, and what
> the system knows tomorrow keeps pace with what your best engineers know today."

---

## Open questions + factual flags  *(resolve before finalising)*

> **Direction applied:** Part 1's knowledge-graph visualisation is **disregarded** (not accurate). The
> script now **follows the Part 2 app** — Beat 2 describes the on-screen diagnostic-reasoning graph
> (asset class → symptom → test → root cause), not the old five-knowledge-layer model.

1. **Diagnosis-chain inconsistency in the Part 2 app itself (must fix for ITP).** `feed.ts` contradicts
   itself on what the AI recommended: the `dx` card says **"AI recommended Shaft misalignment · 85% →
   Faye selected NDE bearing race spalling · 78%,"** but the `w3` mother-card journey says **"Bent shaft
   (AI) → Bearing race spalling (Ops) → Casing crack (Actual)."** *Bent shaft ≠ shaft misalignment* —
   different failure modes; Joubert/Asherson will pattern-match. The script uses **Shaft misalignment**
   throughout. Pick one and make the feed consistent. **Confirm which is canonical.**
2. **Vocab.** Your notes say "water pump crack" — for the ITP this should be **"pump casing crack on the
   boiler feed pump (BFP-3A)."** Script uses the precise form.
3. **App coverage vs. narration.** The live app delivers **Beat 2** (the graph) and **Beat 4**
   interactively (Documents → Resolution → New Knowledge → graph mutates). **Beats 1, 3, and the five
   Harness components (Beat 5)** are presenter voiceover with no dedicated screens. Decide per beat:
   build a visual or keep as narration over the graph. (Candidate build: a Control-Panel / agent-roster
   view for Beat 5.)
4. **Agent naming alignment.** Your notes group agents as Ingestion / Synthesis / Conflict Detection /
   Validation Staging. The app's panels use parser-level names (Workflow Tracer, Report Parser, Call
   Agent, etc.). Decide whether to surface the four narrative agent *roles* in the UI so the script's
   language matches what's on screen.
