import { useEffect, useRef } from 'react'
import ForceGraph3D, { type NodeObject, type LinkObject } from '3d-force-graph'
import { forceX, forceY, forceZ, forceManyBody, forceCollide } from 'd3-force-3d'
import {
  FLEET_NODES, FLEET_EDGES, PROPOSED_NODES, PROPOSED_EDGES, CLUSTERS,
} from '../data/backdrop'
import type { SimNodeData, SimEdgeData } from '../data/backdrop'
import { NODE_COLORS } from '../data/graph'
import { useDemo } from '../demoStore'

// ── 3D port of the fleet knowledge graph (3d-force-graph / WebGL) ──
// v1 — same nodes/edges as the 2D map, the SAME clustered regions (each asset-class pulled to its
// own 3D anchor, mirroring the 2D forceX/forceY centres), orbit controls, reaffirm-green on matched
// paths, and per-node commit growth from Panel 3. v2 will add the re-weight edge state, the
// marching-ants new-node rings/labels, and zoom-to-focus camera moves.

const BG = '#E9EFF6' // light, to sit inside the light-theme right pane

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

export function KGForce3D() {
  const hostRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<InstanceType<typeof ForceGraph3D> | null>(null)
  const matchedRef = useRef<Set<string>>(new Set())
  const committedRef = useRef<Set<string>>(new Set())

  // persistent node/link objects (reused across graphData() calls so positions + physics survive)
  const allNodesRef = useRef<GNode[]>([])
  const allLinksRef = useRef<GLink[]>([])
  const baseIdsRef = useRef<Set<string>>(new Set())

  const matchedNodes = useDemo((s) => s.matchedNodes)
  const committedNodes = useDemo((s) => s.committedNodes)

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
      .nodeVal((o: NodeObject) => { const n = o as unknown as GNode; return Math.max(1, (n.r ?? 4) * 0.9) })
      .nodeRelSize(4)
      .nodeResolution(14)
      .nodeOpacity(1)
      .nodeColor(nodeColor)
      .nodeLabel((o: NodeObject) => { const n = o as unknown as GNode; return `<div class="kg3-tip">${n.title ?? n.id}<span>${n.label}</span></div>` })
      .linkColor(linkColor)
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

    // gentle idle auto-rotate for the "wow" — pauses naturally while the user drags
    const controls = Graph.controls() as { autoRotate?: boolean; autoRotateSpeed?: number }
    if (controls) { controls.autoRotate = true; controls.autoRotateSpeed = 0.45 }

    rebuild()
    // pull the camera back so the whole clustered fleet is framed
    Graph.cameraPosition({ z: 1150 })

    const ro = new ResizeObserver(() => {
      if (!hostRef.current) return
      Graph.width(hostRef.current.clientWidth).height(hostRef.current.clientHeight)
    })
    ro.observe(host)

    return () => {
      ro.disconnect()
      Graph._destructor()
      graphRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── reaffirm-green: recolour matched nodes/links when Resolution updates ──
  useEffect(() => {
    matchedRef.current = new Set(matchedNodes)
    const G = graphRef.current
    if (!G) return
    // re-trigger accessors so matched paths recolour + grow arrows/particles
    G.nodeColor(G.nodeColor()).linkColor(G.linkColor()).linkWidth(G.linkWidth())
    G.linkDirectionalArrowLength(G.linkDirectionalArrowLength()).linkDirectionalParticles(G.linkDirectionalParticles())
  }, [matchedNodes])

  // ── per-node commit growth: grow each approved proposed node/link into the live graph ──
  useEffect(() => {
    committedRef.current = new Set(committedNodes)
    if (graphRef.current) rebuild()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedNodes])

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

  function nodeColor(o: NodeObject): string {
    const n = o as unknown as GNode
    if (matchedRef.current.has(n.id)) return '#00A651' // reaffirmed path → active highlight (the only pop)
    // colour by node LABEL (maps to legend): AssetClass slate · Machine green · Symptom amber ·
    // DiagnosticTest blue · RootCause red · Inconclusive violet. Every node uniformly faded — no
    // focus/backdrop split — so only matched (and the growing new-knowledge nodes) draw the eye.
    return hexToRgba(NODE_COLORS[n.label], 0.55)
  }
  // edge classification — drives a clear visual hierarchy so connections read as concrete:
  //   matched (reaffirmed green) > proposed (new red) > focus diagnostic tree > region-internal > cross-region
  const isMatched = (l: GLink) => matchedRef.current.has(linkEnd(l.source)) && matchedRef.current.has(linkEnd(l.target))
  const isFocus = (l: GLink) => !l.context && !l.cross && !l.loose // the SYM-001 diagnostic-tree edges

  function linkColor(o: LinkObject): string {
    const l = o as unknown as GLink
    if (isMatched(l)) return 'rgba(0,166,81,0.95)'      // reaffirmed path → solid green
    if (l._proposed) return 'rgba(220,38,38,0.9)'       // newly committed knowledge → solid red
    return 'rgba(100,116,139,0.55)'                     // every connector (focus + all fleet) → one uniform mid slate
  }
  function linkWidth(o: LinkObject): number {
    const l = o as unknown as GLink
    if (isMatched(l)) return 2.8
    if (l._proposed) return 2.4
    return 1.1                                          // every connector (focus + all fleet) → same weight
  }
  // arrows on the directed diagnostic tree + active paths only (fleet edges stay plain, like the intra-region ones)
  function arrowLen(o: LinkObject): number {
    const l = o as unknown as GLink
    return isMatched(l) || l._proposed || isFocus(l) ? 4 : 0
  }
  // flowing particles only on the live paths so they feel alive without cluttering the fleet
  function particleCount(o: LinkObject): number {
    const l = o as unknown as GLink
    if (isMatched(l)) return 3
    if (l._proposed) return 2
    return 0
  }

  return <div ref={hostRef} className="kg3-host" />
}
