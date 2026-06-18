import { INCIDENTS, DOC_LABEL, APPROVE_STEP } from '../data/incidents'
import type { DocKind } from '../data/incidents'
import { SKILLS } from '../data/agents'
import { useP2 } from '../store'

// The week's incidents as documents (not graph nodes). Lives in the left-pane "Incident inbox"
// tab. Chips stream in (live parse) once Intake runs at step 3.
const DOCS: DocKind[] = ['report', 'workflow', 'transcript']
const skillName = (id: string) => SKILLS.find((s) => s.id === id)?.name ?? id

export function IncidentInbox() {
  const step = useP2((s) => s.step)
  const approvedBatches = useP2((s) => s.approvedBatches)
  const allApplied = step > APPROVE_STEP || (step === APPROVE_STEP && approvedBatches >= 2)
  const parsed = step >= 3
  const state = step < 2 ? 'incoming' : allApplied ? 'archived' : parsed ? 'parsed' : 'queued'

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
        {INCIDENTS.map((inc, ii) => (
          <div className="kg-inc-card" data-state={state} key={inc.id}>
            <div className="kg-inc-head">{inc.id} · {inc.plant} · {inc.asset}</div>
            <div className="kg-inc-docs">
              {DOCS.map((doc, di) => {
                const chip = inc.chips.find((c) => c.doc === doc)
                return (
                  <div className="kg-inc-doc" key={doc} data-parsed={parsed}>
                    <span className="kg-inc-doc-name">{DOC_LABEL[doc]}</span>
                    {parsed && chip && (
                      <div className="kg-inc-chip" style={{ animationDelay: `${(ii * 3 + di) * 0.16}s` }}>
                        <span className="kg-inc-chip-skill">{skillName(chip.skill)}</span>
                        <span className="kg-inc-chip-text">{chip.text}</span>
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
