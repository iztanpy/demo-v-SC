import { useEffect, useRef } from 'react'
import {
  forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY,
  type Simulation, type SimulationNodeDatum,
} from 'd3-force'
import {
  FLEET_NODES, FLEET_EDGES, FLEET_EDGE_COUNT, CLUSTERS, CLUSTER_LABEL, CLUSTER_COLOR,
  PROPOSED_NODES, PROPOSED_EDGES,
} from '../data/backdrop'
import type { SimNodeData, SimEdgeData } from '../data/backdrop'
import { NODE_COLORS } from '../data/graph'
import { useDemo } from '../demoStore'
import './KGForce.css'

// One interconnected fleet KNOWLEDGE GRAPH (force-directed, imperative DOM for perf). Resolution
// lights matched paths green + re-weights an over-confident edge; New Knowledge commits the
// casing-crack node into the live simulation (it grows into the BFP region on sign-off).
const SVGNS = 'http://www.w3.org/2000/svg'
const W = 2040, H = 1260
const hubId = (key: string) => (key === 'BFP' ? 'AC-BFP' : `${key}-AC`)

const SPREAD: [number, number][] = [[0.5, 0.52], [0.28, 0.3], [0.72, 0.3], [0.3, 0.74], [0.72, 0.74]]
const CENTERS: Record<string, { x: number; y: number }> = {}
CLUSTERS.forEach((c, i) => {
  const [fx, fy] = SPREAD[i % SPREAD.length]
  CENTERS[c.key] = { x: fx * W, y: fy * H }
})

// Center (cx,cy) in the viewBox at zoom z, with optional manual nudge (dx,dy) in viewBox units —
// +dx shifts the view RIGHT, +dy shifts it DOWN. viewBox is "0 0 W H", so the view <g>'s transform
// origin is the unambiguous user origin (0,0) — textbook centering: translate so cx*z lands at W/2.
const centerTransform = (cx: number, cy: number, z: number, dx = 0, dy = 0) =>
  `translate(${W / 2 - cx * z + dx}px, ${H / 2 - cy * z + dy}px) scale(${z})`

// full-fleet resting view — a slight zoom-OUT (centred) gives the whole graph breathing room at the
// edges; this is where the graph sits until resolution begins reaffirming.
const FULL_Z = 0.82
const FULL_TRANSFORM = centerTransform(W / 2, H / 2, FULL_Z)

// reaffirm view — once resolution starts, zoom INTO the relevant (BFP) region where every
// JRG-CCGT-1 incident lives. Commit pushes in further; uncommit returns to whatever base applies.
const REST_Z = 1.5
const REST_TRANSFORM = (() => {
  const b = CENTERS['BFP'] ?? { x: W / 2, y: H / 2 }
  return centerTransform(b.x, b.y, REST_Z)
})()

// ── COMMIT (final) ZOOM — manual tweak knobs. If the new-knowledge region isn't dead-centre when
// the node commits, nudge these: bump COMMIT_DX to push RIGHT, COMMIT_DY to push DOWN (viewBox
// units, ~2040 wide × 1260 tall). COMMIT_Z is how far in it zooms.
const COMMIT_Z = 2.3
const COMMIT_DX = 50
const COMMIT_DY = 0

type SimNode = SimNodeData & SimulationNodeDatum & { x: number; y: number }
type SimLink = { source: SimNode | string; target: SimNode | string; type: string; context: boolean; cross?: boolean; loose?: boolean; isNew?: boolean }
type EdgeRec = { link: SimLink; el: SVGLineElement; s: string; t: string }

function makeNodeEl(n: SimNode, isNew = false): SVGCircleElement {
  const circ = document.createElementNS(SVGNS, 'circle')
  circ.setAttribute('r', String(n.r))
  circ.setAttribute('fill', NODE_COLORS[n.label])
  let cls = n.label === 'AssetClass' ? 'kgf-node kgf-hub' : n.context ? 'kgf-node' : 'kgf-node kgf-node-focus'
  if (isNew) cls += ' kgf-new'
  circ.setAttribute('class', cls)
  if (!n.context || n.label === 'AssetClass') {
    circ.style.filter = `drop-shadow(0 0 ${n.label === 'AssetClass' ? 9 : 6}px ${CLUSTER_COLOR[n.cluster] ?? NODE_COLORS[n.label]})`
  }
  return circ
}
function makeLinkEl(l: SimLink, isNew = false): SVGLineElement {
  const ln = document.createElementNS(SVGNS, 'line')
  const cls = isNew ? 'kgf-edge kgf-edge-new'
    : l.loose ? 'kgf-edge kgf-edge-loose' : l.cross ? 'kgf-edge kgf-edge-cross' : l.context ? 'kgf-edge' : 'kgf-edge kgf-edge-focus'
  ln.setAttribute('class', cls)
  ln.setAttribute('data-type', l.type)
  return ln
}

export function KGForce() {
  const viewRef = useRef<SVGGElement>(null)
  const zoomTimersRef = useRef<number[]>([]) // re-zoom passes as the new nodes settle
  const haloRef = useRef<SVGGElement>(null)
  const edgeRef = useRef<SVGGElement>(null)
  const nodeRef = useRef<SVGGElement>(null)
  const labelRef = useRef<SVGGElement>(null)
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null)
  const nodesRef = useRef<SimNode[]>([])
  const edgeRecsRef = useRef<EdgeRec[]>([])
  const nodeMapRef = useRef<Record<string, SVGCircleElement>>({})
  const rwLabelRef = useRef<SVGTextElement | null>(null)
  const newLabelsRef = useRef<{ el: SVGTextElement; id: string }[]>([])
  const newRingsRef = useRef<{ el: SVGCircleElement; id: string }[]>([])
  const baseTransformRef = useRef(FULL_TRANSFORM) // base view the graph returns to when not committed
  const committedRef = useRef(false)
  const matchedNodes = useDemo((s) => s.matchedNodes)
  const reweight = useDemo((s) => s.reweight)
  const reweightApplied = useDemo((s) => s.reweightApplied)
  const committed = useDemo((s) => s.committed)

  useEffect(() => {
    const haloG = haloRef.current!, edgeG = edgeRef.current!, nodeG = nodeRef.current!, labelG = labelRef.current!
    haloG.replaceChildren(); edgeG.replaceChildren(); nodeG.replaceChildren(); labelG.replaceChildren()
    nodeMapRef.current = {}

    const nodes: SimNode[] = FLEET_NODES.map((n) => {
      const c = CENTERS[n.cluster] ?? { x: W / 2, y: H / 2 }
      return { ...n, x: c.x + (Math.random() - 0.5) * 120, y: c.y + (Math.random() - 0.5) * 120 } as SimNode
    })
    nodesRef.current = nodes

    // ── tints + asset-class labels ──
    const haloEls: Record<string, SVGCircleElement> = {}
    const labelEls: Record<string, SVGTextElement> = {}
    for (const c of CLUSTERS) {
      const halo = document.createElementNS(SVGNS, 'circle')
      halo.setAttribute('class', 'kgf-halo'); halo.setAttribute('fill', c.color)
      haloG.appendChild(halo); haloEls[c.key] = halo
      const lbl = document.createElementNS(SVGNS, 'text')
      lbl.setAttribute('class', 'kgf-clabel'); lbl.setAttribute('fill', c.color); lbl.setAttribute('text-anchor', 'middle')
      lbl.textContent = CLUSTER_LABEL[c.key]
      labelG.appendChild(lbl); labelEls[c.key] = lbl
    }
    const rw = document.createElementNS(SVGNS, 'text')
    rw.setAttribute('class', 'kgf-reweight-label'); rw.setAttribute('text-anchor', 'middle')
    rw.style.display = 'none'; rw.textContent = '0.88 → 0.70'
    labelG.appendChild(rw); rwLabelRef.current = rw

    edgeRecsRef.current = FLEET_EDGES.map((e: SimEdgeData) => {
      const link: SimLink = { ...e }
      const el = makeLinkEl(link)
      edgeG.appendChild(el)
      return { link, el, s: e.source, t: e.target }
    })
    for (const n of nodes) { const el = makeNodeEl(n); nodeG.appendChild(el); nodeMapRef.current[n.id] = el }

    const sim = forceSimulation<SimNode>(nodes)
      .force('link', forceLink<SimNode, SimLink>(edgeRecsRef.current.map((r) => r.link)).id((d) => (d as SimNode).id)
        .distance((l) => (l.cross ? 520 : l.loose ? 360 : 300))
        .strength((l) => (l.cross || l.loose ? 0.003 : 0.16)))
      .force('charge', forceManyBody().strength(-200).distanceMax(820))
      .force('collide', forceCollide<SimNode>().radius((d) => d.r + 16).iterations(2))
      .force('x', forceX<SimNode>((d) => CENTERS[d.cluster]?.x ?? W / 2).strength((d) => (CENTERS[d.cluster] ? 0.08 : 0.02)))
      .force('y', forceY<SimNode>((d) => CENTERS[d.cluster]?.y ?? H / 2).strength((d) => (CENTERS[d.cluster] ? 0.09 : 0.02)))
      .alphaDecay(0.018)
    simRef.current = sim

    sim.on('tick', () => {
      for (const rec of edgeRecsRef.current) {
        const s = rec.link.source as SimNode, t = rec.link.target as SimNode
        rec.el.setAttribute('x1', String(s.x)); rec.el.setAttribute('y1', String(s.y))
        rec.el.setAttribute('x2', String(t.x)); rec.el.setAttribute('y2', String(t.y))
      }
      for (const n of nodesRef.current) {
        const el = nodeMapRef.current[n.id]
        if (el) { el.setAttribute('cx', String(n.x)); el.setAttribute('cy', String(n.y)) }
      }
      for (const nl of newLabelsRef.current) {
        const n = nodesRef.current.find((x) => x.id === nl.id)
        if (n) { nl.el.setAttribute('x', String(n.x)); nl.el.setAttribute('y', String(n.y + n.r + 22)) }
      }
      for (const nr of newRingsRef.current) {
        const n = nodesRef.current.find((x) => x.id === nr.id)
        if (n) { nr.el.setAttribute('cx', String(n.x)); nr.el.setAttribute('cy', String(n.y)) }
      }
      for (const c of CLUSTERS) {
        const mem = nodesRef.current.filter((n) => n.cluster === c.key)
        if (!mem.length) continue
        let cx = 0, cy = 0
        for (const m of mem) { cx += m.x; cy += m.y }
        cx /= mem.length; cy /= mem.length
        const ds = mem.map((m) => Math.hypot(m.x - cx, m.y - cy)).sort((a, b) => a - b)
        const r = ds[Math.floor(ds.length * 0.7)] ?? 40
        haloEls[c.key].setAttribute('cx', String(cx)); haloEls[c.key].setAttribute('cy', String(cy)); haloEls[c.key].setAttribute('r', String(r + 22))
        const hub = mem.find((n) => n.id === hubId(c.key))
        labelEls[c.key].setAttribute('x', String(hub ? hub.x : cx)); labelEls[c.key].setAttribute('y', String((hub ? hub.y : cy) - 20))
      }
    })

    return () => { sim.stop(); simRef.current = null }
  }, [])

  // light up confirmed paths green + show the edge re-weight (amber)
  useEffect(() => {
    const set = new Set(matchedNodes)
    // zoom IN to the BFP region the moment resolution starts reaffirming (particles begin flying);
    // back out to the full fleet view when there are no matches (reset).
    const base = set.size ? REST_TRANSFORM : FULL_TRANSFORM
    baseTransformRef.current = base
    if (!committedRef.current && viewRef.current) viewRef.current.style.transform = base
    for (const [id, el] of Object.entries(nodeMapRef.current)) el.classList.toggle('kgf-match', set.has(id))
    for (const rec of edgeRecsRef.current) rec.el.classList.toggle('kgf-edge-match', set.has(rec.s) && set.has(rec.t))

    const rwActive = reweight && !reweightApplied // proposed, pending the human's call
    const rwDone = reweightApplied // admin recalculated → applied
    const isRwEdge = (s: string, t: string) => (s === 'DT-PHASE' && t === 'RC-BENT-SHAFT') || (s === 'RC-BENT-SHAFT' && t === 'DT-PHASE')
    for (const rec of edgeRecsRef.current) {
      const e = isRwEdge(rec.s, rec.t)
      rec.el.classList.toggle('kgf-edge-reweight', e && rwActive)
      rec.el.classList.toggle('kgf-edge-reweighted', e && rwDone)
    }
    nodeMapRef.current['RC-BENT-SHAFT']?.classList.toggle('kgf-reweight', rwActive)
    const lbl = rwLabelRef.current
    if (lbl) {
      const a = nodeMapRef.current['DT-PHASE'], b = nodeMapRef.current['RC-BENT-SHAFT']
      if ((rwActive || rwDone) && a && b) {
        const mx = (+a.getAttribute('cx')! + +b.getAttribute('cx')!) / 2
        const my = (+a.getAttribute('cy')! + +b.getAttribute('cy')!) / 2
        lbl.setAttribute('x', String(mx)); lbl.setAttribute('y', String(my - 6))
        lbl.textContent = rwDone ? '0.70 ✓' : '0.88 → 0.70'
        lbl.style.display = ''
      } else lbl.style.display = 'none'
    }
  }, [matchedNodes, reweight, reweightApplied])

  // New Knowledge commit: grow the casing-crack node + weld-NDT test + edges into the live sim
  // on sign-off; remove them again on restart.
  useEffect(() => {
    committedRef.current = committed
    const sim = simRef.current
    if (!sim) return
    const present = !!nodeMapRef.current['RC-CASING-CRACK']

    // on commit, drop the green reaffirm highlights so the focus is purely on the new node(s)
    if (committed) {
      for (const el of Object.values(nodeMapRef.current)) el.classList.remove('kgf-match')
      for (const rec of edgeRecsRef.current) rec.el.classList.remove('kgf-edge-match')
    }

    if (committed && !present) {
      const nodeG = nodeRef.current!, edgeG = edgeRef.current!, labelG = labelRef.current!
      const anchor = nodesRef.current.find((n) => n.id === 'DT-PHASE') ?? nodesRef.current.find((n) => n.id === 'AC-BFP')
      const px = anchor?.x ?? W / 2, py = anchor?.y ?? H / 2
      for (const pn of PROPOSED_NODES) {
        if (nodeMapRef.current[pn.id]) continue
        const bigR = pn.r * 1.6 // enlarge the new nodes so they stand out
        const sn = { ...pn, r: bigR, x: px + (Math.random() - 0.5) * 90, y: py + (Math.random() - 0.5) * 90 } as SimNode
        nodesRef.current.push(sn)
        const el = makeNodeEl(sn, true); nodeG.appendChild(el); nodeMapRef.current[pn.id] = el
        // animated outline ring (marching-ants) around the new node
        const ring = document.createElementNS(SVGNS, 'circle')
        ring.setAttribute('class', 'kgf-newring'); ring.setAttribute('fill', 'none'); ring.setAttribute('r', String(bigR + 12))
        nodeG.appendChild(ring); newRingsRef.current.push({ el: ring, id: pn.id })
        // identifier label so the newly-added knowledge is unmistakable
        const t = document.createElementNS(SVGNS, 'text')
        t.setAttribute('class', 'kgf-newlabel'); t.setAttribute('text-anchor', 'middle')
        t.textContent = pn.title ?? 'new'
        labelG.appendChild(t); newLabelsRef.current.push({ el: t, id: pn.id })
      }
      for (const pe of PROPOSED_EDGES) {
        if (pe.type === 'SHORTCUT') continue // focus the commit on the casing-crack knowledge
        const link: SimLink = { ...pe }
        const el = makeLinkEl(link, true); edgeG.appendChild(el)
        edgeRecsRef.current.push({ link, el, s: pe.source, t: pe.target })
      }
      sim.nodes(nodesRef.current)
      ;(sim.force('link') as ReturnType<typeof forceLink<SimNode, SimLink>>).links(edgeRecsRef.current.map((r) => r.link))
      sim.alpha(0.7).restart()

      // zoom onto the NEW nodes only (not the old reaffirmed path). Re-run as the sim cools so it
      // tracks them to their final positions and lands reliably centred.
      const focusIds = PROPOSED_NODES.map((n) => n.id)
      const doZoom = () => {
        const focus = nodesRef.current.filter((n) => focusIds.includes(n.id))
        if (!focus.length || !viewRef.current) return
        let cx = 0, cy = 0
        for (const n of focus) { cx += n.x; cy += n.y }
        cx /= focus.length; cy /= focus.length
        viewRef.current.style.transform = centerTransform(cx, cy, COMMIT_Z, COMMIT_DX, COMMIT_DY)
      }
      zoomTimersRef.current = [700, 1600, 2700, 3800, 4900].map((d) => window.setTimeout(doZoom, d))
    } else if (!committed && present) {
      zoomTimersRef.current.forEach(clearTimeout); zoomTimersRef.current = []
      if (viewRef.current) viewRef.current.style.transform = baseTransformRef.current
      const prop = new Set(PROPOSED_NODES.map((n) => n.id))
      nodesRef.current = nodesRef.current.filter((n) => !prop.has(n.id))
      for (const id of prop) { nodeMapRef.current[id]?.remove(); delete nodeMapRef.current[id] }
      for (const nl of newLabelsRef.current) nl.el.remove()
      newLabelsRef.current = []
      for (const nr of newRingsRef.current) nr.el.remove()
      newRingsRef.current = []
      edgeRecsRef.current = edgeRecsRef.current.filter((r) => {
        if (prop.has(r.s) || prop.has(r.t)) { r.el.remove(); return false }
        return true
      })
      sim.nodes(nodesRef.current)
      ;(sim.force('link') as ReturnType<typeof forceLink<SimNode, SimLink>>).links(edgeRecsRef.current.map((r) => r.link))
      sim.alpha(0.4).restart()
    }
  }, [committed])

  return (
    <div className="kgf-stage">
      <div className="kgf-legend">
        {([
          ['AssetClass', 'Asset class'], ['Machine', 'Machine'], ['Symptom', 'Symptom'],
          ['DiagnosticTest', 'Test'], ['RootCause', 'Root cause'],
        ] as const).map(([label, text]) => (
          <div key={label} className="kgf-legend-row">
            <span className="kgf-legend-dot" style={{ background: NODE_COLORS[label] }} />
            {text}
          </div>
        ))}
      </div>
      <svg className="kgf-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <g ref={viewRef} style={{ transformBox: 'view-box', transformOrigin: '0 0', transition: 'transform 1000ms ease' }}>
          <g ref={haloRef} className="kgf-halos" />
          <g ref={edgeRef} className="kgf-edges" />
          <g ref={nodeRef} className="kgf-nodes" />
          <g ref={labelRef} className="kgf-labels" />
        </g>
      </svg>
      <div className="kgf-count">{FLEET_NODES.length} nodes · {FLEET_EDGE_COUNT} relations · {CLUSTERS.length} asset classes</div>
    </div>
  )
}
