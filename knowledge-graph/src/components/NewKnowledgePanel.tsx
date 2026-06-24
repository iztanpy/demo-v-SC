import { useEffect, useRef, useState } from 'react'
import { SPEED } from '../data/feed'
import { useDemo } from '../demoStore'

// Panel ③ — New Knowledge. The exception (INC-0537) surfaces THREE proposed graph changes, each
// reviewed individually by a human before anything touches the graph (the human-in-the-loop gate).
// Each card runs its own SOP / safety check, then the reviewer Approves or Rejects it. Approvals
// commit into the live graph (Panel KGForce reacts); rejections are logged and the graph is left
// untouched. The canonical script REJECTS the re-weight (rebalance) suggestion to show the human
// exercising real judgement — not rubber-stamping the machine.

const REVIEWER = 'P. Subramaniam · Reliability Eng'
const SIGN_TS = '02:59 SGT'

type Kind = 'reweight' | 'add-node'
interface NkCardDef {
  id: string
  kind: Kind
  glyph: string
  badge: string
  title: string
  detail: string
  provenance: string
  sop: string[]
  approvedMsg: string
  rejectedMsg: string
}

const CARDS: NkCardDef[] = [
  {
    id: 'nk-reweight', kind: 'reweight', glyph: '~', badge: 'Re-weight',
    title: 'Rebalance diagnostic edge confidence',
    detail: 'Backtesting on past data shows a 10% accuracy gain after adjusting confidence scores',
    provenance: 'from INC-0537 · bent shaft ruled out 3 / 3 — phase over-attributes the 1×RPM signature casing fatigue mimics',
    sop: ['SOP-BFP-VIBR-001', 'ISO 10816-7'],
    approvedMsg: 'Edge recalculated to 0.70.',
    rejectedMsg: 'Declined — edge held at 0.88 pending more fleet cases.',
  },
  {
    id: 'nk-crack', kind: 'add-node', glyph: '+', badge: 'New root cause',
    title: 'Casing weld-toe crack (volute)',
    detail: 'new RootCause node · RC-CASING-CRACK',
    provenance: 'from INC-0537 · Dr. A. Ismail phase analysis + onsite PT finding',
    sop: ['SOP-BFP-VIBR-001', 'ASME PCC-2'],
    approvedMsg: 'Casing-crack root cause committed to the graph.',
    rejectedMsg: 'Declined — not added.',
  },
  {
    id: 'nk-test', kind: 'add-node', glyph: '+', badge: 'New test',
    title: 'Dye-penetrant inspection (PT/MT)',
    detail: 'new DiagnosticTest node · DT-WELD-NDT · confirms casing crack',
    provenance: 'from INC-0537 · L. Lim onsite — discontinuity ~60 mm from discharge weld',
    sop: ['HSE Hot-Work Permit', 'NDT Level 2 (PT/MT)'],
    approvedMsg: 'Dye-penetrant test committed + linked to casing crack.',
    rejectedMsg: 'Declined — held for 2nd opinion.',
  },
]

type Decision = 'pending' | 'approved' | 'rejected'
const CARD_STAGGER = 700 // ms between successive cards starting their SOP check (queue feel)

// ── one reviewable knowledge card: runs its own SOP scan, then shows Approve / Reject ──
function NkCard({ card, startDelay, decision, onApprove, onReject, runId }: {
  card: NkCardDef; startDelay: number; decision: Decision
  onApprove: () => void; onReject: () => void; runId: number
}) {
  const [stage, setStage] = useState<'idle' | 'checking' | 'passed'>('idle')
  const [checked, setChecked] = useState(0)

  useEffect(() => {
    setStage('idle'); setChecked(0)
    const step = 520 * SPEED
    const timers: number[] = []
    timers.push(window.setTimeout(() => setStage('checking'), startDelay))
    card.sop.forEach((_, i) => timers.push(window.setTimeout(() => setChecked(i + 1), startDelay + step * (i + 1))))
    timers.push(window.setTimeout(() => setStage('passed'), startDelay + step * card.sop.length + 300 * SPEED))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  const decided = decision !== 'pending'

  return (
    <div className="p-nk-card" data-kind={card.kind} data-decision={decision}>
      <div className="p-nk-card-head">
        <span className="p-nk-glyph" data-kind={card.kind}>{card.glyph}</span>
        <span className="p-nk-badge" data-kind={card.kind}>{card.badge}</span>
        <span className="p-nk-status" data-decision={decision}>
          {decision === 'approved' ? 'approved ✓' : decision === 'rejected' ? 'rejected ✕' : stage === 'passed' ? 'awaiting sign-off' : 'validating…'}
        </span>
      </div>
      <div className="p-nk-card-title">{card.title}</div>
      <div className="p-nk-card-detail">{card.detail}</div>
      <div className="p-nk-card-prov">{card.provenance}</div>

      <div className="p-nk-blocks">
        {card.sop.map((b, i) => {
          const pass = decision === 'approved' || stage === 'passed' || i < checked
          const scan = !decided && stage === 'checking' && i === checked
          return (
            <div key={b} className="p-nk-block" data-state={pass ? 'pass' : scan ? 'scan' : 'idle'}>
              <span className="p-nk-block-name">{b}</span>
              <span className="p-nk-block-mark">{pass ? '✓' : scan ? '⋯' : ''}</span>
            </div>
          )
        })}
      </div>

      {!decided && stage === 'passed' && (
        <div className="p-nk-actions">
          <button className="p-nk-btn p-nk-reject" onClick={onReject}>Reject</button>
          <button className="p-nk-btn p-nk-approve2" onClick={onApprove}>Approve &amp; commit</button>
        </div>
      )}
      {decided && (
        <div className="p-nk-result" data-decision={decision}>
          <span className="p-nk-result-mark">{decision === 'approved' ? '✓' : '✕'}</span>
          <span className="p-nk-result-msg">
            {decision === 'approved' ? card.approvedMsg : card.rejectedMsg}
            <span className="p-nk-result-by"> · {REVIEWER} · {SIGN_TS}</span>
          </span>
        </div>
      )}
    </div>
  )
}

export function NewKnowledgePanel() {
  const gap = useDemo((s) => s.gap)
  const runId = useDemo((s) => s.runId)
  const committedNodes = useDemo((s) => s.committedNodes)
  const approveNode = useDemo((s) => s.approveNode)
  const setReweight = useDemo((s) => s.setReweight)
  const setReweightApplied = useDemo((s) => s.setReweightApplied)

  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const [open, setOpen] = useState(true)
  useEffect(() => { setOpen(true); setDecisions({}) }, [runId])

  const active = gap || committedNodes.length > 0

  const decide = (card: NkCardDef, d: Decision) => {
    setDecisions((prev) => ({ ...prev, [card.id]: d }))
    if (d === 'approved') {
      if (card.id === 'nk-reweight') setReweightApplied(true)
      else if (card.id === 'nk-crack') approveNode('RC-CASING-CRACK')
      else if (card.id === 'nk-test') approveNode('DT-WELD-NDT')
    } else if (d === 'rejected') {
      if (card.id === 'nk-reweight') setReweight(false) // withdraw the proposed re-weight; edge keeps 0.88
    }
  }

  const decidedCount = CARDS.filter((c) => (decisions[c.id] ?? 'pending') !== 'pending').length

  // pin to the bottom as cards validate / get signed off
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = bodyRef.current
    if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
  }, [decidedCount])

  return (
    <section className="p-panel p-newknow" data-active={active} data-collapsed={!open}>
      <header className="p-panel-head" onClick={() => setOpen((o) => !o)}>
        <span className="p-panel-num">3</span>
        <span className="p-panel-title">New Knowledge</span>
        <span className="p-panel-sub">{active ? `human sign-off · ${decidedCount}/${CARDS.length}` : 'waiting for a gap'}</span>
        <span className="p-caret" data-open={open}>▾</span>
      </header>

      {open && active && (
        <div className="p-nk-body" ref={bodyRef}>
          <div className="p-nk-intro">
            {CARDS.length} changes proposed from <b>INC-0537</b> — nothing enters the graph without your sign-off.
          </div>
          {CARDS.map((card, i) => (
            <NkCard
              key={card.id}
              card={card}
              startDelay={i * CARD_STAGGER * SPEED}
              decision={decisions[card.id] ?? 'pending'}
              onApprove={() => decide(card, 'approved')}
              onReject={() => decide(card, 'rejected')}
              runId={runId}
            />
          ))}
        </div>
      )}
    </section>
  )
}
