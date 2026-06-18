import { useP2, TOTAL_STEPS } from './store'
import { Rail } from './components/Rail'
import { AgentSidebar } from './components/AgentSidebar'
import { KGHero } from './components/KGHero'
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

  const showLeft = leftOpen && !focusGraph
  const showRight = rightOpen && !focusGraph

  return (
    <div id="p2-stage">
      <header id="p2-topbar">
        <span className="p2-brand-dot" />
        <div>
          <div className="p2-title">Hyperspace OS · Behind the Scenes</div>
          <div className="p2-sub">A week of BFP NDE-vibration incidents · 3 closed · knowledge graph SYM-001</div>
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
          <KGHero />
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
