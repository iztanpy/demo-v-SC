import { useState, useEffect } from 'react'
import { STEPS, TOTAL_STEPS } from '../data/steps'
import { useP2 } from '../store'
import { IncidentInbox } from './IncidentInbox'

// Left pane = a tabbed panel: Story (step narration) | Incident inbox (the week's documents).
export function Rail({ step }: { step: number }) {
  const copy = STEPS[step - 1]
  const toggleLeft = useP2((s) => s.toggleLeft)
  const [tab, setTab] = useState<'story' | 'inbox'>('story')

  // auto-show the inbox when the week's incidents arrive + parse (steps 2–3); manual after
  useEffect(() => {
    if (step === 2 || step === 3) setTab('inbox')
    else setTab('story')
  }, [step])

  return (
    <aside id="p2-rail">
      <div className="p2-left-tabs">
        <button className="p2-tab" data-on={tab === 'story'} onClick={() => setTab('story')}>Story</button>
        <button className="p2-tab" data-on={tab === 'inbox'} onClick={() => setTab('inbox')}>Incident inbox</button>
        <button className="p2-drawer-btn" onClick={toggleLeft} title="Collapse">‹</button>
      </div>

      {tab === 'story' ? (
        <div className="p2-left-body p2-story">
          <div id="p2-step-narration">
            <span className="p2-step-num">STEP {copy.n} / {TOTAL_STEPS}</span>
            <h2 className="p2-step-title">{copy.title}</h2>
            <div className="p2-step-goal">goal · {copy.goal}</div>
            <p className="p2-step-body">{copy.body}</p>
          </div>
          <div className="p2-rail-bottom">
            <div id="p2-step-dots">
              {STEPS.map((s) => (
                <span
                  key={s.n}
                  className={'p2-dot' + (s.n === step ? ' p2-dot-current' : s.n < step ? ' p2-dot-done' : '')}
                />
              ))}
            </div>
            <div className="p2-mantra">
              documents in · patterns found · edits proposed · human approves
            </div>
          </div>
        </div>
      ) : (
        <div className="p2-left-body">
          <IncidentInbox />
        </div>
      )}
    </aside>
  )
}
