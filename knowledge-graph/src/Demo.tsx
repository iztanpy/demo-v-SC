import { useDemo } from './demoStore'
import { DocumentsPanel } from './components/DocumentsPanel'
import { ResolutionPanel } from './components/ResolutionPanel'
import { NewKnowledgePanel } from './components/NewKnowledgePanel'
// 2D fallback preserved on disk: swap this back to `./components/KGForce` (and <KGForce/>) to revert.
import { KGForce3D } from './components/KGForce3D'
import './demo.css'

// 3-panel SEQUENTIAL demo shell. Left = the three process panels in a row (Documents → Resolution
// → New Knowledge), run as a horizontal accordion; right = the knowledge graph hero (the Context
// Hub). "Run the week" starts only section 1; folding a section triggers the next one to run.
export default function Demo() {
  const started = useDemo((s) => s.started)
  const start = useDemo((s) => s.start)
  const reset = useDemo((s) => s.reset)
  // More open panels = a more crowded left column, so we widen it (and shrink the KG) accordingly.
  const folded = useDemo((s) => s.sectionFolded)
  const openPanels = Object.values(folded).filter((f) => !f).length

  return (
    <div className="demo-stage">
      <header className="demo-topbar">
        <span className="demo-brand-dot" />
        <div className="demo-titles">
          <div className="demo-title">Sembcorp knowledge graph</div>
        </div>
        <span className="demo-spacer" />
        <button className="demo-run" onClick={started ? reset : start}>
          {started ? '↺ Restart' : '▶ Run the week'}
        </button>
      </header>

      <main className="demo-main" data-open-panels={openPanels}>
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
