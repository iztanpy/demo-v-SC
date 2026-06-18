import { useP2, TOTAL_STEPS } from './store'
import { STEPS } from './data/steps'
import { Rail } from './components/Rail'
import { AgentSidebar } from './components/AgentSidebar'
import { KGHero } from './components/KGHero'

export default function App() {
  const step = useP2((s) => s.step)
  const next = useP2((s) => s.next)
  const back = useP2((s) => s.back)
  const restart = useP2((s) => s.restart)
  const copy = STEPS[step - 1]

  return (
    <div id="p2-stage">
      <header id="p2-topbar">
        <span className="p2-brand-dot" />
        <div>
          <div className="p2-title">Hyperspace OS · Behind the Scenes</div>
          <div className="p2-sub">INC-2026-0537 · JRG-CCGT-1 · Block 2 · BFP-3A</div>
        </div>
        <span className="p2-spacer" />
        <span id="p2-counter">{step} / {TOTAL_STEPS}</span>
      </header>

      <main id="p2-grid">
        <Rail step={step} />
        <section id="p2-kg-hero">
          <KGHero />
        </section>
        <AgentSidebar activeAgents={copy.activeAgents} live={copy.live} />
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
