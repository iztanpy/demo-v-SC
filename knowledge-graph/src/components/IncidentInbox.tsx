import { useState } from 'react'
import { INCIDENTS, DOC_LABEL, APPROVE_STEP } from '../data/incidents'
import type { DocKind } from '../data/incidents'
import { SKILLS } from '../data/agents'
import { useP2 } from '../store'
import { useDocTimeline, docKey } from '../useDocTimeline'
import type { DocPhase } from '../useDocTimeline'

// The week's incidents as documents (not graph nodes). At step 3 each document is shown being
// worked — reveal-dots theater (ported from app.js): "<Agent> · parsing…/extracting…" — then
// the condensed field·value result slides in with a dropdown for fuller detail + references.
const DOCS: DocKind[] = ['report', 'workflow', 'transcript']
const skillName = (id: string) => SKILLS.find((s) => s.id === id)?.name ?? id

export function IncidentInbox() {
  const step = useP2((s) => s.step)
  const approvedBatches = useP2((s) => s.approvedBatches)
  const livePhases = useDocTimeline(step === 3)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const allApplied = step > APPROVE_STEP || (step === APPROVE_STEP && approvedBatches >= 2)
  const state = step < 2 ? 'incoming' : allApplied ? 'archived' : step >= 3 ? 'parsed' : 'queued'

  const phaseOf = (incId: string, doc: DocKind): DocPhase =>
    step < 3 ? 'queued' : step > 3 ? 'done' : livePhases.get(docKey(incId, doc)) ?? 'queued'

  if (step < 2) {
    return <div className="kg-inbox-empty">Incidents arrive when the week is reviewed (step 2).</div>
  }

  return (
    <div className="kg-inbox" data-state={state}>
      <div className="kg-inbox-label">
        Documents, <em>not</em> graph nodes
        <span className="kg-inbox-state">{state}</span>
      </div>
      <div className="kg-inbox-cards">
        {INCIDENTS.map((inc) => (
          <div className="kg-inc-card" data-state={state} key={inc.id}>
            <div className="kg-inc-head">{inc.id} · {inc.plant} · {inc.asset}</div>
            <div className="kg-inc-docs">
              {DOCS.map((doc) => {
                const chip = inc.chips.find((c) => c.doc === doc)
                const phase = phaseOf(inc.id, doc)
                const working = phase === 'parsing' || phase === 'extracting'
                const key = docKey(inc.id, doc)
                const isExp = !!expanded[key]
                return (
                  <div className="kg-inc-doc" key={doc} data-phase={phase}>
                    <div className="kg-inc-doc-top">
                      <span className="kg-inc-doc-name">{DOC_LABEL[doc]}</span>
                      {phase === 'queued' && <span className="kg-inc-queued">queued</span>}
                      {phase === 'done' && <span className="kg-inc-tick">✓</span>}
                    </div>

                    {working && chip && (
                      <div className="kg-reveal">
                        <span className="reveal-dots"><span /><span /><span /></span>
                        <span className="reveal-msg">
                          <span className="reveal-agent">{skillName(chip.skill)}</span> · {phase === 'parsing' ? 'parsing…' : 'extracting…'}
                        </span>
                      </div>
                    )}

                    {phase === 'done' && chip && (
                      <div className="kg-inc-chip reveal-in">
                        <button className="kg-inc-chip-head" data-expanded={isExp} onClick={() => setExpanded((p) => ({ ...p, [key]: !p[key] }))}>
                          <span className="kg-inc-chip-caret">▸</span>
                          <span className="kg-inc-chip-text">
                            <span className="kg-inc-chip-field">{chip.field}</span>
                            <span className="kg-inc-chip-value">{chip.value}</span>
                          </span>
                        </button>
                        {isExp && (
                          <div className="kg-inc-detail">
                            <p className="kg-inc-detail-text">{chip.detail}</p>
                            <div className="kg-inc-refs">
                              <div className="kg-inc-refs-label">References</div>
                              {chip.refs.map((r, i) => <div className="kg-inc-ref" key={i}>{r}</div>)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
