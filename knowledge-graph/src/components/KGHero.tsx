import { useState } from 'react'
import { NODES, EDGES, VIEWBOX, NODE_COLORS, NODE_LABELS, COL_HEADERS, DENSE_TRANSFORM } from '../data/graph'
import type { GraphNode, GraphEdge, PropVal } from '../types'
import { INCIDENTS, PATTERN_ROWS, GAPS, CHANGES, APPROVE_STEP } from '../data/incidents'
import { useP2 } from '../store'

// One bounded knowledge graph (no incident nodes). Proposed nodes/edges show as dashed
// `PROPOSED · not applied` previews from their proposeStep and only SOLIDIFY once a human
// approves at APPROVE_STEP (8). Incidents live OUTSIDE the graph (left-pane inbox tab).
const R = 30
const byId = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<string, GraphNode>

// edge-type → chip colour for the edge inspector
const EDGE_COLOR: Record<string, string> = {
  CONFIRMS: '#00A651', RULES_OUT: '#64748B', FOLLOW_UP: '#2563EB', TRIGGERS: '#F59E0B', OCCURS_IN: '#64748B', INCONCLUSIVE: '#7C3AED', SHORTCUT: '#00A5A8',
}

function formatVal(v: PropVal): string {
  if (Array.isArray(v)) return v.join(' · ')
  if (typeof v === 'boolean') return v ? '✓ yes' : '✗ no'
  return String(v)
}

function edgeLabel(e: GraphEdge, prob: number | undefined): string {
  switch (e.type) {
    case 'CONFIRMS': return prob != null ? prob.toFixed(2) : ''
    case 'RULES_OUT': return 'rules out'
    case 'TRIGGERS': return `▸ ${e.order}`
    case 'FOLLOW_UP': return e.result ?? 'if inconclusive'
    case 'INCONCLUSIVE': return 'inconclusive'
    case 'SHORTCUT': return 'shortcut ⤳'
    default: return '' // OCCURS_IN
  }
}

export function KGHero() {
  const step = useP2((s) => s.step)
  const focusGraph = useP2((s) => s.focusGraph)
  const approvedBatches = useP2((s) => s.approvedBatches)
  const [selectedId, setSelected] = useState<string | null>(null)
  const [selEdgeKey, setSelEdgeKey] = useState<string | null>(null)
  const selected = selectedId ? byId[selectedId] : null
  // a proposed element's batch is applied once we're past the approval step, OR at the
  // approval step and the reviewer has run that many batches in the dossier.
  const batchApplied = (b?: number) =>
    step > APPROVE_STEP ? true : step < APPROVE_STEP ? false : approvedBatches >= (b ?? 1)
  const allApplied = batchApplied(2)

  const edgeKey = (e: GraphEdge) => `${e.source}__${e.target}__${e.type}`
  const selEdge = selEdgeKey ? EDGES.find((e) => edgeKey(e) === selEdgeKey) ?? null : null
  const clearSel = () => { setSelected(null); setSelEdgeKey(null) }

  const nodeVisible = (n: GraphNode) => n.state !== 'proposed' || step >= (n.proposeStep ?? 99)
  const edgeVisible = (e: GraphEdge) => e.state !== 'proposed' || step >= (e.proposeStep ?? 99)
  const visNodes = NODES.filter(nodeVisible)
  const visEdges = EDGES.filter(edgeVisible)

  function nodeStateAttr(n: GraphNode): string {
    if (n.state === 'proposed') return batchApplied(n.batch) ? 'applied' : 'proposed'
    return 'committed'
  }

  function renderNode(n: GraphNode) {
    const r = n.size ?? (n.tier === 'followup' ? 22 : R)
    return (
      <g
        key={n.id}
        className="g-node"
        data-label={n.label}
        data-tier={n.tier ?? ''}
        data-context={n.context ? 'true' : undefined}
        data-state={nodeStateAttr(n)}
        data-selected={selectedId === n.id}
        transform={`translate(${n.x},${n.y})`}
        onClick={(e) => { e.stopPropagation(); if (!n.context) { setSelected(n.id); setSelEdgeKey(null) } }}
      >
        <circle className="g-node-dot" r={r} fill={NODE_COLORS[n.label]} />
        {!n.context && (
          <>
            <text className="g-node-label" y={r + 16} textAnchor="middle">{n.title}</text>
            <text className="g-node-type" y={r + 30} textAnchor="middle">{n.tier === 'followup' ? 'follow-up test' : n.label}</text>
          </>
        )}
        {n.state === 'proposed' && !batchApplied(n.batch) && (
          <text className="g-node-proposed" y={-r - 10} textAnchor="middle">PROPOSED · not applied</text>
        )}
      </g>
    )
  }

  function renderEdge(e: GraphEdge) {
    const s = byId[e.source], t = byId[e.target]
    // INCONCLUSIVE + SHORTCUT edges curve (quadratic) so they bow clear of the straight lines
    const curved = e.type === 'INCONCLUSIVE' || e.type === 'SHORTCUT'
    let d: string, mx: number, my: number
    if (curved) {
      const dx = t.x - s.x, dy = t.y - s.y, len = Math.hypot(dx, dy) || 1
      const K = 80
      const cx = (s.x + t.x) / 2 + (dy / len) * K
      const cy = (s.y + t.y) / 2 + (-dx / len) * K
      d = `M ${s.x} ${s.y} Q ${cx} ${cy} ${t.x} ${t.y}`
      mx = 0.25 * s.x + 0.5 * cx + 0.25 * t.x
      my = 0.25 * s.y + 0.5 * cy + 0.25 * t.y
    } else {
      d = `M ${s.x} ${s.y} L ${t.x} ${t.y}`
      mx = (s.x + t.x) / 2
      my = (s.y + t.y) / 2
    }
    const isReweight = e.reweightProposeStep != null
    const reweightState = isReweight
      ? batchApplied(e.batch) ? 'applied' : step >= (e.reweightProposeStep ?? 99) ? 'pending' : ''
      : ''
    const prob = isReweight && batchApplied(e.batch) && e.newProbability != null ? e.newProbability : e.probability
    const eState = e.state === 'proposed' ? (batchApplied(e.batch) ? 'applied' : 'proposed') : 'committed'
    const label = edgeLabel(e, prob)
    return (
      <g
        key={edgeKey(e)}
        className="g-edge"
        data-type={e.type}
        data-context={e.context ? 'true' : undefined}
        data-state={eState}
        data-reweight={reweightState}
        data-selected={selEdgeKey === edgeKey(e)}
        onClick={(ev) => { ev.stopPropagation(); setSelEdgeKey(edgeKey(e)); setSelected(null) }}
      >
        <path className="g-edge-hit" d={d} />
        <path className="g-edge-line" d={d} />
        {label && !e.context && <text className="g-edge-label" x={mx} y={my} textAnchor="middle" dominantBaseline="middle">{label}</text>}
      </g>
    )
  }

  // Gap callouts (step 4) — pin the two gaps onto the graph.
  function renderGaps() {
    if (step !== 5) return null
    const casing = byId['RC-CASING-CRACK']
    const phase = byId['DT-PHASE'], bent = byId['RC-BENT-SHAFT']
    const emx = (phase.x + bent.x) / 2, emy = (phase.y + bent.y) / 2
    return (
      <g className="kg-gaps">
        <g transform={`translate(${casing.x},${casing.y})`}>
          <circle className="kg-gap-ghost" r={R} />
          <text className="kg-gap-q" textAnchor="middle" dominantBaseline="central">?</text>
          <text className="kg-gap-label" y={R + 20} textAnchor="middle">no node · 3/3</text>
        </g>
        <g transform={`translate(${emx},${emy})`}>
          <rect className="kg-gap-pill" x={-92} y={-16} width={184} height={32} rx={16} />
          <text className="kg-gap-pill-text" textAnchor="middle" dominantBaseline="central">0.88 · contradicted 3/3</text>
        </g>
      </g>
    )
  }

  // Contextual panel (top-right): pattern stack · gaps · changeset, by step.
  function renderContext() {
    if (step === 4) {
      return (
        <div className="kg-context">
          <div className="kg-context-title">Pattern · 3 incidents</div>
          <table className="kg-pattern">
            <thead>
              <tr><th></th>{INCIDENTS.map((i) => <th key={i.id}>{i.asset}</th>)}</tr>
            </thead>
            <tbody>
              {PATTERN_ROWS.map((row) => (
                <tr key={row.label} className={row.label === 'Confirmed cause' ? 'kg-pattern-key' : ''}>
                  <td className="kg-pattern-rl">{row.label}</td>
                  {row.cells.map((c, i) => <td key={i}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    if (step === 5) {
      return (
        <div className="kg-context">
          <div className="kg-context-title">Gaps found</div>
          {GAPS.map((g) => (
            <div className="kg-gap-row" key={g.id} data-kind={g.kind}>
              <div className="kg-gap-head">{g.headline}</div>
              <div className="kg-gap-ev">{g.evidence}</div>
            </div>
          ))}
        </div>
      )
    }
    if (step >= 6 && step <= APPROVE_STEP) {
      const lines = CHANGES.filter((c) => step >= c.proposeStep)
      const validated = step >= 7
      const batchLabel: Record<number, string> = { 1: 'Batch 1 · new knowledge', 2: 'Batch 2 · efficiency' }
      const title = allApplied ? 'Changes applied ✓' : step === APPROVE_STEP ? 'Approving…' : 'Proposed KG changes'
      return (
        <div className="kg-context kg-changeset" data-applied={allApplied}>
          <div className="kg-context-title">{title}</div>
          {[1, 2].map((b) => {
            const bl = lines.filter((c) => c.batch === b)
            if (!bl.length) return null
            const bApplied = batchApplied(b)
            return (
              <div className="kg-batch" key={b} data-applied={bApplied}>
                <div className="kg-batch-label">{batchLabel[b]}{bApplied ? ' · applied ✓' : ''}</div>
                {bl.map((c) => (
                  <div className="kg-change-row" key={c.id} data-validated={validated} data-applied={bApplied}>
                    <div className="kg-change-head">
                      <span className="kg-change-kind" data-kind={c.kind}>{c.kind === 'reweight' ? '~' : c.kind === 'shortcut' ? '⤳' : '+'}</span>
                      <span className="kg-change-label">{c.label}</span>
                      {(bApplied || validated) && <span className="kg-change-ok">✓</span>}
                    </div>
                    <div className="kg-change-detail">{c.detail}</div>
                    <div className="kg-change-cites">cites {c.cites.length} incident{c.cites.length > 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            )
          })}
          {step === APPROVE_STEP && !allApplied && <div className="kg-applied-note">Review &amp; approve in the dossier →</div>}
          {allApplied && <div className="kg-applied-note">Reliability engineer approved · graph updated in place</div>}
        </div>
      )
    }
    return null
  }

  return (
    <div className="kg-wrap">
      <div className="kg-stage">
        <div className="kg-legend">
          {NODE_LABELS.map((l) => (
            <div key={l} className="kg-legend-row">
              <span className="kg-legend-dot" style={{ background: NODE_COLORS[l] }} />
              {l}
            </div>
          ))}
          <div className="kg-legend-row kg-legend-proposed">
            <span className="kg-legend-dot kg-legend-dot-proposed" />
            Proposed
          </div>
        </div>

        <svg
          className="kg-svg"
          viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
          preserveAspectRatio="xMidYMid meet"
          onClick={clearSel}
        >
          <g
            className="kg-zoom"
            data-zoomed={step >= 2}
            style={{
              transform: step === 1 ? DENSE_TRANSFORM : 'none',
              transformBox: 'view-box',
              transformOrigin: '0 0',
              transition: 'transform 700ms ease',
            }}
          >
            {step >= 2 && (
              <g className="kg-col-headers">
                {COL_HEADERS.map((h) => (
                  <text key={h.label} className="kg-col-header" x={h.x} y={170} textAnchor="middle">{h.label}</text>
                ))}
              </g>
            )}
            <g className="kg-edges">{visEdges.map(renderEdge)}</g>
            <g className="kg-nodes">{visNodes.map(renderNode)}</g>
            {renderGaps()}
          </g>
        </svg>

        {!focusGraph && renderContext()}

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

        {selEdge && (() => {
          const s = byId[selEdge.source], t = byId[selEdge.target]
          const isRw = selEdge.reweightProposeStep != null
          const prob = isRw && batchApplied(selEdge.batch) && selEdge.newProbability != null ? selEdge.newProbability : selEdge.probability
          return (
            <div className="kg-inspector kg-edge-inspector">
              <div className="kg-inspector-head">
                <span className="kg-inspector-chip" style={{ background: EDGE_COLOR[selEdge.type] }}>{selEdge.type}</span>
                <span className="kg-inspector-id">{s.title} → {t.title}</span>
                <button className="kg-inspector-close" onClick={clearSel} aria-label="Close">×</button>
              </div>
              <dl className="kg-inspector-props">
                {selEdge.result && (
                  <div className="kg-inspector-prop"><dt>{selEdge.type === 'FOLLOW_UP' ? 'When to run' : selEdge.type === 'TRIGGERS' ? 'Why first' : 'Test result'}</dt><dd>{selEdge.result}</dd></div>
                )}
                {prob != null && (
                  <div className="kg-inspector-prop"><dt>{selEdge.type === 'RULES_OUT' ? 'Rules out · confidence' : 'Confirms · confidence'}</dt><dd>{prob.toFixed(2)} ({selEdge.band})</dd></div>
                )}
                {isRw && !batchApplied(selEdge.batch) && (
                  <div className="kg-inspector-prop"><dt>Pending re-weight</dt><dd>{selEdge.oldProbability?.toFixed(2)} → {selEdge.newProbability?.toFixed(2)} · awaiting approval</dd></div>
                )}
                {selEdge.order != null && (
                  <div className="kg-inspector-prop"><dt>Suggested order</dt><dd>{selEdge.order}</dd></div>
                )}
              </dl>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
