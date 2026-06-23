# KG 3D — v2 Polish Plan

Context-preservation doc so the next session can pick up the 3D knowledge-graph work without re-deriving anything. Written after the v1 3D port landed and was committed.

## What this is / how to run

- App: `knowledge-graph/` — a Vite + React + TS project (`kg-part2`), separate from the root vanilla tablet demo.
- Run: `cd knowledge-graph && npm run dev` → http://localhost:5173/
- Live root component: `src/Demo.tsx` (3-panel shell: Documents → Resolution → New Knowledge on the left; the knowledge graph on the right via `<KGForce3D />`).

## v1 — DONE (current state)

The right-pane graph was ported from 2D (d3-force + imperative SVG) to **real 3D** using `3d-force-graph` (v1.80) + `three` + `d3-force-3d`, all installed as npm deps and bundled by Vite (offline-safe, no CDN).

- New component: `src/components/KGForce3D.tsx`.
- **2D fallback preserved on disk:** `src/components/KGForce.tsx` is untouched. To revert, swap the import + tag in `src/Demo.tsx` (`KGForce3D` → `KGForce`). There's a comment there marking it.
- Ambient type shim for the untyped force lib: `src/d3-force-3d.d.ts` (`declare module 'd3-force-3d'`).
- CSS: `.kg3-host` / `.kg3-tip` in `src/demo.css`.

What v1 already does:
- Same fleet data as 2D (`FLEET_NODES`, `FLEET_EDGES`, `PROPOSED_NODES`, `PROPOSED_EDGES` from `src/data/backdrop.ts`).
- **Regions preserved in 3D** — each asset-class cluster is pulled to its own 3D anchor via `forceX/Y/Z` (see `ANCHORS` / `SPREAD` / `DEPTH` constants at the top of `KGForce3D.tsx`), mirroring the 2D `forceX/forceY` centres but lifted to distinct depths. Cross-region links have near-zero pull strength (0.01) so the blobs hold their shape.
- Orbit controls + slow idle auto-rotate (`Graph.controls().autoRotate`).
- **Nodes colored by LABEL**, uniformly faded to 55% (no focus/backdrop split), so they map to a legend. Color scheme = `NODE_COLORS` from `src/data/graph.ts`: AssetClass slate · Machine green · Symptom amber · DiagnosticTest blue · RootCause red · Inconclusive violet.
- **Connectors uniform** — one mid-slate style (`rgba(100,116,139,0.55)`, width 1.1) for every fleet edge (intra- and inter-region alike). Arrows only on the directed diagnostic tree (`isFocus`) + active paths.
- **Reaffirm-green** — matched nodes/links recolour to Sembcorp green `#00A651` + flowing particles, driven by `matchedNodes` from the store.
- **Per-node commit growth** — approving a New Knowledge card adds that node id to `committedNodes`; `rebuild()` regrows exactly the approved nodes/edges into the live sim (seeded at the BFP region), with an orphan-guard edge if the casing crack is approved without its test.

## State wiring (so v2 hooks into the right place)

Store: `src/demoStore.ts` (zustand). Relevant fields the graph reacts to:
- `matchedNodes: string[]` — set by ResolutionPanel; lights reaffirmed paths green.
- `reweight: boolean` / `reweightApplied: boolean` — the over-confident edge `DT-PHASE → RC-BENT-SHAFT` (0.88 → 0.70). **Currently NOT visualised in 3D.**
- `committedNodes: string[]` + `approveNode(id)` — per-card New Knowledge sign-off (Panel 3). Approving commits `RC-CASING-CRACK` and/or `DT-WELD-NDT`.
- `gap: boolean` — opens Panel 3.

`KGForce3D.tsx` reads `matchedNodes` and `committedNodes` via `useDemo` and re-triggers the relevant `3d-force-graph` accessors on change (see the two effects after the build effect).

## v2 — TODO (the polish, in rough priority order)

The 2D component `src/components/KGForce.tsx` already implements most of these in SVG — use it as the spec and port each to three.js / the `3d-force-graph` API.

### 1. Legend overlay (cheap, asked for repeatedly)
- 6 label swatches (AssetClass / Machine / Symptom / DiagnosticTest / RootCause / Inconclusive) using `NODE_COLORS`.
- Render as a small absolutely-positioned React element inside `.demo-right` (a sibling of `.kg3-host`), NOT inside the WebGL canvas. The 2D version had `.kgf-legend` in `KGForce.css` — copy the styling.

### 2. Committed new-knowledge nodes should POP
- Right now committed nodes are faded like everything else; they lean on the bold red edges + particles.
- Quick interim: in `nodeColor`, return full opacity (and maybe larger `nodeVal`) when `n._proposed` (the flag is already set on proposed nodes).
- Full version: marching-ants ring + floating label (see #3).

### 3. Marching-ants rings + labels on new nodes (the real emphasis)
- 2D ref: `newRingsRef` (a `<circle class="kgf-newring">` with animated stroke-dash) and `newLabelsRef` (`<text class="kgf-newlabel">`) in `KGForce.tsx`.
- 3D approach: use `Graph.nodeThreeObject((node) => ...)` to attach a `THREE.Group` containing the sphere + a ring (`THREE.RingGeometry` or a torus) + a text sprite (drei-style `SpriteText`, or a `CanvasTexture` sprite — `three-spritetext` is a common companion lib for `3d-force-graph`). Only build the custom object for `_proposed` nodes; return undefined otherwise to keep default spheres.
- Animate the ring (rotate / dash) in the render loop via `Graph.onEngineTick` or a `requestAnimationFrame` updating the sprite material.

### 4. Re-weight edge visual beat (0.88 → 0.70)
- 2D ref: `KGForce.tsx` toggles `kgf-reweight` on `RC-BENT-SHAFT` + a `kgf-reweight-label` on the `DT-PHASE → RC-BENT-SHAFT` edge, gated by `reweight && !reweightApplied` (proposed) vs `reweightApplied` (applied).
- 3D approach: add a `reweight`/`reweightApplied` selector in `KGForce3D.tsx`; in `linkColor`/`linkWidth` special-case the `DT-PHASE`→`RC-BENT-SHAFT` edge (amber/pending while proposed, thinned/desaturated once applied to show confidence dropped). Optionally a sprite label showing "0.88 → 0.70". Re-trigger accessors in an effect on `[reweight, reweightApplied]`.

### 5. Zoom-to-focus camera moves
- 2D ref: `centerTransform` + `COMMIT_Z/DX/DY`, `REST_TRANSFORM`, `FULL_TRANSFORM`, and the staged `zoomTimersRef` re-zoom passes in `KGForce.tsx`.
- 3D approach: `Graph.cameraPosition(lookAtCoords, nodeCoords, ms)` to fly the camera. On reaffirm start → frame the BFP region; on commit → fly to the new nodes (average their positions, re-run a few times as the sim cools, mirroring the 2D `doZoom` passes). Pause `autoRotate` during scripted moves.

### 6. Region name labels (the cluster captions)
- 2D ref: `kgf-clabel` text per cluster centre + `kgf-halo` soft washes.
- 3D approach: a text sprite at each `ANCHORS[cluster]` position (one per `CLUSTERS` entry), using the cluster label (`CLUSTER_LABEL`). Add via `scene().add(...)` once, or as fixed sprites. Halos are optional (could be large, low-opacity sprites).

### 7. Background / depth tuning
- Currently `BG = '#E9EFF6'` (light, matches the pane). Decide if a deeper backdrop reads better for 3D depth on the projector — try a subtle dark vignette or a slightly deeper slate and compare. Pure feel call; needs eyeballing on the actual screen.

## Gotchas / notes

- `node_modules` reads are blocked by the sandbox permission settings — rely on `npx tsc -b --noEmit` to validate `3d-force-graph` API calls against its types rather than reading the `.d.ts` directly.
- The lib passes `NodeObject` / `LinkObject` to accessors; our data is `GNode` / `GLink`. Cast inside accessors (`o as unknown as GNode`) — see existing helpers.
- `3d-force-graph` v1.80 uses the **class** constructor: `new ForceGraph3D(host, { controlType: 'orbit' })`.
- Bundle is ~1.57 MB (430 KB gzip) with three bundled — expected, offline-safe. Ignore the chunk-size warning for a throwaway demo (or code-split `KGForce3D` behind a dynamic import if it matters).
- After any change: `npx tsc -b --noEmit` then check the Vite HMR log for runtime errors before claiming it works (can't drive WebGL headless — visual checks are human).
