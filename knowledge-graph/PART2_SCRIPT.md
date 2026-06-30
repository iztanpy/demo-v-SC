# Part 2 — Behind the Scenes (~2:00)

Presenter script for the Knowledge Graph demo ("Documents In, Knowledge Out"). Paced for ~2 minutes
(~300 spoken words). Stage directions in brackets. Panel titles in the UI: ① Multi-agent knowledge
extraction · ② Comparing against graph · ③ Updating knowledge graph.

---

**[0:00 · Setup — split view: three panels left, the 3D knowledge graph right]**

> "Part 1 showed the app our engineers use on the floor. This is what happens *behind* it — how
> Hyperspace OS turns a week of messy field work into knowledge it actually keeps. One asset class:
> boiler feed pumps at Jurong-CCGT-1. Let me run the week."

**[Click ▶ Run the week — camera pushes into the BFP neighborhood of the graph, the rest of the fleet fades back]**

**[0:15 · Panel 1 — Multi-agent knowledge extraction]**

> "Five incidents land — not as tidy records, but as the real exhaust of operations: workflow traces,
> service reports, field notes, a call transcript, pulled off OSIsoft PI. Each is parsed and its
> findings extracted automatically — the symptom, the tests run, the diagnosis selected. Four are
> routine. One — INC-0537 on BFP-3A — is our exception: AI recommended shaft misalignment, ops
> overrode to bearing spalling, and the actual cause was a casing crack."

**[0:40 · Panel 2 — Comparing against the graph]**

> "Now every incident is checked against the knowledge graph. Four of them reaffirm what we already
> know — vibration to bearing spalling, misalignment to re-alignment — and those paths light up green.
> The system isn't just storing cases; it's *confirming its own confidence* with each real one."
>
> "But the exception exposes two imperfections: an edge the graph has been too confident about, and a
> gap — a connection it's never seen."

**[1:10 · Panel 3 — Updating knowledge graph]**

> "And here's the discipline — nothing touches the graph without a human. Our reliability engineer
> reviews each proposed change."

**[Approve the re-weight card — purple "updated" edge appears on the graph]**

> "First, a re-weight. Bearing spalling has now appeared for the *tenth* time across the fleet — that
> recurrence crossed the threshold, so the system proposes raising its confidence, 0.75 to 0.90.
> Approve, and the edge updates — in purple — on the live graph."

**[Submit the new-connection card — dashed cyan edge appears]**

> "Second is genuinely new knowledge: a high bearing-temperature reading leading to a weld NDT — a link
> the graph never had. We don't commit it outright; we *submit it for review*. It enters as a dashed,
> provisional edge — under review — pending more fleet cases."

**[1:45 · Close]**

> "So in ninety seconds, a week of frontline work made the system measurably sharper: it reaffirmed
> what it knew, strengthened a recurring pattern, and proposed real new knowledge — all under human
> control. That's the loop. Every incident, the next diagnosis starts sharper."
>
> "This is what we mean by Hyperspace OS — **not a tool. An operating system that learns.**"

---

## Delivery notes
- ~300 words → lands near 2:00 with the click pauses. If running long, cut the second sentence of
  Panel 2 ("The system isn't just storing…").
- Open question: the script has you **approve** the re-weight (to show the purple updated edge). The
  CLAUDE.md canonical note says the re-weight gets *rejected* to demonstrate human judgment — if you'd
  rather reject it, swap that beat for: "the engineer holds the weight pending more cases — the human
  overrules the machine."
