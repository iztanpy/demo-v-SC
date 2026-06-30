import { useEffect, useRef, useState } from 'react'
import ForceGraph3D, { type NodeObject, type LinkObject } from '3d-force-graph'
import { forceX, forceY, forceZ, forceManyBody, forceCollide } from 'd3-force-3d'
import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import SpriteText from 'three-spritetext'
import {
  FLEET_NODES, FLEET_EDGES, PROPOSED_NODES, PROPOSED_EDGES, CLUSTERS,
} from '../data/backdrop'
import type { SimNodeData, SimEdgeData } from '../data/backdrop'
import { NODE_COLORS } from '../data/graph'
import { useDemo } from '../demoStore'

// ── 3D port of the fleet knowledge graph (3d-force-graph / WebGL) ──
// Same nodes/edges as the 2D map, the SAME clustered regions (each asset-class pulled to its own 3D
// anchor, mirroring the 2D forceX/forceY centres), orbit controls, and per-node commit growth from
// Panel 3. v2 added the re-weight edge state, region captions, and the marching-ants new-node
// rings/labels. (The reaffirm-green highlight on matched paths was removed — undesired effect.)

const BG = '#E9EFF6' // light, to sit inside the light-theme right pane
const HOVER_HL = 'rgba(13,148,136,1)' // default card-hover highlight (teal); Panel 3 overrides to orange

// v2 #5 — commit camera standoff (world units from the new node). The resting view sits ~1030 from
// the BFP region, so a larger standoff = gentler push-in. Bump down for a stronger zoom, up for subtler.
// Kept comfortably > node radius (~12) so the single settle-then-fly push-in never clips the sphere.
const COMMIT_STANDOFF = 380

// "Once it starts" — on Run, gently push the camera in toward the BFP region (the centre cluster,
// where the live incident lives) without going all the way to a single-node close-up. Larger than
// COMMIT_STANDOFF so it's a soft framing of the whole region, not a tight node zoom — but small
// enough that the push-in actually reads on the projector (800 was too gentle to notice).
const BFP_START_STANDOFF = 520

// rotate the whole graph 90° anticlockwise in the view plane (rotate-layout, keep-orbit): the scene
// spins about the view axis, the camera + orbit stay put. Flip the sign to go clockwise.
const SCENE_ROT = Math.PI / 2

// 3D cluster anchors — keep the familiar constellation (BFP centre, the rest ringing it) but lift each
// region to its own depth so orbiting reveals real 3D separation. 7 distinct positions = 7 asset-class
// regions (BFP + 6 around) with no modulo-overlap; SPAN widened so the denser fleet doesn't crowd.
const SPREAD: [number, number][] = [
  [0.5, 0.5],   // BFP centre
  [0.26, 0.26], [0.74, 0.26],   // GT, HRSG (upper corners)
  [0.26, 0.74], [0.74, 0.74],   // ST, GEN (lower corners)
  [0.5, 0.08],  [0.5, 0.92],    // TX (top), COND (bottom)
  [0.08, 0.5],  [0.92, 0.5],    // STMT (left), CT (right)
  [0.92, 0.10],                 // SWG (upper-right edge)
]
const SPAN = 1080
const DEPTH = [120, -110, 130, -130, 110, 220, -220, 180, -180, 240] // per-cluster z, alternating for depth
const ANCHORS: Record<string, { x: number; y: number; z: number }> = {}
CLUSTERS.forEach((c, i) => {
  const [fx, fy] = SPREAD[i % SPREAD.length]
  ANCHORS[c.key] = { x: (fx - 0.5) * SPAN, y: -(fy - 0.5) * SPAN, z: DEPTH[i % DEPTH.length] }
})
const anchorOf = (cluster: string) => ANCHORS[cluster] ?? { x: 0, y: 0, z: 0 }

type GNode = SimNodeData & { x?: number; y?: number; z?: number; _proposed?: boolean }
type GLink = { source: string | GNode; target: string | GNode; type: string; context: boolean; cross?: boolean; loose?: boolean; _proposed?: boolean }
const linkEnd = (e: string | GNode) => (typeof e === 'object' ? e.id : e)
const nodeName = (e: string | GNode) => (typeof e === 'object' ? e.title ?? e.id : e)

// human-readable relationship phrasing for the edge hover tooltip (maps every RelType)
const REL_LABEL: Record<string, string> = {
  OCCURS_IN: 'occurs in',
  INSTANCE_OF: 'is a unit of',
  TRIGGERS: 'triggers test',
  FOLLOW_UP: 'escalates to',
  CONFIRMS: 'confirms',
  RULES_OUT: 'rules out',
  INCONCLUSIVE: 'inconclusive → escalate',
  SIMILAR_TO: 'similar failure mode',
  SHORTCUT: 'shortcut to',
  INDICATES: 'indicates',
}
function linkLabel(o: LinkObject): string {
  const l = o as unknown as GLink
  const verb = REL_LABEL[l.type] ?? l.type
  return `<div class="kg3-tip"><b>${nodeName(l.source)}</b> ${verb} <b>${nodeName(l.target)}</b><span>${l.type}</span></div>`
}

const hexToRgba = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// 3d-force-graph renders each node sphere with radius = cbrt(val) * nodeRelSize (nodeRelSize=4).
// Mirror that so sprite offsets/ring sizes sit just outside the rendered sphere.
const NODE_REL_SIZE = 4
const renderedRadius = (val: number) => Math.cbrt(Math.max(1, val)) * NODE_REL_SIZE

// v2 #1/#3/#6 — text sprite helper (region captions + new-node labels), white-backed for legibility
function makeLabelSprite(text: string, height: number, color: string, withBg = false): SpriteText {
  const s = new SpriteText(text, height, color)
  s.fontWeight = '700'
  s.fontFace = 'ui-sans-serif, system-ui, sans-serif'
  if (withBg) { s.backgroundColor = 'rgba(255,255,255,0.86)'; s.padding = 2 }
  s.material.depthWrite = false
  s.material.depthTest = false // float above geometry so captions/labels never hide behind spheres
  s.renderOrder = 10
  return s
}

// v2 #3 — marching-ants ring: a camera-facing dashed circle (CanvasTexture) whose dash offset is
// advanced each frame so the dashes "crawl" — the classic selection-marquee emphasis on new nodes.
type MarchingRing = { id: string; sprite: THREE.Sprite; draw: (offset: number) => void }
function makeMarchingRing(id: string, worldRadius: number, color: string): MarchingRing {
  const PX = 128
  const canvas = document.createElement('canvas')
  canvas.width = PX; canvas.height = PX
  const ctx = canvas.getContext('2d')!
  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearFilter
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false })
  const sprite = new THREE.Sprite(mat)
  sprite.renderOrder = 9
  const d = worldRadius * 2
  sprite.scale.set(d, d, 1)
  const draw = (offset: number) => {
    ctx.clearRect(0, 0, PX, PX)
    ctx.strokeStyle = color
    ctx.lineWidth = 6
    ctx.setLineDash([11, 8])
    ctx.lineDashOffset = -offset
    ctx.beginPath()
    ctx.arc(PX / 2, PX / 2, PX / 2 - 7, 0, Math.PI * 2)
    ctx.stroke()
    tex.needsUpdate = true
  }
  draw(0)
  return { id, sprite, draw }
}

// the single NEW edge the "New connection" card adds — once approved it enters the graph as a
// PROVISIONAL (under-review) link, drawn as a THICK dashed line via Line2 (the fat-line addon, so it
// isn't capped at ~1px like THREE.Line). The supporting edges are left as ordinary grey arrows.
const NEW_EDGE_KEYS = new Set(['BFP-S0>RC-CASING-CRACK', 'BFP-S0>DT-WELD-NDT'])
// the other two edges into / out of weld NDT are PROPOSED (so they'd default to the solid-red proposed
// styling) but they aren't new knowledge — keep them as plain grey lines (no red, no particles).
const SUPPORT_EDGE_KEYS = new Set(['SYM-001>DT-WELD-NDT', 'DT-WELD-NDT>RC-CASING-CRACK'])

export function KGForce3D() {
  const hostRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<InstanceType<typeof ForceGraph3D> | null>(null)
  const committedRef = useRef<Set<string>>(new Set())
  const ringsRef = useRef<MarchingRing[]>([]) // live marching-ants rings (animated each frame)
  const zoomTimersRef = useRef<number[]>([])  // re-zoom passes as the new node settles (v2 #5)
  const flashNodesRef = useRef<Set<string>>(new Set()) // amber flash targets (~1s) on gap/re-weight beats
  const flashEdgesRef = useRef<Set<string>>(new Set())
  const flashTimerRef = useRef(0)
  const hoverNodesRef = useRef<Set<string>>(new Set()) // persistent highlight while a card is hovered
  const hoverEdgesRef = useRef<Set<string>>(new Set())
  const litNodesRef = useRef<Set<string>>(new Set())   // persistent highlight after a New-Knowledge confirm
  const litEdgesRef = useRef<Set<string>>(new Set())
  const litGreenEdgesRef = useRef<Set<string>>(new Set()) // cyan-lit new-connection edges
  const litFuchsiaEdgesRef = useRef<Set<string>>(new Set()) // fuchsia-lit re-weighted edges
  const hoverColorRef = useRef<string>(HOVER_HL)        // hover highlight colour (teal default / orange for NK)
  const reweightAppliedRef = useRef(false)              // re-weight stays lit on the graph once approved
  const connectionAppliedRef = useRef(false)            // symptom→root-cause connection (temp → casing crack) revealed
  const connectionTestAppliedRef = useRef(false)        // symptoms→test connection (temp + vib → weld NDT) revealed
  const firstNkZoomRef = useRef(false)                  // only the FIRST New-Knowledge approval moves the camera
  const idleSpinTimerRef = useRef(0) // resume idle auto-rotate ~3s after the user stops interacting
  const bfpFocusRef = useRef(false) // while zoomed into BFP (the Run), dim every non-BFP node/edge back
  const [focused, setFocused] = useState(false) // reactive mirror of bfpFocusRef → drives the on-screen title
  const dashMatsRef = useRef<LineMaterial[]>([]) // fat dashed-line materials; their resolution is kept in sync on resize

  // persistent node/link objects (reused across graphData() calls so positions + physics survive)
  const allNodesRef = useRef<GNode[]>([])
  const allLinksRef = useRef<GLink[]>([])
  const baseIdsRef = useRef<Set<string>>(new Set())

  const started = useDemo((s) => s.started)
  const committedNodes = useDemo((s) => s.committedNodes)
  const flashPulse = useDemo((s) => s.flashPulse)
  const hoverHighlight = useDemo((s) => s.hoverHighlight)
  const reweightApplied = useDemo((s) => s.reweightApplied)
  const connectionApplied = useDemo((s) => s.connectionApplied)
  const connectionTestApplied = useDemo((s) => s.connectionTestApplied)
  const litNodes = useDemo((s) => s.litNodes)
  const litEdges = useDemo((s) => s.litEdges)
  const litGreenEdges = useDemo((s) => s.litGreenEdges)
  const litFuchsiaEdges = useDemo((s) => s.litFuchsiaEdges)

  // ── build the graph once ──
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    // base (always-present) fleet + proposed nodes seeded at the BFP region so they "grow" from there
    const baseNodes: GNode[] = FLEET_NODES.map((n) => ({ ...n }))
    const bfp = anchorOf('BFP')
    const proposedNodes: GNode[] = PROPOSED_NODES.map((n: SimNodeData) => ({
      ...n, _proposed: true,
      x: bfp.x + (Math.random() - 0.5) * 60, y: bfp.y + (Math.random() - 0.5) * 60, z: bfp.z + (Math.random() - 0.5) * 60,
    }))
    allNodesRef.current = [...baseNodes, ...proposedNodes]
    baseIdsRef.current = new Set(baseNodes.map((n) => n.id))

    const baseLinks: GLink[] = FLEET_EDGES.map((e: SimEdgeData) => ({ ...e }))
    const proposedLinks: GLink[] = PROPOSED_EDGES
      .filter((e: SimEdgeData) => e.type !== 'SHORTCUT')
      .map((e: SimEdgeData) => ({ ...e, _proposed: true }))
    allLinksRef.current = [...baseLinks, ...proposedLinks]

    const Graph = new ForceGraph3D(host, { controlType: 'orbit' })
      .backgroundColor(BG)
      .showNavInfo(false)
      .nodeId('id')
      .nodeVal((o: NodeObject) => { const n = o as unknown as GNode; const v = Math.max(1, (n.r ?? 4) * 0.9); return n._proposed ? v * 2.4 : v })
      .nodeRelSize(4)
      .nodeResolution(14)
      .nodeOpacity(1)
      .nodeColor(nodeColor)
      .nodeVisibility(nodeVisibility)   // while zoomed into BFP, the rest of the fleet isn't drawn at all
      .nodeThreeObjectExtend(true)   // sprites ADD to the default sphere, don't replace it
      // returning undefined → lib falls back to the default sphere (runtime-supported; types don't express it)
      .nodeThreeObject(nodeThreeObject as (o: NodeObject) => THREE.Object3D)
      .nodeLabel((o: NodeObject) => { const n = o as unknown as GNode; return `<div class="kg3-tip">${n.title ?? n.id}<span>${n.label}</span></div>` })
      .linkLabel(linkLabel as (o: LinkObject) => string)
      .linkColor(linkColor)
      .linkVisibility(linkVisibility)   // hide the non-BFP connectors too while zoomed in
      .linkThreeObjectExtend(true)
      .linkThreeObject(linkThreeObject as (o: LinkObject) => THREE.Object3D)
      .linkPositionUpdate(linkPositionUpdate as never)
      .linkWidth(linkWidth)
      .linkOpacity(0.92)
      .linkResolution(6)
      .linkDirectionalArrowLength(arrowLen)
      .linkDirectionalArrowColor(linkColor)
      .linkDirectionalArrowRelPos(1)
      .linkDirectionalParticles(particleCount)
      .linkDirectionalParticleWidth(1.9)
      .linkDirectionalParticleSpeed(0.006)
      .linkDirectionalParticleColor(linkColor)
      .width(host.clientWidth)
      .height(host.clientHeight)

    graphRef.current = Graph

    // clustered regions — pull each node to its asset-class anchor in 3D (mirrors 2D forceX/forceY,
    // now with a z axis). Clustered nodes pull harder; loose/cross nodes barely, so regions hold shape.
    const sx = (d: GNode) => anchorOf(d.cluster).x
    const sy = (d: GNode) => anchorOf(d.cluster).y
    const sz = (d: GNode) => anchorOf(d.cluster).z
    const str = (d: GNode) => (ANCHORS[d.cluster] ? 0.08 : 0.02)
    Graph.d3Force('x', forceX(sx).strength(str))
    Graph.d3Force('y', forceY(sy).strength(str))
    Graph.d3Force('z', forceZ(sz).strength(str))
    Graph.d3Force('charge', forceManyBody().strength(-90).distanceMax(420))
    Graph.d3Force('collide', forceCollide((d: GNode) => (d.r ?? 4) * 1.4 + 6))
    const lf = Graph.d3Force('link') as { distance: (f: (l: GLink) => number) => { strength: (f: (l: GLink) => number) => void } } | undefined
    if (lf) lf.distance((l: GLink) => (l.cross ? 320 : l.loose ? 220 : 90)).strength((l: GLink) => (l.cross || l.loose ? 0.01 : 0.3))

    // gentle idle auto-rotate for the "wow" — pause it the instant the user interacts (drag OR
    // scroll-zoom; OrbitControls only auto-pauses on drag, not on wheel-zoom, which is what caused
    // the janky spin-through-zoom), then resume the gentle spin ~3s after they stop touching it.
    const controls = Graph.controls() as {
      autoRotate?: boolean; autoRotateSpeed?: number
      addEventListener?: (e: string, cb: () => void) => void
    }
    if (controls) {
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.45
      controls.addEventListener?.('start', () => {
        controls.autoRotate = false
        clearTimeout(idleSpinTimerRef.current)
      })
      controls.addEventListener?.('end', () => {
        clearTimeout(idleSpinTimerRef.current)
        idleSpinTimerRef.current = window.setTimeout(() => { controls.autoRotate = true }, 3000)
      })
    }

    rebuild()
    // rotate the whole graph 90° anticlockwise in the screen plane (camera/orbit unaffected)
    ;(Graph.scene() as unknown as THREE.Object3D).rotation.z = SCENE_ROT
    // pull the camera back so the whole clustered fleet is framed
    Graph.cameraPosition({ z: 1650 })

    const ro = new ResizeObserver(() => {
      if (!hostRef.current) return
      const w = hostRef.current.clientWidth, h = hostRef.current.clientHeight
      Graph.width(w).height(h)
      dashMatsRef.current.forEach((m) => m.resolution.set(w, h)) // fat dashed lines need the live viewport size
    })
    ro.observe(host)

    // marching-ants animation — advance the dash offset each frame so the new-node rings crawl.
    // The scene re-renders continuously (orbit/autoRotate), so we only update the textures here.
    let raf = 0, dash = 0
    const animate = () => {
      dash = (dash + 0.5) % 19
      const committed = committedRef.current
      ringsRef.current = ringsRef.current.filter((r) => committed.has(r.id)) // drop rings of removed nodes
      for (const r of ringsRef.current) r.draw(dash)
      raf = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      zoomTimersRef.current.forEach(clearTimeout)
      clearTimeout(flashTimerRef.current)
      clearTimeout(idleSpinTimerRef.current)
      ro.disconnect()
      Graph._destructor()
      graphRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── "once it starts": on Run, fly the camera in to softly frame the BFP region (centre cluster),
  // and let the idle orbit continue around it. On reset, pull back to the full-fleet framing. Beats
  // that fire later (commit / re-weight / new-connection) still override this with their own fly-to.
  useEffect(() => {
    const G = graphRef.current
    if (!G) return
    zoomTimersRef.current.forEach(clearTimeout)
    zoomTimersRef.current = []
    clearTimeout(idleSpinTimerRef.current)
    const controls = G.controls() as { autoRotate?: boolean }
    if (!started) {
      bfpFocusRef.current = false // restore full-fleet colour
      firstNkZoomRef.current = false // re-arm the one-shot New-Knowledge zoom
      setFocused(false) // hide the on-screen "Boiler feed pump" title
      G.nodeColor(G.nodeColor()).linkColor(G.linkColor())
      G.nodeVisibility(G.nodeVisibility()).linkVisibility(G.linkVisibility()) // redraw the full fleet
      G.nodeThreeObject(G.nodeThreeObject()) // restore the asset-class caption
      if (controls) controls.autoRotate = true
      G.cameraPosition({ x: 0, y: 0, z: 1650 }, { x: 0, y: 0, z: 0 }, 1400)
      return
    }
    // mirror the working commit fly-in: pause the orbit, then fire ONE fly-to from a clean async tick
    // (not synchronously mid-commit) over the BFP focus nodes' live positions. Resume the gentle
    // orbit once the push-in settles. As the push-in lands, dim every non-BFP node/edge back so the
    // surrounding fleet stops crossing in front of the BFP region while it spins.
    if (controls) controls.autoRotate = false
    zoomTimersRef.current = [window.setTimeout(() => {
      flyToNodes(['SYM-001', 'BFP-3A', 'BFP-1A', 'BFP-3B'], BFP_START_STANDOFF)
      bfpFocusRef.current = true
      setFocused(true) // show the on-screen "Boiler feed pump" title
      G.nodeColor(G.nodeColor()).linkColor(G.linkColor())
      G.nodeVisibility(G.nodeVisibility()).linkVisibility(G.linkVisibility()) // clip the fleet away
      G.nodeThreeObject(G.nodeThreeObject()) // drop the asset-class caption while zoomed
      idleSpinTimerRef.current = window.setTimeout(() => { if (controls) controls.autoRotate = true }, 1900)
    }, 700)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started])

  // ── amber flash: each graph-imperfection beat (re-weight + the 2 gaps) pulses a node/edge amber
  // for ~1s then reverts (the re-weight edge also surfaces its "0.88 → 0.70" label during the flash).
  // The pulse signal bumps `seq` per fire, so back-to-back pulses re-trigger.
  useEffect(() => {
    const G = graphRef.current
    if (!G || !flashPulse) return
    flashNodesRef.current = new Set(flashPulse.nodes)
    flashEdgesRef.current = new Set(flashPulse.edges)
    G.nodeColor(G.nodeColor()).linkColor(G.linkColor()).linkWidth(G.linkWidth())
    G.linkThreeObject(G.linkThreeObject()) // surface the re-weight "0.88 → 0.70" label during its flash
    clearTimeout(flashTimerRef.current)
    flashTimerRef.current = window.setTimeout(() => {
      flashNodesRef.current = new Set()
      flashEdgesRef.current = new Set()
      const GG = graphRef.current
      if (GG) {
        GG.nodeColor(GG.nodeColor()).linkColor(GG.linkColor()).linkWidth(GG.linkWidth())
        GG.linkThreeObject(GG.linkThreeObject()) // drop the re-weight label when the flash ends
      }
    }, flashPulse.ms ?? 1000)
  }, [flashPulse])

  // ── persistent hover highlight: while a Panel-2/3 card is hovered, its node/edge ids glow teal
  // (edges thickened + arrowed) and the rest of the fleet dims back, so the path stands out. No
  // timer — it holds until the store clears hoverHighlight on mouse-leave.
  useEffect(() => {
    const G = graphRef.current
    if (!G) return
    hoverNodesRef.current = new Set(hoverHighlight?.nodes ?? [])
    hoverEdgesRef.current = new Set(hoverHighlight?.edges ?? [])
    hoverColorRef.current = hoverHighlight?.color ?? HOVER_HL
    G.nodeColor(G.nodeColor()).linkColor(G.linkColor()).linkWidth(G.linkWidth()).linkDirectionalArrowLength(G.linkDirectionalArrowLength())
  }, [hoverHighlight])

  // ── re-weight stays lit: once the human approves the re-weight, keep the DT-PHASE→Shaft-misalignment
  // edge amber (+ its "0.88 → 0.70" label) persistently. Repaint; and if this is the FIRST New-Knowledge
  // approval, fly the camera to the re-weighted edge (later approvals don't move the camera).
  useEffect(() => {
    const G = graphRef.current
    if (!G) return
    const prev = reweightAppliedRef.current
    reweightAppliedRef.current = reweightApplied
    G.nodeColor(G.nodeColor()).linkColor(G.linkColor()).linkWidth(G.linkWidth()).linkThreeObject(G.linkThreeObject())
    if (reweightApplied && !prev && !firstNkZoomRef.current) {
      firstNkZoomRef.current = true
      const controls = G.controls() as { autoRotate?: boolean }
      if (controls) controls.autoRotate = false
      clearTimeout(idleSpinTimerRef.current)
      zoomTimersRef.current.forEach(clearTimeout)
      zoomTimersRef.current = [window.setTimeout(() => flyToNodes(['SYM-001', 'DT-HOUSING-INSPECT', 'RC-BEARING-SPALL']), 1400)]
    }
  }, [reweightApplied])

  // ── new connections (two cards): when the human approves one in Panel 3, reveal that card's edge(s).
  //    The FIRST New-Knowledge approval flies the camera to its edge; later approvals don't move it. ──
  useEffect(() => {
    const prevA = connectionAppliedRef.current, prevB = connectionTestAppliedRef.current
    connectionAppliedRef.current = connectionApplied
    connectionTestAppliedRef.current = connectionTestApplied
    const G = graphRef.current
    if (!G) return
    rebuild()
    const justB = connectionTestApplied && !prevB
    const justA = connectionApplied && !prevA
    if ((justA || justB) && !firstNkZoomRef.current) {
      firstNkZoomRef.current = true
      const controls = G.controls() as { autoRotate?: boolean }
      if (controls) controls.autoRotate = false
      clearTimeout(idleSpinTimerRef.current)
      const target = justB ? ['BFP-S0', 'SYM-001', 'DT-WELD-NDT'] : ['BFP-S0', 'RC-CASING-CRACK']
      zoomTimersRef.current.forEach(clearTimeout)
      zoomTimersRef.current = [window.setTimeout(() => flyToNodes(target), 1400)]
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionApplied, connectionTestApplied])

  // ── persistent lit highlight: each approved New-Knowledge card leaves its nodes/edges lit ──
  useEffect(() => {
    litNodesRef.current = new Set(litNodes)
    litEdgesRef.current = new Set(litEdges)
    litGreenEdgesRef.current = new Set(litGreenEdges)
    litFuchsiaEdgesRef.current = new Set(litFuchsiaEdges)
    const G = graphRef.current
    if (G) G.nodeColor(G.nodeColor()).linkColor(G.linkColor()).linkWidth(G.linkWidth()).linkDirectionalArrowLength(G.linkDirectionalArrowLength()).linkThreeObject(G.linkThreeObject())
  }, [litNodes, litEdges, litGreenEdges, litFuchsiaEdges])

  // ── per-node commit growth: grow each approved proposed node/link into the live graph ──
  // Rebuild only — the camera does NOT move on commit (the one zoom is on Run; see the [started]
  // effect). The new node still grows in / gets its marching-ant ring via rebuild + the paint refs.
  useEffect(() => {
    committedRef.current = new Set(committedNodes)
    const G = graphRef.current
    if (!G) return
    rebuild()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedNodes])

  // While zoomed into BFP (bfpFocusRef on, set after the Run zoom lands), the rest of the fleet is
  // CLIPPED — not drawn at all — so nothing sweeps across / shades the BFP cluster as the camera
  // orbits. Hiding the node also hides its caption ("Combustor", …). Restored on zoom-out / reset.
  function nodeVisibility(o: NodeObject): boolean {
    const n = o as unknown as GNode
    return !(bfpFocusRef.current && n.cluster !== 'BFP')
  }
  function linkVisibility(o: LinkObject): boolean {
    const l = o as unknown as GLink
    return !(bfpFocusRef.current && !isBfpLink(l))
  }

  // fly the camera to centre-frame a given set of node ids (averaged live positions)
  function flyToNodes(ids: string[], standoff = COMMIT_STANDOFF) {
    const G = graphRef.current
    if (!G) return
    const idset = new Set(ids)
    const nodes = allNodesRef.current.filter((n) => idset.has(n.id) && n.x != null)
    if (!nodes.length) return
    let cx = 0, cy = 0, cz = 0
    for (const n of nodes) { cx += n.x ?? 0; cy += n.y ?? 0; cz += n.z ?? 0 }
    cx /= nodes.length; cy /= nodes.length; cz /= nodes.length
    // the scene is rotated SCENE_ROT about z, so aim the camera at the ROTATED centroid
    const rx = cx * Math.cos(SCENE_ROT) - cy * Math.sin(SCENE_ROT)
    const ry = cx * Math.sin(SCENE_ROT) + cy * Math.cos(SCENE_ROT)
    G.cameraPosition({ x: rx, y: ry, z: cz + standoff }, { x: rx, y: ry, z: cz }, 1800)
  }

  // recompute the visible subset = base fleet + approved proposed nodes (+ edges with both ends shown)
  function rebuild() {
    const G = graphRef.current
    if (!G) return
    const committed = committedRef.current
    const nodes = allNodesRef.current.filter((n) => baseIdsRef.current.has(n.id) || committed.has(n.id))
    const visible = new Set(nodes.map((n) => n.id))
    const links = allLinksRef.current.filter((l) => {
      if (!visible.has(linkEnd(l.source)) || !visible.has(linkEnd(l.target))) return false
      // proposed connection links stay hidden until THEIR Panel-3 card is approved. Gate by target:
      //   → weld NDT = the symptoms→test card (connectionTestApplied); everything else = the
      //   symptom→root-cause card (connectionApplied).
      if (l._proposed) {
        const toTest = linkEnd(l.target) === 'DT-WELD-NDT'
        if (!(toTest ? connectionTestAppliedRef.current : connectionAppliedRef.current)) return false
      }
      return true
    })
    // orphan guard: casing crack approved without its confirming test → provisional edge from DT-PHASE
    if (visible.has('RC-CASING-CRACK') && !visible.has('DT-WELD-NDT') && visible.has('DT-PHASE')) {
      links.push({ source: 'DT-PHASE', target: 'RC-CASING-CRACK', type: 'CONFIRMS', context: false, _proposed: true })
    }
    G.graphData({ nodes: nodes as unknown as NodeObject[], links: links as unknown as LinkObject[] })
  }

  // v2 #3/#6 — per-node sprites (added on top of the default sphere via nodeThreeObjectExtend):
  //   AssetClass hub → region caption floating above it
  //   committed new-knowledge node → marching-ants ring + floating name label
  function nodeThreeObject(o: NodeObject): THREE.Object3D | undefined {
    const n = o as unknown as GNode
    // zoomed into the BFP cluster → label the Symptom + Root-Cause nodes (the "what" + the "why")
    // with their full name below the sphere; tests / units / asset-class stay unlabelled to cut clutter
    if (bfpFocusRef.current && n.cluster === 'BFP' && !n._proposed && (n.label === 'Symptom' || n.label === 'RootCause') && (n.title || n.id)) {
      const rr = renderedRadius(Math.max(1, (n.r ?? 12) * 0.9))
      const lbl = makeLabelSprite(n.title ?? n.id, 3.7, '#0F1B3D')
      lbl.position.set(0, -(rr + 11), 0)
      return lbl
    }
    if (n.label === 'AssetClass' && n.title) {
      if (bfpFocusRef.current) return undefined // zoomed into BFP → hide the asset-class caption
      const rr = renderedRadius(Math.max(1, (n.r ?? 28) * 0.9))
      const lbl = makeLabelSprite(n.title, 21, '#111111')
      lbl.position.set(0, rr + 40, 0)
      return lbl
    }
    if (n._proposed) {
      const rr = renderedRadius(Math.max(1, (n.r ?? 12) * 0.9) * 2.4) // matches the popped nodeVal
      const group = new THREE.Group()
      const ring = makeMarchingRing(n.id, rr + 7, NODE_COLORS[n.label] ?? '#00A651')
      ringsRef.current = ringsRef.current.filter((r) => r.id !== n.id) // dedup re-adds
      ringsRef.current.push(ring)
      group.add(ring.sprite)
      if (n.title) {
        const lbl = makeLabelSprite(n.title, 12, '#047857', true)
        lbl.position.set(0, -(rr + 12), 0)
        group.add(lbl)
      }
      return group
    }
    return undefined
  }
  // v2 #4 — the "0.88 → 0.70" sprite label, surfaced on the re-weight edge only during its amber flash
  // a thick dashed Line2 (fat-line addon) for the new provisional link; endpoints are filled in each
  // frame by linkPositionUpdate. worldUnits → linewidth/dash sizes scale with the scene like the tubes.
  function makeDashedLine(color: string): Line2 {
    const geom = new LineGeometry()
    geom.setPositions([0, 0, 0, 0, 0, 0])
    const mat = new LineMaterial({ color, linewidth: 4, dashed: true, dashSize: 10, gapSize: 7, worldUnits: true, transparent: true, depthWrite: false })
    mat.resolution.set(hostRef.current?.clientWidth ?? 1, hostRef.current?.clientHeight ?? 1)
    dashMatsRef.current.push(mat)
    const line = new Line2(geom, mat)
    line.userData.dashed = true
    line.frustumCulled = false // 2-point geometry → unreliable bounding sphere; never cull it
    return line
  }
  function linkThreeObject(o: LinkObject): THREE.Object3D | undefined {
    const l = o as unknown as GLink
    // the new connection → a thick cyan dashed provisional line
    if (isNewEdge(l)) return makeDashedLine('#06b6d4')
    if (!isReweightEdge(l)) return undefined
    if (!isFlashEdge(l) && !reweightAppliedRef.current) return undefined // show during the flash OR once applied
    return makeLabelSprite('0.75 → 0.90', 9, '#A21CAF', true)
  }
  // position the dashed connection line between its endpoints each frame (return true → skip the lib's
  // default centring); every other custom link object falls through to the default positioning.
  function linkPositionUpdate(obj: THREE.Object3D | undefined, c: { start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number } }): boolean | void {
    if (!obj?.userData?.dashed) return
    const line = obj as Line2
    line.geometry.setPositions([c.start.x, c.start.y, c.start.z, c.end.x, c.end.y, c.end.z])
    line.computeLineDistances()
    return true
  }

  function nodeColor(o: NodeObject): string {
    const n = o as unknown as GNode
    // while zoomed into BFP, fade every non-BFP node back so it stops crossing in front of the region
    if (bfpFocusRef.current && n.cluster !== 'BFP') return 'rgba(148,163,184,0.07)'
    // Nodes keep their own colour at all times (highlighting happens on the EDGES only). Colour by
    // node LABEL (maps to legend): AssetClass slate · Machine green · Symptom amber · DiagnosticTest
    // blue · RootCause red · Inconclusive violet.
    return hexToRgba(NODE_COLORS[n.label], 0.55)
  }
  // v2 #4 — the over-confident edge targeted by the re-weight beat
  const RW_S = 'DT-HOUSING-INSPECT', RW_T = 'RC-BEARING-SPALL'
  const isReweightEdge = (l: GLink) => {
    const s = linkEnd(l.source), t = linkEnd(l.target)
    return (s === RW_S && t === RW_T) || (s === RW_T && t === RW_S)
  }
  // amber flash edge — matches the "SOURCE>TARGET" key either direction
  const isFlashEdge = (l: GLink) => {
    const s = linkEnd(l.source), t = linkEnd(l.target)
    return flashEdgesRef.current.has(`${s}>${t}`) || flashEdgesRef.current.has(`${t}>${s}`)
  }
  // hover-highlight edge — same either-direction "SOURCE>TARGET" key match
  const isHoverEdge = (l: GLink) => {
    const s = linkEnd(l.source), t = linkEnd(l.target)
    return hoverEdgesRef.current.has(`${s}>${t}`) || hoverEdgesRef.current.has(`${t}>${s}`)
  }
  // persistent lit edge (after a New-Knowledge confirm) — same either-direction key match
  const isLitEdge = (l: GLink) => {
    const s = linkEnd(l.source), t = linkEnd(l.target)
    return litEdgesRef.current.has(`${s}>${t}`) || litEdgesRef.current.has(`${t}>${s}`)
  }
  // cyan-lit new-connection edge (the headline temp → weld-NDT link)
  const isLitGreenEdge = (l: GLink) => {
    const s = linkEnd(l.source), t = linkEnd(l.target)
    return litGreenEdgesRef.current.has(`${s}>${t}`) || litGreenEdgesRef.current.has(`${t}>${s}`)
  }
  // fuchsia-lit re-weighted edge
  const isLitFuchsiaEdge = (l: GLink) => {
    const s = linkEnd(l.source), t = linkEnd(l.target)
    return litFuchsiaEdgesRef.current.has(`${s}>${t}`) || litFuchsiaEdgesRef.current.has(`${t}>${s}`)
  }
  // edge classification — drives a clear visual hierarchy so connections read as concrete:
  //   proposed (new red) > focus diagnostic tree > region-internal > cross-region
  const isFocus = (l: GLink) => !l.context && !l.cross && !l.loose // the SYM-001 diagnostic-tree edges
  // the new-connection card's NEW edge — once approved (connectionApplied) it renders as a thick dashed
  // provisional line (the supporting edges are left untouched as ordinary grey arrows)
  const isNewEdge = (l: GLink) => {
    const s = linkEnd(l.source), t = linkEnd(l.target)
    return NEW_EDGE_KEYS.has(`${s}>${t}`) || NEW_EDGE_KEYS.has(`${t}>${s}`)
  }
  const isSupportEdge = (l: GLink) => {
    const s = linkEnd(l.source), t = linkEnd(l.target)
    return SUPPORT_EDGE_KEYS.has(`${s}>${t}`) || SUPPORT_EDGE_KEYS.has(`${t}>${s}`)
  }
  // a link counts as BFP-internal only if BOTH endpoints live in the BFP cluster (used by the focus dim)
  const clusterOf = (e: string | GNode): string | undefined =>
    typeof e === 'object' ? e.cluster : allNodesRef.current.find((n) => n.id === e)?.cluster
  const isBfpLink = (l: GLink) => clusterOf(l.source) === 'BFP' && clusterOf(l.target) === 'BFP'

  function linkColor(o: LinkObject): string {
    const l = o as unknown as GLink
    // the new connection is drawn by its dashed Line2 (linkThreeObject) → hide the default solid line
    if (isNewEdge(l)) return 'rgba(0,0,0,0)'
    if (isFlashEdge(l)) return 'rgba(245,158,11,1)' // amber flash (~1s, gap/re-weight beat)
    if (isHoverEdge(l)) return hoverColorRef.current // hovered card → highlight colour (above proposed)
    if (isLitGreenEdge(l)) return 'rgba(6,182,212,1)'   // new connection → cyan
    if (isLitFuchsiaEdge(l) || (isReweightEdge(l) && reweightAppliedRef.current)) return 'rgba(192,38,211,1)' // re-weight → fuchsia
    if (isLitEdge(l)) return 'rgba(245,158,11,1)'       // supporting links → amber
    if (isSupportEdge(l)) return 'rgba(100,116,139,0.55)' // weld-NDT supporting links → plain grey (not proposed-red)
    if (l._proposed) return 'rgba(220,38,38,0.9)'       // newly committed knowledge → solid red
    // while zoomed into BFP, fade any edge touching a non-BFP node right back (matches the node dim)
    if (bfpFocusRef.current && !isBfpLink(l)) return 'rgba(100,116,139,0.04)'
    // when a hover is active, dim every non-highlighted connector back so the path stands out
    return hoverEdgesRef.current.size > 0 ? 'rgba(100,116,139,0.16)' : 'rgba(100,116,139,0.55)'
  }
  function linkWidth(o: LinkObject): number {
    const l = o as unknown as GLink
    if (isNewEdge(l)) return 0 // drawn as a thick dashed Line2 instead
    if (isFlashEdge(l)) return 3.2 // amber flash — briefly emphasised
    if (isHoverEdge(l)) return 3.4 // hovered card path — emphasised
    if (isReweightEdge(l) && reweightAppliedRef.current) return 3.2 // re-weight stays emphasised after approval
    if (isLitGreenEdge(l) || isLitFuchsiaEdge(l)) return 3.2 // new connection / re-weight → emphasised
    if (isLitEdge(l)) return 3.2                        // stays emphasised after a New-Knowledge confirm
    if (isSupportEdge(l)) return 1.1                    // weld-NDT supporting links → plain fleet weight
    if (l._proposed) return 2.4
    return 1.1                                          // every connector (focus + all fleet) → same weight
  }
  // arrows on the directed diagnostic tree + active paths + hovered card edges (fleet edges stay plain)
  function arrowLen(o: LinkObject): number {
    const l = o as unknown as GLink
    if (isNewEdge(l)) return 0 // no arrowhead on the dashed provisional link
    return l._proposed || isFocus(l) || isHoverEdge(l) ? 4 : 0
  }
  // flowing particles only on the newly committed paths so they feel alive without cluttering the fleet
  function particleCount(o: LinkObject): number {
    const l = o as unknown as GLink
    if (isNewEdge(l)) return 0 // dashed provisional line → no travelling dots
    if (isSupportEdge(l)) return 0 // no flowing particles on the plain-grey supporting links
    if (l._proposed) return 2
    return 0
  }

  return (
    <>
      <div ref={hostRef} className="kg3-host" />
      {/* on-screen focus title — appears top-centre once the Run zoom lands on the BFP region */}
      <div className="kg3-focus-title" data-show={focused}>Boiler feed pump</div>
      {/* v2 #1 — legend overlay (DOM sibling of the WebGL canvas, not inside it) */}
      <div className="kg3-legend">
        {([
          ['AssetClass', 'Equipment class'], ['Machine', 'Equipment'], ['Symptom', 'Symptom'],
          ['DiagnosticTest', 'Diagnostic test'], ['RootCause', 'Root cause'],
        ] as const).map(([label, text]) => (
          <div key={label} className="kg3-legend-row">
            <span className="kg3-legend-dot" style={{ background: NODE_COLORS[label] }} />
            {text}
          </div>
        ))}
        {/* edge-state legend — appears once new knowledge lands on the graph (after the zoom-in) */}
        {(connectionApplied || connectionTestApplied || reweightApplied) && (
          <>
            <div className="kg3-legend-sep" />
            {(connectionApplied || connectionTestApplied) && (
              <div className="kg3-legend-row"><span className="kg3-legend-bar" style={{ background: 'rgb(6,182,212)' }} />New edge</div>
            )}
            {reweightApplied && (
              <div className="kg3-legend-row"><span className="kg3-legend-bar" style={{ background: 'rgb(192,38,211)' }} />Updated edge</div>
            )}
          </>
        )}
      </div>
    </>
  )
}
