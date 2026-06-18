import { useState } from 'react'
import { NODES, EDGES, VIEWBOX, NODE_COLORS, NODE_LABELS, COL_HEADERS, DENSE_TRANSFORM } from '../data/graph'
import type { GraphNode, GraphEdge, PropVal } from '../types'
import { INCIDENTS, PATTERN_ROWS, GAPS, CHANGES, APPROVE_STEP } from '../data/incidents'
import { STEPS } from '../data/steps'
import { useStepTimeline } from '../useStepTimeline'
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
  const [ctxExpanded, setCtxExpanded] = useState<Record<string, boolean>>({})
  const selected = selectedId ? byId[selectedId] : null

  // "agents working" gate for the centre panel (steps 4–6): while the step's skill(s) still
  // pulse, show the reveal-dots theater; reveal the result once they're done.
  const { done } = useStepTimeline(step)
  const stepSkills = (STEPS[step - 1]?.sequence ?? []).flatMap((b) => b.skills.map((s) => s.id))
  const panelWorking = step >= 4 && step <= 6 && stepSkills.length > 0 && !stepSkills.every((id) => done.has(id))
  const toggleCtx = (id: string) => setCtxExpanded((p) => ({ ...p, [id]: !p[id] }))
  // a proposed element's batch is applied once we're past the approval step, OR at the
  // approval step and the reviewer has run that many batches in the dossier.
  const batchApplied = (b?: number) =>
    step > APPROVE_STEP ? true : step < APPROVE_STEP ? false : approvedBatches >= (b ?? 1)
  const allApplied = batchApplied(2)

  const edgeKey = (e: GraphEdge) => `${e.source}__${e.target}__${e.type}`
  const selEdge = selEdgeKey ? EDGES.find((e) => edgeKey(e) === selEdgeKey) ?? null : null
  const clearSel = () => { setSelected(null); setSelEdgeKey(null) }

  // A proposed element appears at its proposeStep — but on the proposeStep itself it waits for
  // the "Drafting changes…" theater to finish, so it mounts (and draws/pops in) AFTER the agent
  // drafts, not the instant the page opens. Fresh mount = the CSS draw-on / create animation fires.
  const proposedReady = (ps?: number) => step > (ps ?? 99) || (step === (ps ?? 99) && !panelWorking)
  const nodeVisible = (n: GraphNode) => n.state !== 'proposed' || proposedReady(n.proposeStep)
  const edgeVisible = (e: GraphEdge) => e.state !== 'proposed' || proposedReady(e.proposeStep)
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
    // proposed edges draw on dotted via a per-edge mask (solid wipe reveals the dotted line)
    const drawing = eState === 'proposed'
    const maskId = `draw-${edgeKey(e)}`
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
        {drawing && (
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="3000" height="2000">
            <path className="kg-draw-wipe" d={d} />
          </mask>
        )}
        <path className="g-edge-hit" d={d} />
        <path className="g-edge-line" d={d} mask={drawing ? `url(#${maskId})` : undefined} />
        {label && !e.context && <text className="g-edge-label" x={mx} y={my} textAnchor="middle" dominantBaseline="middle">{label}</text>}
      </g>
    )
  }

  // Gap callouts (step 5) — pin the findings onto the graph: 2 knowledge gaps + 1 shortcut.
  // Gated on the step-5 theater finishing (panelWorking) so the markers only land AFTER the
  // agent "scan" completes, not the instant the page opens.
  function renderGaps() {
    if (step !== 5 || panelWorking) return null
    const casing = byId['RC-CASING-CRACK']
    const phase = byId['DT-PHASE'], bent = byId['RC-BENT-SHAFT']
    const sym = byId['SYM-001'], runout = byId['DT-RUNOUT']
    const emx = (phase.x + bent.x) / 2, emy = (phase.y + bent.y) / 2
    // shortcut preview: a dashed teal curve SYM-001 → DT-RUNOUT (mirrors the SHORTCUT edge that
    // formally draws at step 6) so the "faster path" reads as an actual route, not a floating pill.
    const dx = runout.x - sym.x, dy = runout.y - sym.y, len = Math.hypot(dx, dy) || 1
    const K = 80
    const cx = (sym.x + runout.x) / 2 + (dy / len) * K
    const cy = (sym.y + runout.y) / 2 + (-dx / len) * K
    const scd = `M ${sym.x} ${sym.y} Q ${cx} ${cy} ${runout.x} ${runout.y}`
    const smx = 0.25 * sym.x + 0.5 * cx + 0.25 * runout.x
    const smy = 0.25 * sym.y + 0.5 * cy + 0.25 * runout.y
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
        <path className="kg-gap-shortcut-line" d={scd} markerEnd="url(#kg-gap-arrow)" />
        <g className="kg-gap-shortcut" transform={`translate(${smx},${smy})`}>
          <rect className="kg-gap-pill" data-kind="shortcut" x={-104} y={-16} width={208} height={32} rx={16} />
          <text className="kg-gap-pill-text" data-kind="shortcut" textAnchor="middle" dominantBaseline="central">⤳ faster path · skip triage</text>
        </g>
      </g>
    )
  }

  // Contextual panel (top-right): pattern stack · findings · changeset, by step.
  // While the step's agent is "working", show the reveal-dots theater; then the result reveals.
  function renderContext() {
    if (panelWorking) {
      const titleByStep: Record<number, string> = { 4: 'Synthesizing…', 5: 'Scanning the graph…', 6: 'Drafting changes…' }
      return (
        <div className="kg-context">
          <div className="kg-context-title">{titleByStep[step]}</div>
          <div className="kg-reveal">
            <span className="reveal-dots"><span /><span /><span /></span>
            <span className="reveal-msg">{STEPS[step - 1]?.live}</span>
          </div>
        </div>
      )
    }

    if (step === 4) {
      return (
        <div className="kg-context reveal-in">
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
        <div className="kg-context reveal-in">
          <div className="kg-context-title">Findings · 2 gaps + 1 shortcut</div>
          {GAPS.map((g) => {
            const isExp = !!ctxExpanded[g.id]
            return (
              <div className="kg-inc-chip kg-finding" data-kind={g.kind} key={g.id}>
                <button className="kg-inc-chip-head" data-expanded={isExp} onClick={() => toggleCtx(g.id)}>
                  <span className="kg-inc-chip-caret">▸</span>
                  <span className="kg-inc-chip-text">
                    <span className="kg-inc-chip-value">{g.headline}</span>
                    <span className="kg-finding-ev">{g.evidence}</span>
                  </span>
                </button>
                {isExp && (
                  <div className="kg-inc-detail">
                    <p className="kg-inc-detail-text">{g.detail}</p>
                    <div className="kg-inc-refs">
                      <div className="kg-inc-refs-label">References</div>
                      {g.refs.map((r, i) => <div className="kg-inc-ref" key={i}>{r}</div>)}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    if (step >= 6 && step <= APPROVE_STEP) {
      const lines = CHANGES.filter((c) => step >= c.proposeStep)
      // at step 7 the Validation Critic "runs" (reveal-dots below the list) before the ✓ ticks land
      const validating = step === 7 && stepSkills.length > 0 && !stepSkills.every((id) => done.has(id))
      const validated = step >= 7 && !validating
      const batchLabel: Record<number, string> = { 1: 'Batch 1 · new knowledge', 2: 'Batch 2 · efficiency' }
      const title = allApplied ? 'Changes applied ✓' : step === APPROVE_STEP ? 'Approving…' : 'Proposed KG changes'
      return (
        <div className="kg-context kg-changeset reveal-in" data-applied={allApplied}>
          <div className="kg-context-title">{title}</div>
          {[1, 2].map((b) => {
            const bl = lines.filter((c) => c.batch === b)
            if (!bl.length) return null
            const bApplied = batchApplied(b)
            return (
              <div className="kg-batch" key={b} data-applied={bApplied}>
                <div className="kg-batch-label">{batchLabel[b]}{bApplied ? ' · applied ✓' : ''}</div>
                {bl.map((c) => {
                  const isExp = !!ctxExpanded[c.id]
                  return (
                    <div className="kg-inc-chip kg-change" data-kind={c.kind} key={c.id}>
                      <button className="kg-inc-chip-head" data-expanded={isExp} onClick={() => toggleCtx(c.id)}>
                        <span className="kg-inc-chip-caret">▸</span>
                        <span className="kg-inc-chip-text">
                          <span className="kg-change-headrow">
                            <span className="kg-change-kind" data-kind={c.kind}>{c.kind === 'reweight' ? '~' : c.kind === 'shortcut' ? '⤳' : '+'}</span>
                            <span className="kg-inc-chip-value">{c.label}</span>
                            {(bApplied || validated) && <span className="kg-change-ok">✓</span>}
                          </span>
                          <span className="kg-change-sub">{c.detail}</span>
                        </span>
                      </button>
                      {isExp && (
                        <div className="kg-inc-detail">
                          <p className="kg-inc-detail-text">{c.quote}</p>
                          <div className="kg-inc-refs">
                            <div className="kg-inc-refs-label">References</div>
                            <div className="kg-inc-ref">cites {c.cites.length} incident{c.cites.length > 1 ? 's' : ''} · {c.evidence}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
          {validating && (
            <div className="kg-reveal kg-validating">
              <span className="reveal-dots"><span /><span /><span /></span>
              <span className="reveal-msg">{STEPS[step - 1]?.live}</span>
            </div>
          )}
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
          <defs>
            <marker id="kg-gap-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--teal-header)" />
            </marker>
          </defs>
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
