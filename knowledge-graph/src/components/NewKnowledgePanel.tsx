import { Fragment, useEffect, useRef, useState } from 'react'
import { SPEED } from '../data/feed'
import { NODE_COLORS } from '../data/graph'
import { useDemo } from '../demoStore'

// Panel ③ — New Knowledge. The exception (INC-0537) surfaces THREE proposed graph changes, each
// reviewed individually by a human before anything touches the graph (the human-in-the-loop gate).
// Each card runs its own SOP / safety check, then the reviewer Approves or Rejects it. Approvals
// commit into the live graph (Panel KGForce reacts); rejections are logged and the graph is left
// untouched. The canonical script REJECTS the re-weight (rebalance) suggestion to show the human
// exercising real judgement — not rubber-stamping the machine.

const REVIEWER = 'P. Subramaniam · Reliability Eng'
const SIGN_TS = '02:59 SGT'

type Kind = 'reweight' | 'add-edge' | 'strengthen'
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
  /** graph node/edge ids this card highlights teal on hover (edges = "SOURCE>TARGET") */
  hi: { nodes: string[]; edges: string[] }
  /** optional legend-coloured chip path (symptom → test …) shown on the card; `sep` = the connector
   *  AFTER this chip ('+' to combine inputs, default '→') */
  path?: { text: string; color: string; sep?: string }[]
  /** show a trailing trend arrow after the path — 'up' (green, confidence ↑) or 'down' (amber, ↓) */
  trend?: 'up' | 'down'
}

const CARDS: NkCardDef[] = [
  {
    id: 'nk-reweight', kind: 'reweight', glyph: '~', badge: 'Re-weight',
    title: 'Update AI confidence scoring',
    detail: '7/10 prior incidents with similar initial readings were caused by bearing spalling',
    provenance: 'Suggested from Faye’s rationale (alternative diagnosis on specific vibration readings)',
    sop: ['SOP CHECK', 'SAFETY CHECK'],
    approvedMsg: 'Confidence increased on the bearing-spalling link.',
    rejectedMsg: 'Declined — confidence held pending more fleet cases.',
    hi: { nodes: ['SYM-001', 'DT-HOUSING-INSPECT', 'RC-BEARING-SPALL'], edges: ['SYM-001>DT-HOUSING-INSPECT', 'DT-HOUSING-INSPECT>RC-BEARING-SPALL'] },
    path: [{ text: 'High bearing vib.', color: NODE_COLORS.Symptom }, { text: 'Bearing spalling', color: NODE_COLORS.RootCause }],
    trend: 'up',
  },
  {
    id: 'nk-connection', kind: 'add-edge', glyph: '+', badge: 'New connection',
    title: 'High bearing temp → weld NDT',
    detail: 'High temp. and vib. readings signal a casing crack',
    provenance: 'INC-0537 onsite — the temp spike preceded the off-path weld NDT that found the crack',
    sop: ['SOP CHECK', 'SAFETY CHECK'],
    approvedMsg: 'Connection committed — temp spike now routes to the weld-NDT / casing-crack path.',
    rejectedMsg: 'Declined — connection not added.',
    hi: { nodes: ['BFP-S0', 'SYM-001', 'DT-WELD-NDT', 'RC-CASING-CRACK'], edges: ['BFP-S0>DT-WELD-NDT', 'SYM-001>DT-WELD-NDT', 'DT-WELD-NDT>RC-CASING-CRACK'] },
    path: [{ text: 'High bearing temp', color: NODE_COLORS.Symptom, sep: '+' }, { text: 'High bearing vib.', color: NODE_COLORS.Symptom }, { text: 'Weld NDT', color: NODE_COLORS.DiagnosticTest }],
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
      {card.path ? (
        <div className="p-nk-path">
          {card.path.map((p, i) => (
            <Fragment key={p.text}>
              <span className="p-nk-pathchip" style={{ color: p.color, borderColor: p.color, background: `${p.color}1A` }}>{p.text}</span>
              {i < card.path!.length - 1 && <span className="p-nk-patharrow">{p.sep ?? '→'}</span>}
            </Fragment>
          ))}
          {card.trend && <span className={card.trend === 'up' ? 'p-nk-pathup' : 'p-nk-pathdown'} title={card.trend === 'up' ? 'confidence increased' : 'confidence decreased'}>{card.trend === 'up' ? '↑' : '↓'}</span>}
        </div>
      ) : (
        <div className="p-nk-card-title">{card.title}</div>
      )}
      <div className="p-nk-card-detail">{card.detail}</div>
      <div className="p-nk-card-prov">{card.provenance}</div>

      <div className="p-nk-checks">
        {card.sop.map((b, i) => {
          const pass = decision === 'approved' || stage === 'passed' || i < checked
          const scan = !decided && stage === 'checking' && i === checked
          return (
            <span key={b} className="p-nk-chip" data-state={pass ? 'pass' : scan ? 'scan' : 'idle'}>
              {b}
              <span className="p-nk-chip-mark">{pass ? '✓' : scan ? '⋯' : ''}</span>
            </span>
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
  const runId = useDemo((s) => s.runId)
  const run = useDemo((s) => s.sectionRun.nk)
  const folded = useDemo((s) => s.sectionFolded.nk)
  const toggleFold = useDemo((s) => s.toggleFold)
  const setConnectionApplied = useDemo((s) => s.setConnectionApplied)
  const setReweight = useDemo((s) => s.setReweight)
  const setReweightApplied = useDemo((s) => s.setReweightApplied)
  const addLit = useDemo((s) => s.addLit)
  const addLitGreen = useDemo((s) => s.addLitGreen)
  const addLitFuchsia = useDemo((s) => s.addLitFuchsia)

  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  useEffect(() => { setDecisions({}) }, [runId])

  const expanded = !folded

  const decide = (card: NkCardDef, d: Decision) => {
    setDecisions((prev) => ({ ...prev, [card.id]: d }))
    if (d === 'approved') {
      // light the WHOLE flow FUCHSIA: high bearing vib → housing inspect → bearing spalling (edges only)
      if (card.id === 'nk-reweight') { setReweightApplied(true); addLitFuchsia(['SYM-001>DT-HOUSING-INSPECT', 'DT-HOUSING-INSPECT>RC-BEARING-SPALL']) }
      // reveal: temp high → weld NDT lights GREEN (the headline new link); the other edges stay amber
      else if (card.id === 'nk-connection') { setConnectionApplied(true); addLitGreen(['BFP-S0>DT-WELD-NDT']); addLit([], ['SYM-001>DT-WELD-NDT', 'DT-WELD-NDT>RC-CASING-CRACK']) }
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
    <section className="p-panel p-newknow" data-active={run} data-folded={folded}>
      <header className="p-panel-head" onClick={() => toggleFold('nk')}>
        <span className="p-panel-num">3</span>
        <span className="p-panel-title">New Knowledge</span>
        <span className="p-panel-sub">{run ? `human sign-off · ${decidedCount}/${CARDS.length}` : 'waiting'}</span>
        <span className="p-caret" data-open={expanded}>▾</span>
      </header>

      {expanded && run && (
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
