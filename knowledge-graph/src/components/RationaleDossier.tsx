import { useState } from 'react'
import { CHANGES } from '../data/incidents'
import { useP2 } from '../store'

// Approval-step right panel — a punchy decision dossier (demo, not a spreadsheet): per change,
// the edit + one bold evidence stat + a single representative quote + compact validation pills.
// Approval runs in TWO batches: tick all in the current batch → Proceed.
const TOTAL_BATCHES = Math.max(...CHANGES.map((c) => c.batch))
const BATCH_LABEL: Record<number, string> = { 1: 'new knowledge', 2: 'efficiency' }
const KIND_GLYPH: Record<string, string> = { reweight: '~', shortcut: '⤳', 'add-node': '+', 'add-edge': '+' }

export function RationaleDossier() {
  const approvedBatches = useP2((s) => s.approvedBatches)
  const approveBatch = useP2((s) => s.approveBatch)
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const currentBatch = approvedBatches + 1
  const allDone = approvedBatches >= TOTAL_BATCHES
  const curChanges = CHANGES.filter((c) => c.batch === currentBatch)
  const allTicked = curChanges.length > 0 && curChanges.every((c) => checked[c.id])
  const proceed = () => { approveBatch(); setChecked({}) }

  return (
    <aside id="p2-agent-panel" className="p2-dossier">
      <div className="p2-panel-label">Decision dossier — reviewer sign-off</div>

      <div className="dossier-scroll">
        {[1, 2].map((b) => {
          const bChanges = CHANGES.filter((c) => c.batch === b)
          if (!bChanges.length) return null
          const done = approvedBatches >= b
          const isCurrent = b === currentBatch && !allDone
          return (
            <div className="dossier-batch" key={b} data-state={done ? 'done' : isCurrent ? 'current' : 'pending'}>
              <div className="dossier-batch-head">
                <span>Batch {b} · {BATCH_LABEL[b]}</span>
                <span className="dossier-batch-status">{done ? '✓ applied' : isCurrent ? 'review' : 'queued'}</span>
              </div>

              {(done || isCurrent) && bChanges.map((c) => (
                <div className="dossier-change" key={c.id}>
                  <label className="dossier-change-head">
                    {isCurrent && (
                      <input
                        type="checkbox"
                        checked={!!checked[c.id]}
                        onChange={(e) => setChecked((p) => ({ ...p, [c.id]: e.target.checked }))}
                      />
                    )}
                    {done && <span className="dossier-tick">✓</span>}
                    <span className="dossier-kind" data-kind={c.kind}>{KIND_GLYPH[c.kind]}</span>
                    <span className="dossier-change-label">{c.label}</span>
                    <span className="dossier-evidence-badge">{c.evidence}</span>
                  </label>
                  <div className="dossier-detail">{c.detail}</div>
                  <div className="dossier-quote">{c.quote}</div>
                  <div className="dossier-pills">
                    <span>Evidence ✓</span>
                    <span>Consistent ✓</span>
                    <span>SOP-safe ✓</span>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {!allDone ? (
        <button className="dossier-proceed" disabled={!allTicked} onClick={proceed}>
          {allTicked ? `Approve & run Batch ${currentBatch} ▸` : `Tick all to approve Batch ${currentBatch}`}
        </button>
      ) : (
        <div className="dossier-done">All changes approved · graph updated in place. Next ▸ to step back.</div>
      )}
    </aside>
  )
}
