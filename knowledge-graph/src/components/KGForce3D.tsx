import { useEffect, useRef } from 'react'
import ForceGraph3D, { type NodeObject, type LinkObject } from '3d-force-graph'
import { forceX, forceY, forceZ, forceManyBody, forceCollide } from 'd3-force-3d'
import * as THREE from 'three'
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

// v2 #5 — commit camera standoff (world units from the new node). The resting view sits ~1030 from
// the BFP region, so a larger standoff = gentler push-in. Bump down for a stronger zoom, up for subtler.
// Kept comfortably > node radius (~12) so the single settle-then-fly push-in never clips the sphere.
const COMMIT_STANDOFF = 820

// 3D cluster anchors — keep the familiar 2D constellation (BFP centre, four around) but lift each
// region to its own depth so orbiting reveals real 3D separation. Same SPREAD ordering as the 2D map.
const SPREAD: [number, number][] = [[0.5, 0.5], [0.26, 0.28], [0.74, 0.28], [0.3, 0.76], [0.74, 0.76]]
const SPAN = 720
const DEPTH = [120, -110, 130, -130, 110] // per-cluster z, alternating for depth
const ANCHORS: Record<string, { x: number; y: number; z: number }> = {}
CLUSTERS.forEach((c, i) => {
  const [fx, fy] = SPREAD[i % SPREAD.length]
  ANCHORS[c.key] = { x: (fx - 0.5) * SPAN, y: -(fy - 0.5) * SPAN, z: DEPTH[i % DEPTH.length] }
})
const anchorOf = (cluster: string) => ANCHORS[cluster] ?? { x: 0, y: 0, z: 0 }

type GNode = SimNodeData & { x?: number; y?: number; z?: number; _proposed?: boolean }
type GLink = { source: string | GNode; target: string | GNode; type: string; context: boolean; cross?: boolean; loose?: boolean; _proposed?: boolean }
const linkEnd = (e: string | GNode) => (typeof e === 'object' ? e.id : e)

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

export function KGForce3D() {
  const hostRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<InstanceType<typeof ForceGraph3D> | null>(null)
  const committedRef = useRef<Set<string>>(new Set())
  const ringsRef = useRef<MarchingRing[]>([]) // live marching-ants rings (animated each frame)
  const zoomTimersRef = useRef<number[]>([])  // re-zoom passes as the new node settles (v2 #5)
  const flashNodesRef = useRef<Set<string>>(new Set()) // amber flash targets (~1s) on gap/re-weight beats
  const flashEdgesRef = useRef<Set<string>>(new Set())
  const flashTimerRef = useRef(0)
  const idleSpinTimerRef = useRef(0) // resume idle auto-rotate ~3s after the user stops interacting

  // persistent node/link objects (reused across graphData() calls so positions + physics survive)
  const allNodesRef = useRef<GNode[]>([])
  const allLinksRef = useRef<GLink[]>([])
  const baseIdsRef = useRef<Set<string>>(new Set())

  const committedNodes = useDemo((s) => s.committedNodes)
  const flashPulse = useDemo((s) => s.flashPulse)

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
      .nodeThreeObjectExtend(true)   // sprites ADD to the default sphere, don't replace it
      // returning undefined → lib falls back to the default sphere (runtime-supported; types don't express it)
      .nodeThreeObject(nodeThreeObject as (o: NodeObject) => THREE.Object3D)
      .nodeLabel((o: NodeObject) => { const n = o as unknown as GNode; return `<div class="kg3-tip">${n.title ?? n.id}<span>${n.label}</span></div>` })
      .linkColor(linkColor)
      .linkThreeObjectExtend(true)
      .linkThreeObject(linkThreeObject as (o: LinkObject) => THREE.Object3D)
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
    // pull the camera back so the whole clustered fleet is framed
    Graph.cameraPosition({ z: 1150 })

    const ro = new ResizeObserver(() => {
      if (!hostRef.current) return
      Graph.width(hostRef.current.clientWidth).height(hostRef.current.clientHeight)
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

  // ── per-node commit growth: grow each approved proposed node/link into the live graph ──
  // v2 #5 — commit-only camera: on sign-off, pause the idle orbit and fly the camera to the new
  // node so it lands centre-frame; on reset, resume the orbit and pull back to the full-fleet
  // framing. NOTE: we deliberately fire ONE fly-to after the new node has settled (not a 700/1600/
  // 2700ms chase) — the old multi-pass retargeted a still-drifting node mid-flight, overshooting
  // into the sphere and swinging back out (the "weird spin"). One late pass = one clean push-in.
  useEffect(() => {
    committedRef.current = new Set(committedNodes)
    const G = graphRef.current
    if (!G) return
    rebuild()

    zoomTimersRef.current.forEach(clearTimeout)
    zoomTimersRef.current = []
    clearTimeout(idleSpinTimerRef.current) // don't let a pending idle-resume re-spin the held frame
    const controls = G.controls() as { autoRotate?: boolean }

    if (committedNodes.length === 0) {
      if (controls) controls.autoRotate = true
      G.cameraPosition({ x: 0, y: 0, z: 1150 }, { x: 0, y: 0, z: 0 }, 1400)
      return
    }
    if (controls) controls.autoRotate = false
    // single fly, after the node has settled so the target isn't moving under the camera
    zoomTimersRef.current = [window.setTimeout(flyToCommitted, 1400)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedNodes])

  // average the committed nodes' live positions and frame them (pulled back along +z)
  function flyToCommitted() {
    const G = graphRef.current
    if (!G) return
    const committed = committedRef.current
    const nodes = allNodesRef.current.filter((n) => committed.has(n.id) && n.x != null)
    if (!nodes.length) return
    let cx = 0, cy = 0, cz = 0
    for (const n of nodes) { cx += n.x ?? 0; cy += n.y ?? 0; cz += n.z ?? 0 }
    cx /= nodes.length; cy /= nodes.length; cz /= nodes.length
    G.cameraPosition({ x: cx, y: cy, z: cz + COMMIT_STANDOFF }, { x: cx, y: cy, z: cz }, 1800)
  }

  // recompute the visible subset = base fleet + approved proposed nodes (+ edges with both ends shown)
  function rebuild() {
    const G = graphRef.current
    if (!G) return
    const committed = committedRef.current
    const nodes = allNodesRef.current.filter((n) => baseIdsRef.current.has(n.id) || committed.has(n.id))
    const visible = new Set(nodes.map((n) => n.id))
    const links = allLinksRef.current.filter((l) => visible.has(linkEnd(l.source)) && visible.has(linkEnd(l.target)))
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
    if (n.label === 'AssetClass' && n.title) {
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
  function linkThreeObject(o: LinkObject): THREE.Object3D | undefined {
    const l = o as unknown as GLink
    if (!isReweightEdge(l) || !isFlashEdge(l)) return undefined
    return makeLabelSprite('0.88 → 0.70', 9, '#B45309', true)
  }

  function nodeColor(o: NodeObject): string {
    const n = o as unknown as GNode
    if (flashNodesRef.current.has(n.id)) return 'rgba(245,158,11,1)' // amber flash (~1s, gap/re-weight beat)
    // v2 #2 — committed new-knowledge nodes POP: full opacity (vs the uniform 0.55 fade) so the
    // freshly-grown casing-crack / weld-NDT nodes draw the eye against the faded fleet.
    if (n._proposed) return hexToRgba(NODE_COLORS[n.label], 1)
    // colour by node LABEL (maps to legend): AssetClass slate · Machine green · Symptom amber ·
    // DiagnosticTest blue · RootCause red · Inconclusive violet. Every node uniformly faded so only
    // the growing new-knowledge nodes draw the eye.
    return hexToRgba(NODE_COLORS[n.label], 0.55)
  }
  // v2 #4 — the over-confident edge targeted by the re-weight beat
  const RW_S = 'DT-PHASE', RW_T = 'RC-BENT-SHAFT'
  const isReweightEdge = (l: GLink) => {
    const s = linkEnd(l.source), t = linkEnd(l.target)
    return (s === RW_S && t === RW_T) || (s === RW_T && t === RW_S)
  }
  // amber flash edge — matches the "SOURCE>TARGET" key either direction
  const isFlashEdge = (l: GLink) => {
    const s = linkEnd(l.source), t = linkEnd(l.target)
    return flashEdgesRef.current.has(`${s}>${t}`) || flashEdgesRef.current.has(`${t}>${s}`)
  }
  // edge classification — drives a clear visual hierarchy so connections read as concrete:
  //   proposed (new red) > focus diagnostic tree > region-internal > cross-region
  const isFocus = (l: GLink) => !l.context && !l.cross && !l.loose // the SYM-001 diagnostic-tree edges

  function linkColor(o: LinkObject): string {
    const l = o as unknown as GLink
    if (isFlashEdge(l)) return 'rgba(245,158,11,1)' // amber flash (~1s, gap/re-weight beat)
    if (l._proposed) return 'rgba(220,38,38,0.9)'       // newly committed knowledge → solid red
    return 'rgba(100,116,139,0.55)'                     // every connector (focus + all fleet) → one uniform mid slate
  }
  function linkWidth(o: LinkObject): number {
    const l = o as unknown as GLink
    if (isFlashEdge(l)) return 3.2 // amber flash — briefly emphasised
    if (l._proposed) return 2.4
    return 1.1                                          // every connector (focus + all fleet) → same weight
  }
  // arrows on the directed diagnostic tree + active paths only (fleet edges stay plain, like the intra-region ones)
  function arrowLen(o: LinkObject): number {
    const l = o as unknown as GLink
    return l._proposed || isFocus(l) ? 4 : 0
  }
  // flowing particles only on the newly committed paths so they feel alive without cluttering the fleet
  function particleCount(o: LinkObject): number {
    const l = o as unknown as GLink
    if (l._proposed) return 2
    return 0
  }

  return (
    <>
      <div ref={hostRef} className="kg3-host" />
      {/* v2 #1 — legend overlay (DOM sibling of the WebGL canvas, not inside it) */}
      <div className="kg3-legend">
        {([
          ['AssetClass', 'Asset class'], ['Machine', 'Machine'], ['Symptom', 'Symptom'],
          ['DiagnosticTest', 'Test'], ['RootCause', 'Root cause'], ['Inconclusive', 'Inconclusive'],
        ] as const).map(([label, text]) => (
          <div key={label} className="kg3-legend-row">
            <span className="kg3-legend-dot" style={{ background: NODE_COLORS[label] }} />
            {text}
          </div>
        ))}
      </div>
    </>
  )
}
