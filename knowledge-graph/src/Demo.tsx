import { useDemo } from './demoStore'
import { DocumentsPanel } from './components/DocumentsPanel'
import { ResolutionPanel } from './components/ResolutionPanel'
import { NewKnowledgePanel } from './components/NewKnowledgePanel'
// 2D fallback preserved on disk: swap this back to `./components/KGForce` (and <KGForce/>) to revert.
import { KGForce3D } from './components/KGForce3D'
import './demo.css'

// 3-panel concurrent demo shell. Left = the three process panels stacked (Documents → Resolution
// → New Knowledge); right = the knowledge graph hero (the Context Hub). One "Run the week" kicks
// off every panel's timeline at once.
export default function Demo() {
  const started = useDemo((s) => s.started)
  const start = useDemo((s) => s.start)
  const reset = useDemo((s) => s.reset)

  return (
    <div className="demo-stage">
      <header className="demo-topbar">
        <span className="demo-brand-dot" />
        <div className="demo-titles">
          <div className="demo-title">Hyperspace OS · Behind the Scenes</div>
          <div className="demo-sub">A week of incidents at JRG-CCGT-1 — documents in, knowledge out</div>
        </div>
        <span className="demo-spacer" />
        <button className="demo-run" onClick={started ? reset : start}>
          {started ? '↺ Restart' : '▶ Run the week'}
        </button>
      </header>

      <main className="demo-main">
        <div className="demo-left">
          <DocumentsPanel />
          <ResolutionPanel />
          <NewKnowledgePanel />
        </div>
        <div className="demo-right">
          <KGForce3D />
        </div>
      </main>
    </div>
  )
}
