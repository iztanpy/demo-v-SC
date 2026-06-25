Here are some changes that we made for the short OG demo. Let me know if there are any other git changes as compared to main that I might not be aware of:
The intention is to implement some of these in a different branch.

Blue color for wei jie view
Roles in header bar (both faye and wj)
Faster loading (3 dots)
Faster loading (agentic workflows for faye)
Knowledge graph on transcript button
Updated call summary pop up
Demo starts w card pre loaded no notifications
Remove step 1 (attach)
Auto click for safety steps
Immediate redirect into wei jie screen after dispatch
Remove sensor readings and initial diagnosis from wei jie screen


Heres the advice from my project leader for updates to the other branch:
Agentic workflows don't need to be sped up for our version 
Keep the notifications for demo start and for weijie
Don't auto click for safety steps 
Don't auto redirect to weijie screen
Keep telemetry data and diagnosis for weijie


====================================================================
PORT SCOPE — resolved against the project leader's instructions
====================================================================

PORT THESE (6) — approved, no PL objection:
  1. Blue color for Wei Jie view
  2. Roles in header bar (both Faye and Wei Jie)
  5. Knowledge graph on transcript button ("Knowledge bytes captured")
  6. Updated call summary pop-up
  8. Remove step 1 (attach / telemetry inspect step)

DO NOT PORT (5) — ruled out by the project leader:
  3. Faster loading (3 dots / tablet reveal theater only)
  4.  Faster loading (agentic workflows for Faye)        — PL: "don't need to be sped up for our version"
  7.  Demo starts with card preloaded, no notifications  — PL: "keep the notifications for demo start and for weijie"
  9.  Auto-click for safety steps                        — PL: "don't auto click for safety steps"
  10. Immediate redirect into Wei Jie screen after dispatch — PL: "don't auto redirect to weijie screen"
  11. Remove sensor readings + initial diagnosis from Wei Jie screen — PL: "keep telemetry data and diagnosis for weijie"

OFF-LIST DELTAS on short-og-demo (NOT in the 11-item list, PL gave no ruling)
— decision still needed per item; default is DO NOT PORT unless ticked:
  [ ] Selectable diagnosis option cards + override-rationale gate on Faye's Initial Diagnosis
      (NOTE: alternate-diagnosis rationale copy is newly authored — credibility check before ITP)
  [ ] "Turbine Diagnostic Agent" -> "Diagnostic Agent" global rename
  [ ] Faye workflow roster reshuffle / new agent names (Historical Incidents, Equipment History,
      Confidence Score, Schedule Integration, Schedule Optimizer)  — ITP-sensitive
  [ ] Instrument inspection group removed from Lim's checklist (13 -> 10 checks)
  [ ] SOP "Call" dialogue removed — call starts immediately
  [ ] Escalation report rebuild (W18): red shutdown banner + glowing 50 MW / ~SGD 2.4M chips,
      mirrored onto Lim's screen, real ticked counts
  [ ] Faye action-step heading "SOP Relevant next best actions" -> "SCHEDULE OPTIMIZATION AND DISPATCH"
  [ ] KG floating window auto-fit + center; legend moved to bottom
  [ ] Notification-banner race-condition fix
  [ ] Left-pane scroll-to-top on landing Lim's view

OPEN: target branch not yet named (porting into an existing branch).