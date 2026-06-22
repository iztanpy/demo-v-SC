import { useEffect, useRef, useState } from 'react'
import { SPEED } from '../data/feed'
import { useDemo } from '../demoStore'

// Panel ③ — New Knowledge. Opens when Resolution surfaces a gap. The candidate (casing-crack
// RootCause + Weld-NDT test) is checked against named SOP / safety documents — particles fly from
// the candidate into the blocks, which pass green. Then the admin signs off, and the new node
// commits into the graph (it grows into the BFP region).
const SOP_BLOCKS = ['SOP-BFP-VIBR-001', 'ISO 10816-7', 'ASME PCC-2', 'HSE Hot-Work Permit']
type Stage = 'idle' | 'checking' | 'passed'

export function NewKnowledgePanel() {
  const gap = useDemo((s) => s.gap)
  const runId = useDemo((s) => s.runId)
  const committed = useDemo((s) => s.committed)
  const setCommitted = useDemo((s) => s.setCommitted)
  const reweightApplied = useDemo((s) => s.reweightApplied)
  const setReweight = useDemo((s) => s.setReweight)
  const setReweightApplied = useDemo((s) => s.setReweightApplied)
  const [stage, setStage] = useState<Stage>('idle')
  const [checked, setChecked] = useState(0)
  const [addNode, setAddNode] = useState(true) // admin's choice: add the new node?
  const [recalc, setRecalc] = useState(true) // admin's choice: recalculate the edge confidence?
  const [done, setDone] = useState(false) // sign-off submitted

  // nothing reaches the graph until the admin approves the specific changes they ticked
  const approve = () => {
    setDone(true)
    setCommitted(addNode)
    if (recalc) setReweightApplied(true)
    else setReweight(false) // declined → withdraw the proposed re-weight, edge keeps 0.88
  }

  useEffect(() => {
    if (!gap) { setStage('idle'); setChecked(0); setDone(false); setAddNode(true); setRecalc(true); return }
    setStage('checking'); setChecked(0)
    const step = 650 * SPEED
    const timers: number[] = []
    SOP_BLOCKS.forEach((_, i) => timers.push(window.setTimeout(() => setChecked(i + 1), step * (i + 1))))
    timers.push(window.setTimeout(() => setStage('passed'), step * SOP_BLOCKS.length + 350 * SPEED))
    return () => timers.forEach(clearTimeout)
  }, [gap, runId])

  const active = gap || committed

  // pin to the bottom as the SOP checks / sign-off appear
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = bodyRef.current
    if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
  }, [checked, stage, done])

  return (
    <section className="p-panel p-newknow" data-active={active}>
      <header className="p-panel-head">
        <span className="p-panel-num">3</span>
        <span className="p-panel-title">New Knowledge</span>
        <span className="p-panel-sub">{active ? 'SOP / safety check · sign-off' : 'waiting for a gap'}</span>
      </header>

      {active && (
        <div className="p-nk-body" ref={bodyRef}>
          <div className="p-nk-candidate" data-committed={committed}>
            <span className="p-nk-tag">{committed ? 'committed ✓' : 'candidate'}</span>
            <span className="p-nk-title">Casing weld-toe crack (volute)</span>
            <span className="p-nk-sub">new RootCause + Weld-NDT test · from INC-0537</span>
          </div>

          <div className="p-nk-checkhead">
            {stage === 'checking' && 'Validating against SOP / safety…'}
            {stage === 'passed' && !done && 'Compliant ✓ — awaiting admin sign-off'}
            {done && 'Sign-off complete'}
          </div>

          <div className="p-nk-check" data-checking={stage === 'checking'}>
            {stage === 'checking' && <div className="p-nk-particles"><span /><span /><span /></div>}
            <div className="p-nk-blocks">
              {SOP_BLOCKS.map((b, i) => {
                const pass = committed || stage === 'passed' || i < checked
                const scan = stage === 'checking' && i === checked
                return (
                  <div key={b} className="p-nk-block" data-state={pass ? 'pass' : scan ? 'scan' : 'idle'}>
                    <span className="p-nk-block-name">{b}</span>
                    <span className="p-nk-block-mark">{pass ? '✓' : scan ? '⋯' : ''}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {stage === 'passed' && !done && (
            <div className="p-nk-signoff">
              <div className="p-nk-changehead">Proposed changes — approve before anything is added</div>
              <label className="p-nk-change">
                <input type="checkbox" checked={addNode} onChange={(e) => setAddNode(e.target.checked)} />
                <span className="p-nk-change-glyph" data-kind="add">+</span>
                Add RootCause <b>Casing weld-toe crack</b> + Weld-NDT test
              </label>
              <label className="p-nk-change p-nk-recalc">
                <input type="checkbox" checked={recalc} onChange={(e) => setRecalc(e.target.checked)} />
                <span className="p-nk-change-glyph" data-kind="reweight">~</span>
                Recalculate edge <b>DT-PHASE → bent shaft</b> · 0.88 → 0.70
              </label>
              <button className="p-nk-approve" onClick={approve} disabled={!addNode && !recalc}>✓ Approve &amp; commit</button>
            </div>
          )}
          {done && (
            <div className="p-nk-done">
              <div>{committed ? '✓ Casing-crack node + Weld-NDT test committed to the graph.' : '• Casing-crack node not added (declined).'}</div>
              <div>{reweightApplied ? '✓ DT-PHASE → bent shaft recalculated to 0.70.' : '• Edge confidence left at 0.88.'}</div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
