# Part 2 — KG "Behind the Scenes" · Build Plan

> Companion to `part2-demo.md` (the narrative spec). This is the implementation plan for the standalone Part 2 app.

## What this is

A **standalone** KG-centric app that replays the same `JRG-CCGT-1 · BFP-3A` incident as a 10-step story showing the knowledge graph being queried, built, corrected, and reused. Thesis (and signature visual): the graph **learns from wrong turns** — the wrong diagnosis node is kept (not deleted), relabelled "incorrect", and linked `corrected-by →` to the right one.

Narrative fit with Part 1: the initial diagnosis "NDE bearing race spalling · 78%" is wrong; the real cause is **bent shaft**. Part 2 makes that correction the centerpiece.

## Locked decisions

1. **Self-contained** — lives entirely in `knowledge-graph/`, served on its own port (`:8001`). Root `app.js` / `index.html` are not restructured.
2. **Entry — one-way link (deferred)** — a single "See behind the scenes ▸" link will be added to Part 1's terminal screen to open `http://localhost:8001/` in a new tab. This is the only root-demo edit, and it is deferred until this page is built + validated and the diff is explicitly approved.
3. **Scenario/vocab** — reuse the BFP-3A bent-shaft incident + Sembcorp vocab (vocab-safe for the ITP panel).
4. **Agents** — foreground exactly 3 spec agents: **Data** (finds/queries/creates nodes), **Evaluator** (judges → diagnoses, tech, work orders), **Documentation** (captures conversations). Mantra: *data finds, evaluator judges.*
5. **KG is the hero** — large/central; a left rail shows step narration + counter (X/10) + the 3 agent chips; a service-report panel reveals at step 9.
6. **Render tech** — a statically-positioned SVG incident cluster (~9 nodes, hand-authored x/y), written fresh. No force simulation, no vendor libs (pure SVG, offline-safe). Advance is presenter-controlled tap-through (Next/Back).

## Files

- `knowledge-graph/index.html` — standalone page; inline `<style>` (palette tokens from `CLAUDE.md` + layout + KG SVG styles + keyframes), `#p2-stage` markup, loads `part2.js`.
- `knowledge-graph/part2.js` — `STATE`, pure `render()`, `buildKGSvg()`, step engine, animators, agent-chip logic, `init()` on DOMContentLoaded.
- `app.js` (root, deferred + permission-gated) — one link at the `.demo-end-banner` block (~`:3829`).

## Layout

`#p2-stage` (full viewport, light theme `--bg-stage #F8FAFC`):
- `#p2-topbar` — "Behind the scenes · INC-2026-0537" + step counter X/10
- `#p2-grid` (`320px 1fr`; → `300px 1fr 360px` when report shows):
  - `#p2-rail` — `#p2-step-narration`, `#p2-agent-chips` (3 chips + "data finds / evaluator judges" subtext), `#p2-step-dots`
  - `#p2-kg-hero` — SVG cluster, fills the cell
  - `#p2-report` (hidden until step 9)
- `#p2-nav` — Back ◂ / Next ▸ / Restart (Restart hidden until step 10)

Palette reused from Part 1: green `#00A651`, navy text `#0F1B3D`, light panes `#F1F5F9`, card `#FFFFFF`, soft shadow `0 2px 8px rgba(15,27,61,0.06)`.

## State + render

```
STATE = { step: 0, maxStepReached: 0, built: false }
render()  // PURE: counter / narration / dots / chip-active / Next-Back enabled / report visibility. No timers.
init()    // build SVG once (all hidden), wire buttons, step=1, render(), runStepEffects(1)
```

## Incident-cluster data

`NODES` (~9): `symptom`, past-incident matches `pi-jrg` / `pi-skr` / `pi-banyan`, `dx-init` (wrong), `wo-1` + `tech-lim`, `dx-corr` (bent shaft), `wo-2`, `outcome`. Each `{id,label,layer,state,x,y,step}`.

`EDGES`: `[src,dst,kind,step]`, `kind ∈ {normal, corrected-by}` — the `dx-init → dx-corr` corrected-by edge appears at step 7.

Node `state` → fill: `history #94A3B8` · `proposed #F59E0B` · `selected #10B981` · `confirmed #2563EB` · `incorrect #DC2626` · `success #16A34A`.

## 10-step effects (reveal = `.revealed` on elements with `data-step <= step`)

1. symptom + 3 `pi-*` + edges; pulse `pi-*`. Chips: data → evaluator.
2. reveal `dx-init` (amber) + `symptom→dx-init` (draw-in). Chip: data.
3. reveal `wo-1` + `tech-lim` (emerald, pulse) + edges. Chip: evaluator.
4. no new node; flash `doc` chip; narration "conversation captured → structured info"; dim step-1 glow. Chips: doc → data.
5. fade `pi-jrg`/`pi-skr`; re-light `pi-banyan` (bent-shaft precedent). Chip: data.
6. reveal `dx-corr` (amber) + `wo-2` + edges (incl `pi-banyan→dx-corr`). Chip: evaluator.
7. ⭐ relabel `dx-init` → incorrect (red) + "(incorrect)"; draw dashed `corrected-by` edge to `dx-corr` w/ midpoint label. Wrong node kept. Chip: data.
8. `dx-corr` → confirmed (blue); reveal `outcome` (green) + edge; brighten full corrected path. Chip: data.
9. unhide `#p2-report` (3-col); each section cites a source node id. Chip: data.
10. outline-pulse the end-state cluster; disable Next; show Restart.

Keyframes: `p2-node-pulse`, `p2-edge-draw` (stroke-dashoffset), `p2-relabel-flash`.

## Wave split

- **W0** — this doc.
- **W1** — standalone scaffold on `:8001` (layout, dead Next/Back).
- **W2** — static KG hero render (full cluster visible) for layout/legibility validation.
- **W3** — step engine + reveal gating (instant, no flourish).
- **W4** — per-step animations + signature beat (step 7) + path solidify (step 8).
- **W5** — service report (step 9) + zoom-out (step 10) + restart.
- **W6** — root `app.js` link (deferred, explicit-permission gate).

## Run

```
# Part 1 (existing)
python -m http.server 8000
# Part 2 (this app)
cd knowledge-graph && python -m http.server 8001
```
