import { Fragment, useEffect, useRef, useState } from 'react'
import { FEED, INCIDENTS, DOC_KIND_COLOR, INCIDENT_COLOR, type DocKind } from '../data/feed'
import { useDemo } from '../demoStore'
import { useFeed, type FeedPhase } from '../useFeed'

// Panel ① — Documents. Pure extraction. Each incident is ONE compact workflow-trace row; while it's
// being parsed it auto-expands to stream its related docs (service report, work order, notes, call)
// as nested sub-items, then collapses back to a tidy row when done. Click any row to re-open it.
const isWorking = (p: FeedPhase) => p === 'parsing' || p === 'extracting'

// per-kind line icon (stroked in the kind colour) — gives each document type a visual identity
const KIND_PATH: Record<DocKind, string> = {
  'service-report': 'M6 2.5h6.5L17 7v14.5H6zM12 2.5V7h5M8.5 12h6M8.5 15h4',
  'workflow-trace': 'M2.5 12h4l2.5-7 3.5 14 2.5-7h4',
  'work-order': 'M5 3.5h10v17H5zM8 3.5V6h4V3.5M8 11h4M8 14.5h3',
  notes: 'M3.5 20.5l4-1L19 8l-3-3L4.5 16.5zM14 7l3 3',
  call: 'M5 3.5h3.5l1.8 4.5-2.7 1.8a11 11 0 0 0 4.8 4.8l1.8-2.7 4.5 1.8V17a2.5 2.5 0 0 1-2.7 2.5A15.5 15.5 0 0 1 2.5 6.2 2.5 2.5 0 0 1 5 3.5z',
  comment: 'M3.5 4.5h17v11H8.5l-4 4z',
  diagnosis: 'M3.5 8h13l-3.5-3.5M20.5 16h-13l3.5 3.5',
}
function DocIcon({ kind }: { kind: DocKind }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={KIND_PATH[kind]} />
    </svg>
  )
}

// INC-0537 is the hero (the exception). It stays expanded so its document stream is the focus;
// every other (reaffirm) incident stays compact and just shows its done/total count ticking up.
const FOCUS_INCIDENT = 'INC-0537'

export function DocumentsPanel() {
  const runId = useDemo((s) => s.runId)
  const run = useDemo((s) => s.sectionRun.docs)
  const folded = useDemo((s) => s.sectionFolded.docs)
  const toggleFold = useDemo((s) => s.toggleFold)
  const phases = useFeed(run, runId)
  const expanded = !folded

  const [manual, setManual] = useState<Record<string, boolean>>({}) // per-incident expand override
  useEffect(() => { setManual({}) }, [runId]) // reset on a new run

  const doneCount = FEED.filter((d) => phases.get(d.id) === 'done').length
  const allDone = run && doneCount === FEED.length
  const active = run && !allDone

  const groups = INCIDENTS.map((inc) => ({
    inc,
    root: FEED.find((d) => d.incident === inc.id && d.root),
    children: FEED.filter((d) => d.incident === inc.id && !d.root),
  }))

  // only the focus incident (INC-0537) is expanded by default; the rest stay compact. A manual
  // click still overrides either way (presenter can open a reaffirm if asked).
  const incWorking = (incId: string) => FEED.some((d) => d.incident === incId && isWorking(phases.get(d.id) ?? 'pending'))
  const isExpanded = (incId: string) => manual[incId] ?? (incId === FOCUS_INCIDENT)
  const toggle = (incId: string) => setManual((m) => ({ ...m, [incId]: !isExpanded(incId) }))

  const streamRef = useRef<HTMLDivElement>(null)

  return (
    <section className="p-panel p-docs" data-active={run} data-folded={folded}>
      <header className="p-panel-head" onClick={() => toggleFold('docs')}>
        <span className="p-panel-num">1</span>
        <span className="p-panel-title">Multi-agent knowledge extraction</span>
        <span className="p-panel-sub">{!run ? 'waiting' : active ? 'extraction · NGT-CCGT-1' : 'all parsed ✓'}</span>
        {run && <span className="p-panel-count">{doneCount}/{FEED.length}</span>}
        <span className="p-caret" data-open={expanded}>▾</span>
      </header>

      {expanded && run && (
        <div className="p-doc-stream" ref={streamRef}>
          {groups.map(({ inc, root, children }) => {
            if (!root) return null
            const rootPhase = phases.get(root.id) ?? 'pending'
            if (rootPhase === 'pending') return null // workflow trace not arrived yet → no card
            const color = INCIDENT_COLOR[inc.id]
            // focus incident (INC-0537): all nested doc cards take the outer orange; others keep per-type colors
            const kColor = (k: DocKind) => (inc.id === FOCUS_INCIDENT ? color : DOC_KIND_COLOR[k])
            const expanded = isExpanded(inc.id)
            const docs = [root, ...children]
            const doneDocs = docs.filter((d) => phases.get(d.id) === 'done').length
            const working = incWorking(inc.id)
            const subs = children.filter((c) => (phases.get(c.id) ?? 'pending') !== 'pending')
            return (
              <div key={inc.id} className="p-wf-card" data-outcome={inc.outcome} style={{ borderLeftColor: color, ['--inc' as string]: color }}>
                <div className="p-wf-head" onClick={() => toggle(inc.id)}>
                  <span className="p-doc-entry" style={{ background: color }}>incident</span>
                  <span className="p-doc-incident" style={{ color }}>{inc.id}</span>
                  <span className="p-doc-docs">{doneDocs}/{docs.length}</span>
                  {working
                    ? <span className="p-doc-spin"><span className="p-dots"><span /><span /><span /></span></span>
                    : doneDocs === docs.length && <span className="p-doc-tick">✓</span>}
                  <span className="p-wf-caret" data-open={expanded}>▾</span>
                </div>

                {expanded && (
                  <>
                    {isWorking(rootPhase) && (
                      <div className="p-reveal">
                        <span className="p-dots"><span /><span /><span /></span>
                        <span className="p-reveal-msg"><span className="p-agent">{root.agent}</span> · {rootPhase === 'parsing' ? 'parsing…' : 'extracting…'}</span>
                      </div>
                    )}
                    {rootPhase === 'done' && (
                      <div className="p-doc-extract" style={{ ['--k' as string]: kColor(root.kind) }}>
                        {root.journey && allDone ? (
                          <>
                            <span className="p-doc-field">{root.field}</span>
                            <div className="p-journey">
                              {root.journey.map((j, i) => (
                                <Fragment key={j.label}>
                                  <span className="p-journey-chip" data-tone={j.tone}>
                                    <span className="p-journey-dx">{j.label}</span>
                                    <span className="p-journey-tag">{j.tag}</span>
                                  </span>
                                  {i < root.journey!.length - 1 && <span className="p-journey-arrow">→</span>}
                                </Fragment>
                              ))}
                            </div>
                          </>
                        ) : root.journey ? (
                          <>
                            <span className="p-doc-field">{root.field}</span>
                            <span className="p-doc-value p-doc-pending">Compiling test path — awaiting full analysis<span className="p-dots"><span /><span /><span /></span></span>
                          </>
                        ) : (
                          <div className="p-finding"><span className="p-finding-k">{root.field}</span>{root.value}</div>
                        )}
                      </div>
                    )}
                    {subs.length > 0 && (
                      <div className="p-wf-subs">
                        {subs.map((c) => {
                          const ph = phases.get(c.id) ?? 'pending'
                          return (
                            <div key={c.id} className="p-sub" data-phase={ph} data-kind={c.kind} style={{ ['--k' as string]: kColor(c.kind) }}>
                              <div className="p-sub-top">
                                <span className="p-sub-icon"><DocIcon kind={c.kind} /></span>
                                <span className="p-sub-kind">{c.label}</span>
                                {isWorking(ph) && <span className="p-doc-spin"><span className="p-dots"><span /><span /><span /></span></span>}
                                {ph === 'done' && <span className="p-sub-prov">via {c.agent}{c.source ? ` · ${c.source}` : ''}</span>}
                                {ph === 'done' && <span className="p-doc-tick">✓</span>}
                              </div>
                              {isWorking(ph) && (
                                <div className="p-reveal">
                                  <span className="p-reveal-msg"><span className="p-agent">{c.agent}</span> · {ph === 'parsing' ? 'parsing…' : 'extracting…'}</span>
                                </div>
                              )}
                              {ph === 'done' && c.extras && c.extras.map((x) => (
                                <div key={x.k} className="p-finding"><span className="p-finding-k">{x.k}</span>{x.v}</div>
                              ))}
                              {ph === 'done' && (
                                <>
                                  {(c.field || c.value) && <div className="p-finding"><span className="p-finding-k">{c.field}</span>{c.value}</div>}
                                  {c.rationale && <div className="p-doc-rationale">Rationale · {c.rationale}</div>}
                                </>
                              )}
                              {(isWorking(ph) || ph === 'done') && c.steps && (
                                <div className="p-wf-steplist">
                                  {c.steps.map((s) => {
                                    const full = s.done >= s.total
                                    return (
                                      <div key={s.label} className="p-wf-step" data-full={full}>
                                        <span className="p-wf-step-mark">{full ? '✓' : '◐'}</span>
                                        <span className="p-wf-step-label">{s.label}</span>
                                        <span className="p-wf-step-bar">
                                          {Array.from({ length: s.total }).map((_, i) => (
                                            <span key={i} className="p-wf-step-seg" data-on={i < s.done} />
                                          ))}
                                        </span>
                                        <span className="p-wf-step-count">{s.done}/{s.total}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              {ph === 'done' && c.recommendation && (
                                <div className="p-finding p-finding-rec"><span className="p-finding-k">Recommendation</span>{c.recommendation.label}</div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
