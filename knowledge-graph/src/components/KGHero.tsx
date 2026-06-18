import { useState } from 'react'
import { NODES, EDGES, VIEWBOX, NODE_COLORS, NODE_LABELS } from '../data/graph'
import type { PropVal } from '../types'

// R1/R2 — static circular typed-graph render (Neo4j-Bloom style) + click-to-inspect.
// Nodes = type-coloured circles; Diagnosis nodes carry a status ring (Incorrect = dashed red ·
// Confirmed = solid green). Edges carry their relationship type; CORRECTED_BY is emphasised.
// Clicking a node opens the floating Inspector with its full cypher properties.
const R = 30

const byId = Object.fromEntries(NODES.map((n) => [n.id, n]))

function formatVal(v: PropVal): string {
  if (Array.isArray(v)) return v.join(' · ')
  if (typeof v === 'boolean') return v ? '✓ yes' : '✗ no'
  return String(v)
}

export function KGHero() {
  const [selectedId, setSelected] = useState<string | null>(null)
  const selected = selectedId ? byId[selectedId] : null

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
        {/* edges (under nodes) */}
        <g>
          {EDGES.map((e) => {
            const s = byId[e.source]
            const t = byId[e.target]
            if (!s || !t) return null
            const mx = (s.x + t.x) / 2
            const my = (s.y + t.y) / 2
            return (
              <g key={`${e.source}-${e.target}`} className="g-edge" data-type={e.type}>
                <line className="g-edge-line" x1={s.x} y1={s.y} x2={t.x} y2={t.y} />
                <text className="g-edge-label" x={mx} y={my} textAnchor="middle" dominantBaseline="middle">
                  {e.type}
                </text>
              </g>
            )
          })}
        </g>

        {/* nodes */}
        <g>
          {NODES.map((n) => {
            const status = n.label === 'Diagnosis' ? String(n.props.status ?? '') : ''
            return (
              <g
                key={n.id}
                className="g-node"
                data-label={n.label}
                data-status={status}
                data-selected={selectedId === n.id}
                transform={`translate(${n.x},${n.y})`}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelected(n.id)
                }}
              >
                {status && <circle className="g-node-ring" r={R + 5} />}
                <circle className="g-node-dot" r={R} fill={NODE_COLORS[n.label]} />
                <text className="g-node-label" y={R + 18} textAnchor="middle">
                  {n.title}
                </text>
                <text className="g-node-type" y={R + 32} textAnchor="middle">
                  {n.label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {selected && (
        <div className="kg-inspector">
          <div className="kg-inspector-head">
            <span className="kg-inspector-chip" style={{ background: NODE_COLORS[selected.label] }}>
              {selected.label}
            </span>
            <span className="kg-inspector-id">{selected.id}</span>
            <button className="kg-inspector-close" onClick={() => setSelected(null)} aria-label="Close">
              ×
            </button>
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
