import { useEffect } from 'react'
import { useP2, TOTAL_STEPS } from './store'
import { Rail } from './components/Rail'
import { AgentSidebar } from './components/AgentSidebar'
import { KGForce } from './components/KGForce'
import { RationaleDossier } from './components/RationaleDossier'
import { APPROVE_STEP } from './data/incidents'

export default function App() {
  const step = useP2((s) => s.step)
  const next = useP2((s) => s.next)
  const back = useP2((s) => s.back)
  const restart = useP2((s) => s.restart)
  const leftOpen = useP2((s) => s.leftOpen)
  const rightOpen = useP2((s) => s.rightOpen)
  const focusGraph = useP2((s) => s.focusGraph)
  const toggleLeft = useP2((s) => s.toggleLeft)
  const toggleRight = useP2((s) => s.toggleRight)
  const toggleFocus = useP2((s) => s.toggleFocus)
  const approvedBatches = useP2((s) => s.approvedBatches)

  const showLeft = leftOpen && !focusGraph
  const showRight = rightOpen && !focusGraph

  // Steps 2–3 are the incident-inbox beats — open the left pane if it was collapsed so the inbox
  // shows (Rail's own effect then selects the inbox tab once it mounts). Step 4 leaves the inbox
  // behind for the graph beats, so collapse it again.
  useEffect(() => {
    if ((step === 2 || step === 3) && !leftOpen) useP2.setState({ leftOpen: true })
    else if (step === 4 && leftOpen) useP2.setState({ leftOpen: false })
  }, [step])

  // Step 8 is the approval beat — open the right panel (the dossier) if it was collapsed, then
  // close it again once the reviewer has approved both batches (approval completed).
  useEffect(() => {
    if (step !== APPROVE_STEP) return
    if (approvedBatches >= 2) { if (rightOpen) useP2.setState({ rightOpen: false }) }
    else if (!rightOpen) useP2.setState({ rightOpen: true })
  }, [step, approvedBatches])

  return (
    <div id="p2-stage">
      <header id="p2-topbar">
        <span className="p2-brand-dot" />
        <div>
          <div className="p2-title">Sembcorp Knowledge Graph</div>
        </div>
        <span className="p2-spacer" />
        <button className="p2-focus-toggle" data-on={focusGraph} onClick={toggleFocus}>
          {focusGraph ? '↙ Exit focus' : '⤢ Focus graph'}
        </button>
        <span id="p2-counter">{step} / {TOTAL_STEPS}</span>
      </header>

      <main
        id="p2-grid"
        style={{ gridTemplateColumns: `${showLeft ? '300px' : '26px'} 1fr ${showRight ? '400px' : '26px'}` }}
      >
        {showLeft ? (
          <Rail step={step} />
        ) : (
          <button className="p2-reopen" onClick={focusGraph ? toggleFocus : toggleLeft} title="Open story">›</button>
        )}

        <section id="p2-kg-hero">
          <KGForce />
        </section>

        {showRight ? (
          step === APPROVE_STEP ? <RationaleDossier /> : <AgentSidebar />
        ) : (
          <button className="p2-reopen" onClick={focusGraph ? toggleFocus : toggleRight} title="Open agents">‹</button>
        )}
      </main>

      <footer id="p2-nav">
        <button className="p2-btn" onClick={back} disabled={step === 1}>
          ◂ Back
        </button>
        <span className="p2-nav-spacer" />
        {step === TOTAL_STEPS && (
          <button className="p2-btn" onClick={restart}>
            ↺ Restart
          </button>
        )}
        <button className="p2-btn p2-btn-primary" onClick={next} disabled={step === TOTAL_STEPS}>
          Next ▸
        </button>
      </footer>
    </div>
  )
}
