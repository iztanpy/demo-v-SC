import { useEffect, useRef } from 'react'
import { FEED, INCIDENTS, DOC_KIND_LABEL, INCIDENT_COLOR } from '../data/feed'
import { useDemo } from '../demoStore'
import { useFeed, type FeedPhase } from '../useFeed'

// Panel ① — Documents. Pure extraction. Each incident is ONE workflow-trace card (the entry doc);
// as it's parsed, its related documents (service report, work order, notes, call) stream in
// NESTED inside it as sub-items, each running its own parse theater.
const isWorking = (p: FeedPhase) => p === 'parsing' || p === 'extracting'

export function DocumentsPanel() {
  const started = useDemo((s) => s.started)
  const runId = useDemo((s) => s.runId)
  const phases = useFeed(started, runId)

  const doneCount = FEED.filter((d) => phases.get(d.id) === 'done').length
  // open while extracting; fully close once every document is parsed
  const active = started && doneCount < FEED.length

  const groups = INCIDENTS.map((inc) => ({
    inc,
    root: FEED.find((d) => d.incident === inc.id && d.root),
    children: FEED.filter((d) => d.incident === inc.id && !d.root),
  }))

  // pin the stream to the bottom on every phase change (arrival, parsing, done all grow height)
  const streamRef = useRef<HTMLDivElement>(null)
  const phaseSig = FEED.map((d) => phases.get(d.id) ?? 'p').join('')
  useEffect(() => {
    const el = streamRef.current
    if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
  }, [phaseSig])

  return (
    <section className="p-panel p-docs" data-active={active}>
      <header className="p-panel-head">
        <span className="p-panel-num">1</span>
        <span className="p-panel-title">Documents</span>
        <span className="p-panel-sub">{!started ? 'waiting — press Run the week' : active ? 'extraction · JRG-CCGT-1' : 'all documents parsed ✓'}</span>
        {started && <span className="p-panel-count">{doneCount}/{FEED.length}</span>}
      </header>

      {active && (
        <div className="p-doc-stream" ref={streamRef}>
          {groups.map(({ inc, root, children }) => {
            if (!root) return null
            const rootPhase = phases.get(root.id) ?? 'pending'
            if (rootPhase === 'pending') return null // workflow trace not arrived yet → no card
            const color = INCIDENT_COLOR[inc.id]
            const subs = children.filter((c) => (phases.get(c.id) ?? 'pending') !== 'pending')
            return (
              <div key={inc.id} className="p-wf-card" data-outcome={inc.outcome} style={{ borderLeftColor: color, ['--inc' as string]: color }}>
                <div className="p-wf-head">
                  <span className="p-doc-entry" style={{ background: color }}>workflow</span>
                  <span className="p-doc-kind">{root.label}</span>
                  <span className="p-doc-incident" style={{ color }}>{inc.id} · {inc.asset}</span>
                  {rootPhase === 'done' && <span className="p-doc-tick">✓</span>}
                </div>
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
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
