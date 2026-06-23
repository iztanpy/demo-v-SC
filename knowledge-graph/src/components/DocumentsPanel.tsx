import { useEffect, useRef, useState } from 'react'
import { FEED, INCIDENTS, DOC_KIND_LABEL, INCIDENT_COLOR } from '../data/feed'
import { useDemo } from '../demoStore'
import { useFeed, type FeedPhase } from '../useFeed'

// Panel ① — Documents. Pure extraction. Each incident is ONE compact workflow-trace row; while it's
// being parsed it auto-expands to stream its related docs (service report, work order, notes, call)
// as nested sub-items, then collapses back to a tidy row when done. Click any row to re-open it.
const isWorking = (p: FeedPhase) => p === 'parsing' || p === 'extracting'

export function DocumentsPanel() {
  const started = useDemo((s) => s.started)
  const runId = useDemo((s) => s.runId)
  const phases = useFeed(started, runId)

  const [open, setOpen] = useState(true) // panel collapse/expand
  const [manual, setManual] = useState<Record<string, boolean>>({}) // per-incident expand override
  useEffect(() => { setManual({}); setOpen(true) }, [runId]) // reset on a new run

  const doneCount = FEED.filter((d) => phases.get(d.id) === 'done').length
  const allDone = started && doneCount === FEED.length
  const active = started && !allDone

  const groups = INCIDENTS.map((inc) => ({
    inc,
    root: FEED.find((d) => d.incident === inc.id && d.root),
    children: FEED.filter((d) => d.incident === inc.id && !d.root),
  }))

  // an incident auto-expands while any of its docs is actively parsing; manual click overrides
  const incWorking = (incId: string) => FEED.some((d) => d.incident === incId && isWorking(phases.get(d.id) ?? 'pending'))
  const isExpanded = (incId: string) => manual[incId] ?? incWorking(incId)
  const toggle = (incId: string) => setManual((m) => ({ ...m, [incId]: !isExpanded(incId) }))

  // pin the stream to the bottom on every phase change so the actively-parsing card stays in view
  const streamRef = useRef<HTMLDivElement>(null)
  const phaseSig = FEED.map((d) => phases.get(d.id) ?? 'p').join('')
  useEffect(() => {
    const el = streamRef.current
    if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
  }, [phaseSig])

  return (
    <section className="p-panel p-docs" data-active={active} data-collapsed={!open}>
      <header className="p-panel-head" onClick={() => setOpen((o) => !o)}>
        <span className="p-panel-num">1</span>
        <span className="p-panel-title">Documents</span>
        <span className="p-panel-sub">{!started ? 'waiting' : active ? 'extraction · JRG-CCGT-1' : 'all parsed ✓'}</span>
        {started && <span className="p-panel-count">{doneCount}/{FEED.length}</span>}
        <span className="p-caret" data-open={open}>▾</span>
      </header>

      {open && started && (
        <div className="p-doc-stream" ref={streamRef}>
          {groups.map(({ inc, root, children }) => {
            if (!root) return null
            const rootPhase = phases.get(root.id) ?? 'pending'
            if (rootPhase === 'pending') return null // workflow trace not arrived yet → no card
            const color = INCIDENT_COLOR[inc.id]
            const expanded = isExpanded(inc.id)
            const docs = [root, ...children]
            const doneDocs = docs.filter((d) => phases.get(d.id) === 'done').length
            const working = incWorking(inc.id)
            const subs = children.filter((c) => (phases.get(c.id) ?? 'pending') !== 'pending')
            return (
              <div key={inc.id} className="p-wf-card" data-outcome={inc.outcome} style={{ borderLeftColor: color, ['--inc' as string]: color }}>
                <div className="p-wf-head" onClick={() => toggle(inc.id)}>
                  <span className="p-doc-entry" style={{ background: color }}>workflow</span>
                  <span className="p-doc-incident" style={{ color }}>{inc.id} · {inc.asset}</span>
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
                      <div className="p-doc-extract">
                        <span className="p-doc-field">{root.field}</span>
                        <span className="p-doc-value">{root.value}</span>
                      </div>
                    )}

                    {subs.length > 0 && (
                      <div className="p-wf-subs">
                        {subs.map((c) => {
                          const ph = phases.get(c.id) ?? 'pending'
                          return (
                            <div key={c.id} className="p-sub" data-phase={ph}>
                              <div className="p-sub-top">
                                <span className="p-sub-kind">{DOC_KIND_LABEL[c.kind]}</span>
                                {ph === 'done' && <span className="p-doc-tick">✓</span>}
                              </div>
                              {isWorking(ph) && (
                                <div className="p-reveal">
                                  <span className="p-dots"><span /><span /><span /></span>
                                  <span className="p-reveal-msg"><span className="p-agent">{c.agent}</span> · {ph === 'parsing' ? 'parsing…' : 'extracting…'}</span>
                                </div>
                              )}
                              {ph === 'done' && (
                                <div className="p-doc-extract">
                                  <span className="p-doc-field">{c.field}</span>
                                  <span className="p-doc-value">{c.value}</span>
                                </div>
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
