import { useState } from 'react'
import { NODES, EDGES, VIEWBOX, NODE_COLORS, NODE_LABELS } from '../data/graph'
import type { GraphNode, GraphEdge, PropVal } from '../types'
import { useP2 } from '../store'

// R1/R2 — circular typed-graph render + click-to-inspect.
// R4 — the live incident is generated node-by-node as `step` advances. When the build
// starts (step >= 2) the historical graph shrinks + tucks left into a faint "memory bank";
// the live incident builds full-size in the freed centre/right, tethered to the Symptom.
const R = 30

// Recede transform for the historical group (CSS, so it animates via transition).
const RECEDE = { s: 0.46, tx: 20, ty: 40 }

const byId = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<string, GraphNode>

// Symptom's on-screen position once the historical group has receded (for the live tether).
const SYM = byId['SYM-001']
const SYM_RECEDED = { x: SYM.x * RECEDE.s + RECEDE.tx, y: SYM.y * RECEDE.s + RECEDE.ty }

function formatVal(v: PropVal): string {
  if (Array.isArray(v)) return v.join(' · ')
  if (typeof v === 'boolean') return v ? '✓ yes' : '✗ no'
  return String(v)
}

export function KGHero() {
  const step = useP2((s) => s.step)
  const [selectedId, setSelected] = useState<string | null>(null)
  const selected = selectedId ? byId[selectedId] : null
  const receded = step >= 2

  const histNodes = NODES.filter((n) => !n.live)
  const histEdges = EDGES.filter((e) => !e.live)
  const liveNodes = NODES.filter((n) => n.live && n.step <= step)
  const liveEdges = EDGES.filter((e) => e.live && e.step <= step)

  // Displayed diagnosis status — the live initial dx only flips to Incorrect at step 7.
  function statusOf(n: GraphNode): string {
    if (n.id === 'LIVE-DIA1') return step >= 7 ? 'Incorrect' : ''
    return n.label === 'Diagnosis' ? String(n.props.status ?? '') : ''
  }

  function renderNode(n: GraphNode, animate: boolean) {
    const inner = (
      <>
        {statusOf(n) && <circle className="g-node-ring" r={R + 5} />}
        <circle className="g-node-dot" r={R} fill={NODE_COLORS[n.label]} />
        <text className="g-node-label" y={R + 18} textAnchor="middle">{n.title}</text>
        <text className="g-node-type" y={R + 32} textAnchor="middle">{n.label}</text>
      </>
    )
    return (
      <g
        key={n.id}
        className="g-node"
        data-label={n.label}
        data-status={statusOf(n)}
        data-selected={selectedId === n.id}
        transform={`translate(${n.x},${n.y})`}
        onClick={(e) => {
          e.stopPropagation()
          setSelected(n.id)
        }}
      >
        {animate ? <g className="g-enter">{inner}</g> : inner}
      </g>
    )
  }

  function renderEdge(e: GraphEdge, sx: number, sy: number, tx: number, ty: number, live: boolean) {
    const mx = (sx + tx) / 2
    const my = (sy + ty) / 2
    return (
      <g key={`${e.source}-${e.target}`} className={'g-edge' + (live ? ' g-edge-live' : '')} data-type={e.type}>
        <line className="g-edge-line" x1={sx} y1={sy} x2={tx} y2={ty} />
        <text className="g-edge-label" x={mx} y={my} textAnchor="middle" dominantBaseline="middle">{e.type}</text>
      </g>
    )
  }

  return (
    <div className="kg-wrap">
      <div className="kg-legend">
        {NODE_LABELS.map((l) => (
          <div key={l} className="kg-legend-row">
            <span className="kg-legend-dot" style={{ background: NODE_COLORS[l] }} />
            {l}
          </div>
        ))}
      </div>

      <svg
        className="kg-svg"
        viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
        preserveAspectRatio="xMidYMid meet"
        onClick={() => setSelected(null)}
      >
        {/* historical graph — recedes (shrinks + tucks left) once the live build starts */}
        <g
          className="kg-historical"
          data-recede={receded}
          style={{
            transform: receded ? `translate(${RECEDE.tx}px, ${RECEDE.ty}px) scale(${RECEDE.s})` : 'none',
            transformBox: 'view-box',
            transformOrigin: '0 0',
            transition: 'transform 700ms ease, opacity 700ms ease',
          }}
        >
          <g>{histEdges.map((e) => renderEdge(e, byId[e.source].x, byId[e.source].y, byId[e.target].x, byId[e.target].y, false))}</g>
          <g>{histNodes.map((n) => renderNode(n, false))}</g>
        </g>

        {/* live incident — full scale, on top. Tether edge starts from the receded symptom. */}
        <g className="kg-live">
          <g>
            {liveEdges.map((e) => {
              const s = e.source === 'SYM-001' ? SYM_RECEDED : byId[e.source]
              const t = byId[e.target]
              return renderEdge(e, s.x, s.y, t.x, t.y, true)
            })}
          </g>
          <g>{liveNodes.map((n) => renderNode(n, true))}</g>
        </g>
      </svg>

      {selected && (
        <div className="kg-inspector">
          <div className="kg-inspector-head">
            <span className="kg-inspector-chip" style={{ background: NODE_COLORS[selected.label] }}>
              {selected.label}
            </span>
            <span className="kg-inspector-id">{selected.id}</span>
            <button className="kg-inspector-close" onClick={() => setSelected(null)} aria-label="Close">×</button>
          </div>
          <div className="kg-inspector-title">{selected.title}</div>
          <dl className="kg-inspector-props">
            {Object.entries(selected.props).map(([k, v]) => (
              <div className="kg-inspector-prop" key={k}>
                <dt>{k}</dt>
                <dd>{formatVal(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}
