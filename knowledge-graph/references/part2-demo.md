# Demo Spec — Part 2: The Knowledge Graph, Behind the Scenes

## Purpose

Part 1 shows how a user interacts with the interface. Part 2 reveals what happens *underneath* — the knowledge graph being queried, built, corrected, and reused across a single repair incident. The thesis the demo makes visible: **the graph is a living record that learns from wrong turns, not just right answers.**

## Agents in this demo

- **Data agent** — the sole gateway to the knowledge graph. It *finds*: queries the graph, lights up relevant nodes/connections, creates and updates nodes, and retrieves data for other agents.
- **Evaluator agent** — the judge. It receives what the data agent finds and turns it into ranked diagnoses, technician selection, and work orders.
- **Documentation agent** — captures conversations and turns them into structured information the data agent can use to query the graph.

Division of labour to hold throughout: **data agent finds, evaluator judges.**

> **Deliberately out of scope for this demo (future additions):** the Safety Expert agent (would clear diagnoses before they reach the technician) and a Scheduler agent (would handle availability/timeline conflicts). Both are noted where they would slot in, but excluded to keep the demo focused on the graph.

---

## The Ten Steps

### Step 1 — Initial diagnosis: the graph is consulted
**Agent:** Data agent → Evaluator agent
**Interacts with:** Knowledge graph (read)
**What happens:** During initial diagnosis, the data agent searches the graph for past incidents matching the current symptom. Relevant nodes and connections light up. The data agent passes these past incidents to the evaluator agent, which produces a ranked set of diagnosis suggestions.
**On screen:** The graph view animates — matching nodes and their connections illuminate while the rest stays dim. The user sees suggestions appear, each traceable back to the lit-up incidents.

### Step 2 — A diagnosis is selected: first node created
**Agent:** Data agent
**Interacts with:** Knowledge graph (write)
**What happens:** The user selects one of the suggested diagnoses. The data agent creates a new node for this initial diagnosis, linked to the symptom.
**On screen:** A new node appears in the graph and connects to the symptom node — the incident is now being recorded live.

### Step 3 — Work order generated, technician selected
**Agent:** Evaluator agent (using data agent retrieval)
**Interacts with:** Knowledge graph (read, for technician info)
**What happens:** A work order is generated. The data agent surfaces technicians whose certifications match the job; the evaluator selects an appropriate technician based solely on that information.
**On screen:** The work order is created; candidate technicians are highlighted, and one is selected.
*(Future: a Scheduler agent would also check availability and timeline impact. Out of scope here — selection relies on data-agent information only.)*

### Step 4 — The diagnosis turns out to be wrong
**Agent:** Documentation agent → Data agent
**Interacts with:** The conversation (capture); passes structured info to the data agent
**What happens:** During the fix, the technician realises the initial diagnosis is incorrect and raises it to a superior. The documentation agent records that conversation and, per spec, converts it into the information the data agent needs to re-query the graph.
**On screen:** A cutaway to the conversation being captured, then structured details forming and being handed to the data agent.

### Step 5 — The graph is queried again, with new information
**Agent:** Data agent
**Interacts with:** Knowledge graph (read)
**What happens:** Armed with the new information, the data agent queries the graph again. A *different* set of nodes lights up this time.
**On screen:** The earlier highlights fade; a new constellation of nodes and connections illuminates — visibly different from Step 1.

### Step 6 — A new, corrected diagnosis
**Agent:** Evaluator agent
**Interacts with:** Data from the data agent
**What happens:** The evaluator receives the new information, arrives at a different diagnosis, and generates a new work order.
**On screen:** A corrected diagnosis appears, and a new work order is generated.
*(Future: the Safety Expert agent would clear this corrected diagnosis before it reached the technician.)*

### Step 7 — The wrong path is kept, not deleted
**Agent:** Data agent
**Interacts with:** Knowledge graph (write — relabel + link)
**What happens:** The incorrect initial diagnosis node is **not deleted**. It is tagged as *incorrect* and linked to the corrected diagnosis with a **corrected-by** connection. This preserves it as a future learning point.
**On screen:** In real time, the initial diagnosis node is relabelled to "incorrect" (e.g. colour/state change) and a labelled *corrected-by* edge draws from it to the corrected node. This is the demo's signature moment — the graph visibly learning from a mistake.

### Step 8 — The fix succeeds: the graph is completed
**Agent:** Data agent
**Interacts with:** Knowledge graph (write)
**What happens:** This time the work is completed well and the diagnosis is correct. The data agent updates the graph in three moves:
1. **Confirms** the corrected-diagnosis node (state changes from proposed to confirmed)
2. **Attaches an outcome/remedy node** capturing what actually fixed it, time taken, and success — kept separate from the diagnosis so remedy and diagnosis stay independently reusable
3. **Strengthens the path** — the corrected-diagnosis → remedy → success chain becomes a complete, validated route
**On screen:** The corrected node changes state to confirmed; a new outcome node appears and links in; the full validated path brightens/solidifies, signalling trustworthy knowledge.

### Step 9 — AI-drafted service report from the graph
**Agent:** Data agent
**Interacts with:** Knowledge graph (read)
**What happens:** When the service report is drafted, the data agent queries the nodes created during this incident and produces an AI draft from the structured data. Because it has the full arc — what was first suspected, why it was wrong, what actually worked — the draft is far richer than today's vague reports.
**On screen:** The service report populates, with each section visibly sourced from the incident's nodes.

### Step 10 — Step back and see what was built
**Agent:** —
**Interacts with:** —
**What happens:** The view zooms out to the full incident cluster, revealing the complete shape of what was captured.
**On screen — the end-state cluster:**
- Symptom node
- Initial diagnosis — tagged **incorrect**, with a *corrected-by* link
- Corrected diagnosis — tagged **confirmed**
- Outcome / remedy node — **success**
- All connections, including the preserved learning link from the wrong path to the right one

The payoff: one incident captured as a connected story — including the dead-end that was kept, not erased. The visible wrong-node-linked-to-right-node *is* the thesis of the demo.

---

## What This Demonstrates

- The graph is **consulted** before work begins (Step 1) and **built** as work happens (Steps 2, 7, 8).
- Wrong turns are **preserved and labelled** (Step 7), not deleted — the graph learns from mistakes.
- Diagnosis and remedy/outcome are **separate nodes**, so each can be reused independently.
- The service report is **generated from structured incident data** (Step 9), richer than today's reports.
- Two agents stay cleanly separated throughout: **the data agent finds, the evaluator judges.**

## Noted Omissions (future)

- **Safety Expert agent** — would clear diagnoses/recommendations before they reach the technician (slots into Step 6).
- **Scheduler agent** — would handle technician availability and timeline conflicts (slots into Step 3).