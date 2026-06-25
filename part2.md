Under the Hood 
There are various agents that power the guided workflow you saw Wei Jie go through — different from Faye's, but rather than walk you through another agentic workflow, I want to show you something more fundamental. 
Through our conversations with your teams, one of the most consistent challenges we heard was this: the quality of any diagnosis, RCA, or decision is only as good as the knowledge behind it.  
Your digital team has already started building a Knowledge Graph. This is similar to what we did with Foxconn — building it from scratch, mapping every node and connection through human interviews. That works, but it's slow, resource-intensive, and hard to scale. 
With AI, we can have agents scrape and populate nodes from existing data and documents to accelerate the build. But the deeper question is: how do you continuously grow and refresh institutional knowledge as your plants, equipment, and people evolve over time? How do you make sure that what the system knows today reflects what your best engineers know tomorrow? 
This is where the Agentic Knowledge Harness comes in. 
 
The Knowledge Graph 
The Knowledge Graph you see here maps five knowledge layers. It is a lot more comprehensive but for the purposes of this demo, let’s focus on these layers most relevant to the workflow you’ve just witnessed: 
Org Structure — who owns what, roles, expertise 
SOPs — standard procedures and work instructions 
Plant & Equipment — asset hierarchy, specifications, relationships 
Historical Intelligence — past work orders, incidents, failure patterns 
Predictive Intelligence — where all AI/ML models and their outputs reside 
These five layers are what power the diagnoses, recommendations, and guided workflows you saw Faye and Wei Jie experience. 
 
How New Knowledge Gets Captured and Fed Back 
As you saw throughout the workflow, there were multiple high-value moments of knowledge capture: 
Faye's override — she disagreed with the top-ranked diagnosis and chose bearings. Her rationale is logged, creating a signal that human expertise sometimes diverges from model confidence, and why. 
Wei Jie's escalation — his instinct that something more serious was at play, despite the initial diagnosis, is captured as a decision point tied to observable conditions on the ground. 
The Dr Ismail conversation — the collaborative troubleshooting, the revised failure mode, and the final finding that it was a water pump crack, not a bearings failure, is transcribed, structured, and stored. This feeds directly into future RCA templates and diagnostic models. 
All of this is stored in the Context Hub — the system's persistent memory. 
 
The Weekly Knowledge Synthesis Loop 
At the end of each week, a suite of agents runs automatically to process everything that was captured. Here's how we'd group them: 
Ingestion Agents — pull and structure raw captures: transcripts, override logs, sensor anomalies, service reports 
Synthesis Agents — compare new information against existing knowledge, identify patterns, surface potential updates 
Conflict Detection Agents — flag where new findings contradict or refine what the system currently believes to be true 
Validation Staging Agents — package flagged items into a human-readable review panel, with rationale and source citations for each recommendation 
Nothing gets committed to the Knowledge Graph automatically. A human — your subject matter expert or operations lead — reviews the panel, sees exactly why each update is being proposed and what evidence supports it, and makes the final call on what gets accepted, deferred, or rejected. 
This keeps the system honest, and keeps your experts in control of what the organisation officially knows. 
 
What Makes This Possible: The Agentic Harness 
All of this runs on top of a structured backend framework — what we call the Agentic Harness. It has five components: 
Specs or Instructions 
Every agent that touches the Knowledge Graph has a clearly defined remit. The Ingestion Agent knows it is only allowed to pull from approved sources — work orders, service reports, sensor logs, transcribed escalation calls. The Synthesis Agent knows its job is to compare, not to commit. The Conflict Detection Agent knows to flag, not to resolve. These boundaries matter because without them, agents overreach — writing to the KG prematurely, resolving conflicts they aren't qualified to judge, or pulling from sources that haven't been validated. Specs are what keep each agent doing exactly its job, and nothing more. 
 
Context Hub 
The KG cannot grow if agents can't remember what happened. The Context Hub is the shared memory that persists across every workflow interaction — Faye's override rationale, Wei Jie's escalation trigger, the full Dr Ismail transcript, the final service report. When the weekly synthesis agents run, they don't start from scratch. They have access to the full log of what was captured, what was previously accepted into the KG, and what was deferred or rejected by human reviewers in prior cycles. This accumulated context is what allows the system to get smarter over time, rather than repeat the same gaps. 
 
Quality Gates (critique, guardrails etc) 
Not everything captured during a workflow is good knowledge. A misdiagnosis that was later corrected, a contractor's incomplete service report, a transcription error — these are real risks if they get written into the KG unchecked. Before anything reaches the human review panel, adversarial agents stress-test proposed updates: does this new node contradict an existing one without sufficient evidence? Is this proposed connection between a failure mode and a root cause supported by more than one incident? Does this update meet Sembcorp's own documentation standards? Only what passes these checks gets escalated for human validation. This is what prevents the KG from becoming a repository of noise. 
 
 
The Constitution (critique agents check against constitution)  
As the KG scales across Sembcorp's global portfolio — gas plants in Singapore, wind farms in India or solar assets in the India or China aa— you need a consistent set of rules that governs how agents behave regardless of where they are operating. What counts as a valid failure mode for a gas turbine is different from a wind turbine. Regulatory requirements in one jurisdiction may conflict with another. The Constitution is what ensures agents don't conflate knowledge across asset types, don't apply the wrong SOP to the wrong plant, and don't bypass local compliance requirements in favour of a global default. It is the layer that allows the KG to scale broadly without losing the specificity that makes it trustworthy. 
Control Panel 
On any given week, dozens of agents are running in parallel — ingesting, synthesising, flagging, staging for review. The Control Panel is what keeps this orchestrated rather than chaotic. It tracks which agents are active, what they are processing, and where handoffs between agents are occurring. If a Synthesis Agent surfaces a conflict it cannot resolve, the Control Panel routes it to the right human. If an Ingestion Agent fails because a data source is unavailable, it triggers a recovery workflow rather than silently dropping that capture. And critically — it gives your team full observability into how the KG is being built and maintained, so the system remains auditable, not a black box. 
Together, these aren't just engineering guardrails. They are what allow you to trust the system — and to scale it — without losing oversight or control. 
 