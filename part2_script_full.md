# Part 2 — Spoken Script ("Behind the Scenes: How Hyperspace OS Learns")

> Continuous presenter narration only — no stage directions. Mirrors the SCRIPT blocks of
> `part2_script.md` (which carries the on-screen cues and the open flags). Light headers are
> signposts, not lines to read.

---

### Opening

What you just watched was how AI could enhance and assist the workflow — and the different opportunities for tacit knowledge capture along the way. Next, I want to show you something more fundamental.

### Under the hood

Through our conversations with your teams, one challenge came up again and again: the quality of any diagnosis, any RCA, any decision is only as good as the knowledge behind it.

Your digital team has already started building a Knowledge Graph. But the deeper question is this: how do you *continuously* grow and refresh institutional knowledge as your plants, your equipment, and your people change over time? How do you make sure what the system knows today reflects what your best engineers know tomorrow?

### The knowledge graph

This is the knowledge graph — the plant's diagnostic memory for its equipment. Each cluster you see is an asset class: boiler feed pumps, compressors, generators, and so on.

For each asset class the graph holds four things, and the links between them: the symptoms that show up in the field, the tests an engineer runs to investigate each symptom, and the root causes those tests confirm or rule out — with a confidence weight on every test-to-cause link. And finally, machine history, which lets us generate a more tailored diagnosis based on the condition of each individual machine.

This is exactly the knowledge that powered Part 1 — the ranked diagnoses Faye weighed and the guided tests Wei Jie worked through. When the graph is right, those recommendations are sharp. When it has a gap, they're not — and this week's incident is about to expose one.

### How new knowledge gets captured

Across that one incident, there were several high-value moments of knowledge capture.

Faye's override — she disagreed with the top-ranked diagnosis and chose bearing race spalling. Her rationale is logged: a signal that human expertise sometimes diverges from model confidence, and why.

Wei Jie's escalation — the bearing housing temperature spiking to 94 degrees. That unexpected behaviour marked that something was wrong, and that the original diagnosis was not correct. The AI escalated it to an expert, creating an opportunity to document new tacit knowledge.

And the Dr. Ismail conversation — the collaborative troubleshooting, the revised failure mode, and the final finding that this was a pump casing crack, not a bearing failure — is transcribed, structured, and stored. That feeds directly into future RCA templates and diagnostic models.

All of this surfaces in the conversations, the documents, and the selections made by both the operations and engineering teams.

### The weekly knowledge synthesis loop

Capture is continuous. Synthesis runs on a cadence. At the end of each week, a suite of agents runs automatically to process everything that was captured. Let me run a week.

First, ingestion agents pull and structure all kinds of raw captures — initial diagnoses, work orders, workflows completed, deviations, and more. These agents consume unstructured data and do entity and relationship matching, extracting the key moments out of these reports.

Then synthesis agents compare the new information against what the graph already believes and look for patterns. They flag where the new findings contradict or refine the current model. Here, four incidents reaffirm the graph. The incident we showed in Part 1 doesn't fit: not only was the initial diagnosis not the one Faye selected at the Operations Control site, but as the works were carried out, we realised the true cause lay outside the graph.

Next, validation-staging agents package the flagged items into a review panel — each proposed update with its rationale and the evidence behind it. And this is the important part: nothing is committed to the Knowledge Graph automatically. A human — your subject-matter expert or operations lead — reviews the panel, sees exactly why each update is proposed and what supports it, and makes the final call: accept, defer, or reject. That keeps the system honest, and keeps your experts in control of what the organisation officially knows.

On approval, and only on approval, the graph changes. One edge re-weighted, two nodes added. It didn't get bigger — it got smarter. The next time BFP vibration looks like this, the system already knows to consider a casing crack.

### What makes this possible: the Agentic Harness

All of this runs on a structured backend framework — what we call the Agentic Harness. It has five components.

Specs, or instructions. Every agent has a clearly defined remit. The ingestion agent only pulls from approved sources; the synthesis agent compares, it doesn't commit; the conflict-detection agent flags, it doesn't resolve. Without those boundaries, agents overreach — writing to the graph prematurely, or judging conflicts they aren't qualified to judge. Specs keep each agent doing exactly its job, and nothing more.

The Context Hub. This is the shared memory that persists across every interaction: Faye's override rationale, Wei Jie's escalation trigger, the full Ismail transcript, the final service report — plus what was previously accepted, deferred, or rejected. The weekly agents never start from scratch; that accumulated context is how the system gets smarter over time, instead of repeating the same gaps.

Quality gates. Not everything captured is good knowledge — a misdiagnosis that was later corrected, an incomplete contractor report, a transcription error. Before anything reaches the human panel, adversarial agents stress-test it: does this contradict an existing node without enough evidence? Is this failure-mode-to-cause link supported by more than one incident? Does it meet Sembcorp's documentation standard? Only what passes gets escalated. This is what stops the graph becoming a repository of noise.

The Constitution. As the graph scales across your global portfolio — gas in Singapore, wind and solar in India and China — you need a consistent set of rules governing how agents behave wherever they operate. A valid failure mode for a gas turbine isn't valid for a wind turbine; regulations differ by jurisdiction. The Constitution stops agents conflating knowledge across asset types, applying the wrong SOP to the wrong plant, or bypassing local compliance in favour of a global default. It's what lets the graph scale broadly without losing the specificity that makes it trustworthy.

And the Control Panel. On any given week, dozens of agents run in parallel — ingesting, synthesising, flagging, staging for review. The Control Panel keeps that orchestrated rather than chaotic: which agents are active, what they're processing, where handoffs occur. If a synthesis agent surfaces a conflict it can't resolve, it routes it to the right human. If an ingestion agent fails because a data source is unavailable, it triggers a recovery workflow instead of silently dropping that capture. And it gives your team full observability into how the graph is being built and maintained — so the system stays auditable, not a black box.

### Close

Together, these aren't just engineering guardrails. They're what let you trust the system — and scale it — without losing oversight or control. Hyperspace OS isn't a tool that answers a question once. It's an operating system that learns: every incident makes the next decision sharper, and what the system knows tomorrow keeps pace with what your best engineers know today.
