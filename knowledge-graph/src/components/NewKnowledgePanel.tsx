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
  detail?: string
  /** detail rendered as coloured segments (readings orange · test blue · root cause red) */
  detailSeg?: { text: string; tone?: 'orange' | 'blue' | 'red' }[]
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
  /** recurrence tally for a threshold-triggered re-weight (count chip + N-dot tally) */
  recurrence?: { label: string; count: number; total: number }
}

const CARDS: NkCardDef[] = [
  {
    // symptoms → TEST connection (reveals temp→weld-NDT dashed + vib→weld-NDT grey support)
    id: 'nk-connection-test', kind: 'add-edge', glyph: '+', badge: 'New connection',
    title: 'High bearing temp → weld NDT',
    detailSeg: [
      { text: 'NDE temp > 70°C', tone: 'orange' }, { text: ' + ' }, { text: 'vib between 8-9 mm/s', tone: 'orange' },
      { text: ' flag the ' }, { text: 'weld NDT', tone: 'blue' }, { text: ' test' },
    ],
    provenance: 'Temp rise during works suggested running the weld NDT',
    sop: ['SOP CHECK', 'SAFETY CHECK'],
    approvedMsg: 'Submitted for review — temp + vib now route to the weld-NDT test (provisional).',
    rejectedMsg: 'Declined — connection not added.',
    hi: { nodes: ['BFP-S0', 'SYM-001', 'DT-WELD-NDT'], edges: ['BFP-S0>DT-WELD-NDT', 'SYM-001>DT-WELD-NDT'] },
    path: [{ text: 'High bearing temp', color: NODE_COLORS.Symptom, sep: '+' }, { text: 'High bearing vib.', color: NODE_COLORS.Symptom }, { text: 'Weld NDT', color: NODE_COLORS.DiagnosticTest }],
  },
  {
    // symptom → ROOT-CAUSE connection (reveals temp→casing-crack dashed)
    id: 'nk-connection', kind: 'add-edge', glyph: '+', badge: 'New connection',
    title: 'High bearing temp → casing crack',
    detailSeg: [
      { text: 'NDE temp > 70°C', tone: 'orange' }, { text: ' + ' }, { text: 'vib between 8-9 mm/s', tone: 'orange' },
      { text: ' signal a ' }, { text: 'casing crack', tone: 'red' },
    ],
    provenance: 'Pattern across fleet BFPs links this temp/vib signature to casing fatigue',
    sop: ['SOP CHECK', 'SAFETY CHECK'],
    approvedMsg: 'Submitted for review — added as a provisional (dashed) link pending fleet validation.',
    rejectedMsg: 'Declined — connection not added.',
    hi: { nodes: ['BFP-S0', 'RC-CASING-CRACK'], edges: ['BFP-S0>RC-CASING-CRACK'] },
    path: [{ text: 'High bearing temp', color: NODE_COLORS.Symptom, sep: '+' }, { text: 'High bearing vib.', color: NODE_COLORS.Symptom }, { text: 'Casing crack', color: NODE_COLORS.RootCause }],
  },
  {
    // re-weight — runs LAST, after the two new connections
    id: 'nk-reweight', kind: 'reweight', glyph: '~', badge: 'Re-weight',
    title: 'Update AI confidence scoring',
    detail: 'Edge weight raised 0.75 → 0.90',
    provenance: 'Most recent 10 incidents with similar initial conditions were caused by bearing spalling',
    sop: ['THRESHOLD CHECK', 'OEM MANUAL CHECK'],
    approvedMsg: 'Edge weight raised to 0.90 — recurrence threshold confirmed.',
    rejectedMsg: 'Declined — weight held despite the recurrence.',
    hi: { nodes: ['SYM-001', 'DT-HOUSING-INSPECT', 'RC-BEARING-SPALL'], edges: ['SYM-001>DT-HOUSING-INSPECT', 'DT-HOUSING-INSPECT>RC-BEARING-SPALL'] },
    path: [{ text: 'High bearing vib.', color: NODE_COLORS.Symptom }, { text: 'Bearing spalling', color: NODE_COLORS.RootCause }],
    trend: 'up',
    recurrence: { label: '10th case', count: 10, total: 10 },
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
  const [lit, setLit] = useState(0) // recurrence dots fill one-by-one in a quick burst

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

  // recurrence tally: light the dots up in quick succession once the card appears
  useEffect(() => {
    if (!card.recurrence) return
    setLit(0)
    const { total } = card.recurrence
    const dot = 55 * SPEED // per-dot stagger — fast cascade
    const timers = Array.from({ length: total }, (_, i) =>
      window.setTimeout(() => setLit(i + 1), startDelay + dot * (i + 1)))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  const decided = decision !== 'pending'

  return (
    <div className="p-nk-card" data-kind={card.kind} data-decision={decision}>
      <div className="p-nk-card-head">
        <span className="p-nk-glyph" data-kind={card.kind}>{card.glyph}</span>
        <span className="p-nk-badge" data-kind={card.kind}>{card.badge}</span>
        {card.recurrence && <span className="p-nk-count">{card.recurrence.label}</span>}
        <span className="p-nk-status" data-decision={decision}>
          {decision === 'approved' ? (card.kind === 'add-edge' ? 'under review' : 'approved ✓') : decision === 'rejected' ? 'rejected ✕' : stage === 'passed' ? 'awaiting sign-off' : 'validating…'}
        </span>
      </div>
      {card.recurrence && (
        <div className="p-nk-tally">
          {Array.from({ length: card.recurrence.total }).map((_, i) => (
            <span key={i} className="p-nk-tally-dot" data-on={i < lit} />
          ))}
          <span className="p-nk-tally-label">10th occurrence, threshold hit</span>
        </div>
      )}
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
      {card.detailSeg ? (
        <div className="p-nk-card-detail">
          {card.detailSeg.map((s, i) => s.tone
            ? <span key={i} className="p-nk-read" data-tone={s.tone}>{s.text}</span>
            : <Fragment key={i}>{s.text}</Fragment>)}
        </div>
      ) : card.detail ? (
        <div className="p-nk-card-detail">{card.detail}</div>
      ) : null}
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
          <button className="p-nk-btn p-nk-approve2" onClick={onApprove}>{card.kind === 'add-edge' ? 'Submit for review' : 'Approve & commit'}</button>
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
  const setConnectionTestApplied = useDemo((s) => s.setConnectionTestApplied)
  const setReweight = useDemo((s) => s.setReweight)
  const setReweightApplied = useDemo((s) => s.setReweightApplied)
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
      // reveal the headline new link (BFP-S0 → weld NDT) as a thick dashed provisional edge; the
      // supporting edges are NOT highlighted — they stay as ordinary grey arrows (they aren't new).
      else if (card.id === 'nk-connection-test') { setConnectionTestApplied(true); addLitGreen(['BFP-S0>DT-WELD-NDT']) }
      else if (card.id === 'nk-connection') { setConnectionApplied(true); addLitGreen(['BFP-S0>RC-CASING-CRACK']) }
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
        <span className="p-panel-title">Updating knowledge graph</span>
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
