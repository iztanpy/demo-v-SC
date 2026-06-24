import { useEffect, useRef, useState } from 'react'
import { INCIDENTS, INCIDENT_COLOR } from '../data/feed'
import { useDemo } from '../demoStore'
import { useResolution } from '../useResolution'

// Panel ② — Resolution. As each incident's documents finish, its extracted entities (symptom,
// tests run, selected diagnosis) are matched against the knowledge graph. One incident can emit
// several resolution CARDS. Three outcomes:
//   • match     — entity exists on the expected path → reaffirms (graph lights green)
//   • re-weight — the graph's high-confidence suggestion was overruled → drop edge confidence
//   • gap       — no node for the selected diagnosis → new knowledge (Panel 3)
type EntStatus = 'match' | 'reweight' | 'gap'
interface ResEntity { label: string; detail: string; status: EntStatus }
interface ResCard {
  id: string
  incident: string
  chip: string
  chipKind: 'reaffirm' | 'reweight' | 'gap'
  entities: ResEntity[]
  matchedNodes: string[]
  reweight?: boolean
  gap?: boolean
}

const CARDS: ResCard[] = [
  {
    id: 'c-0488', incident: 'INC-0488', chip: 'matched', chipKind: 'reaffirm',
    entities: [
      { label: 'Symptom', detail: 'BFP NDE vib high → SYM-001', status: 'match' },
      { label: 'Tests run', detail: 'Housing inspect → DT-HOUSING-INSPECT', status: 'match' },
      { label: 'Diagnosis', detail: 'Bearing spalling → RC-BEARING-SPALL', status: 'match' },
    ],
    matchedNodes: ['SYM-001', 'DT-HOUSING-INSPECT', 'RC-BEARING-SPALL'],
  },
  {
    id: 'c-0501', incident: 'INC-0501', chip: 'matched', chipKind: 'reaffirm',
    entities: [
      { label: 'Symptom', detail: 'BFP NDE vib high → SYM-001', status: 'match' },
      { label: 'Tests run', detail: 'Phase, Alignment → DT-PHASE, DT-ALIGNMENT', status: 'match' },
      { label: 'Diagnosis', detail: 'Misalignment → RC-MISALIGN', status: 'match' },
    ],
    matchedNodes: ['SYM-001', 'DT-PHASE', 'DT-ALIGNMENT', 'RC-MISALIGN'],
  },
  {
    id: 'c-0455', incident: 'INC-0455', chip: 'matched', chipKind: 'reaffirm',
    entities: [
      { label: 'Symptom', detail: 'BFP NDE vib high → SYM-001', status: 'match' },
      { label: 'Tests run', detail: 'Housing inspect → DT-HOUSING-INSPECT', status: 'match' },
      { label: 'Diagnosis', detail: 'Bearing spalling → RC-BEARING-SPALL', status: 'match' },
    ],
    matchedNodes: ['SYM-001', 'DT-HOUSING-INSPECT', 'RC-BEARING-SPALL'],
  },
  {
    id: 'c-0472', incident: 'INC-0472', chip: 'matched', chipKind: 'reaffirm',
    entities: [
      { label: 'Symptom', detail: 'BFP NDE vib high → SYM-001', status: 'match' },
      { label: 'Tests run', detail: 'Alignment → DT-ALIGNMENT', status: 'match' },
      { label: 'Diagnosis', detail: 'Misalignment → RC-MISALIGN', status: 'match' },
    ],
    matchedNodes: ['SYM-001', 'DT-PHASE', 'DT-ALIGNMENT', 'RC-MISALIGN'],
  },
  {
    id: 'c-0510', incident: 'INC-0510', chip: 'matched', chipKind: 'reaffirm',
    entities: [
      { label: 'Symptom', detail: 'BFP NDE vib high → SYM-001', status: 'match' },
      { label: 'Tests run', detail: 'Oil analysis → DT-OIL-ANALYSIS', status: 'match' },
      { label: 'Diagnosis', detail: 'Lube failure → RC-LUBE-FAIL', status: 'match' },
    ],
    matchedNodes: ['SYM-001', 'DT-HOUSING-INSPECT', 'DT-OIL-ANALYSIS', 'RC-LUBE-FAIL'],
  },
  {
    id: 'c-0523', incident: 'INC-0523', chip: 'matched', chipKind: 'reaffirm',
    entities: [
      { label: 'Symptom', detail: 'BFP NDE vib high → SYM-001', status: 'match' },
      { label: 'Tests run', detail: 'Housing inspect → DT-HOUSING-INSPECT', status: 'match' },
      { label: 'Diagnosis', detail: 'Bearing spalling → RC-BEARING-SPALL', status: 'match' },
    ],
    matchedNodes: ['SYM-001', 'DT-HOUSING-INSPECT', 'RC-BEARING-SPALL'],
  },
  {
    id: 'c-0544', incident: 'INC-0544', chip: 'matched', chipKind: 'reaffirm',
    entities: [
      { label: 'Symptom', detail: 'BFP NDE vib high → SYM-001', status: 'match' },
      { label: 'Tests run', detail: 'Alignment → DT-ALIGNMENT', status: 'match' },
      { label: 'Diagnosis', detail: 'Misalignment → RC-MISALIGN', status: 'match' },
    ],
    matchedNodes: ['SYM-001', 'DT-PHASE', 'DT-ALIGNMENT', 'RC-MISALIGN'],
  },
  // INC-0537 (the exception) emits several resolution cards — most of it the graph already knows
  // (symptom, asset, first-line tests), one over-confident edge to re-weight, and the casing-crack
  // entities that have no home on the graph (the gaps that flow to New Knowledge).
  {
    id: 'c-0537-sop', incident: 'INC-0537', chip: 'matched', chipKind: 'reaffirm',
    entities: [
      { label: 'Workflow', detail: 'Workflows generated for the initial work order matched SOP standards', status: 'match' },
      { label: 'Tests run', detail: 'Phase analysis + housing inspection on the graph’s path', status: 'match' },
    ],
    matchedNodes: ['SYM-001', 'AC-BFP', 'DT-PHASE', 'DT-HOUSING-INSPECT'],
  },
  {
    id: 'c-0537-rw', incident: 'INC-0537', chip: 're-weight confidence', chipKind: 'reweight',
    entities: [
      { label: 'Diagnosis', detail: 'Original proposed diagnosis was not selected', status: 'reweight' },
      { label: 'Signature', detail: 'Specific temperature + vibration signature pointed to a bearing-related issue', status: 'reweight' },
    ],
    matchedNodes: ['SYM-001', 'DT-PHASE'],
    reweight: true,
  },
  {
    id: 'c-0537-gap', incident: 'INC-0537', chip: 'gap — new knowledge', chipKind: 'gap',
    entities: [
      { label: 'Root cause', detail: 'Casing crack identified as the root cause — no matching node on the graph', status: 'gap' },
    ],
    matchedNodes: [],
    gap: true,
  },
  {
    id: 'c-0537-ndt', incident: 'INC-0537', chip: 'gap — new test', chipKind: 'gap',
    entities: [
      { label: 'Test', detail: 'New test needed to confirm the casing crack — liquid-penetrant inspection, off the graph’s path', status: 'gap' },
    ],
    matchedNodes: [],
    gap: true,
  },
]

const STATUS_GLYPH: Record<EntStatus, string> = { match: '✓', reweight: '~', gap: '⚠' }

// hidden for now — flip to true to re-enable the dots flying from resolved cards toward the graph
const SHOW_PARTICLES = false

// INC-0537 is the hero (the exception). Its re-weight + gap cards render full (entity lists);
// every other (reaffirm) incident stays a compact mini card — just the incident + chip + ✓.
const FOCUS_INCIDENT = 'INC-0537'

// The hero emits several cards on ONE per-incident phase, so they'd all resolve at the same instant.
// Once the incident resolves, cascade its cards one-by-one (in array order) for a sequenced reveal.
const FOCUS_CARDS = CARDS.filter((c) => c.incident === FOCUS_INCIDENT)
const HERO_STEP_MS = 600 // spacing between successive hero-card resolves

// As each "graph-imperfection" hero card resolves (re-weight + the 2 gaps), the graph flashes amber
// on a representative EXISTING node/edge for ~1s. The gaps' own nodes (casing crack / NDT) aren't on
// the graph yet, so we flash the nearest node already there. Edge keys are "SOURCE>TARGET".
const FLASH_BY_CARD: Record<string, { nodes: string[]; edges: string[] }> = {
  'c-0537-rw':  { nodes: ['RC-BENT-SHAFT'],      edges: ['DT-PHASE>RC-BENT-SHAFT'] },
  'c-0537-gap': { nodes: ['DT-PHASE'],           edges: ['SYM-001>DT-PHASE'] },
  'c-0537-ndt': { nodes: ['DT-HOUSING-INSPECT'], edges: ['SYM-001>DT-HOUSING-INSPECT'] },
}

// ── cross-panel particle flow: dots fly from a resolved card toward the graph (reaffirming it) ──
let fxLayer: HTMLDivElement | null = null
const getFxLayer = () => {
  if (!fxLayer) { fxLayer = document.createElement('div'); fxLayer.className = 'fx-layer'; document.body.appendChild(fxLayer) }
  return fxLayer
}
function spawnParticles(from: { x: number; y: number }, to: { x: number; y: number }, color: string, n = 10) {
  const layer = getFxLayer()
  for (let i = 0; i < n; i++) {
    const dot = document.createElement('div')
    dot.className = 'fx-dot'
    dot.style.background = color
    dot.style.color = color
    dot.style.left = `${from.x}px`; dot.style.top = `${from.y}px`
    layer.appendChild(dot)
    const delay = i * 55, dur = 750 + Math.random() * 350
    const jx = (Math.random() - 0.5) * 60, jy = (Math.random() - 0.5) * 80
    requestAnimationFrame(() => {
      dot.style.transition = `transform ${dur}ms cubic-bezier(.4,0,.5,1) ${delay}ms, opacity ${dur}ms ease-in ${delay}ms`
      dot.style.transform = `translate(${to.x - from.x + jx}px, ${to.y - from.y + jy}px)`
      dot.style.opacity = '0'
    })
    setTimeout(() => dot.remove(), delay + dur + 80)
  }
}

export function ResolutionPanel() {
  const started = useDemo((s) => s.started)
  const runId = useDemo((s) => s.runId)
  const setMatched = useDemo((s) => s.setMatched)
  const setReweight = useDemo((s) => s.setReweight)
  const setGap = useDemo((s) => s.setGap)
  const pulse = useDemo((s) => s.pulse)
  const phases = useResolution(started, runId)

  const [open, setOpen] = useState(true)
  useEffect(() => { setOpen(true) }, [runId])
  const active = INCIDENTS.some((i) => (phases.get(i.id) ?? 'pending') !== 'pending')

  // hero-card cascade: how many of INC-0537's cards have resolved so far (rest stay in matching)
  const heroPhase = phases.get(FOCUS_INCIDENT) ?? 'pending'
  const [heroResolved, setHeroResolved] = useState(0)
  useEffect(() => { setHeroResolved(0) }, [runId])
  useEffect(() => {
    if (heroPhase !== 'resolved') { setHeroResolved(0); return }
    const timers = FOCUS_CARDS.map((_, i) => setTimeout(() => setHeroResolved(i + 1), i * HERO_STEP_MS))
    return () => timers.forEach(clearTimeout)
  }, [heroPhase, runId])

  // amber flash on the graph as each graph-imperfection card resolves (re-weight + the 2 gaps)
  useEffect(() => {
    if (heroResolved < 1) return
    const card = FOCUS_CARDS[heroResolved - 1]
    const f = card && FLASH_BY_CARD[card.id]
    if (f) pulse(f.nodes, f.edges)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroResolved])

  // push resolution outcomes to the graph (matched paths + re-weight) and Panel 3 (the gap)
  const phaseKey = INCIDENTS.map((i) => phases.get(i.id)).join(',')
  useEffect(() => {
    const matched = new Set<string>()
    let reweight = false, gap = false
    for (const card of CARDS) {
      if (phases.get(card.incident) !== 'resolved') continue
      card.matchedNodes.forEach((n) => matched.add(n))
      const inc = INCIDENTS.find((i) => i.id === card.incident)
      if (inc) matched.add(inc.asset) // light up the incident's own machine (green unit node)
      if (card.reweight) reweight = true
      if (card.gap) gap = true
    }
    setMatched([...matched]); setReweight(reweight); setGap(gap)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseKey])

  // Focus incident (INC-0537) groups at the TOP in its authored narrative order (matches →
  // re-weight → gaps); the mini reaffirm cards sit below, ordered by work-queue priority.
  const PRIORITY: Record<ResCard['chipKind'], number> = { gap: 0, reweight: 1, reaffirm: 2 }
  const visibleCards = CARDS
    .filter((c) => (phases.get(c.incident) ?? 'pending') !== 'pending')
    .sort((a, b) => {
      const fa = a.incident === FOCUS_INCIDENT ? 0 : 1
      const fb = b.incident === FOCUS_INCIDENT ? 0 : 1
      if (fa !== fb) return fa - fb
      if (fa === 0) return 0 // focus cards keep their array order (stable)
      return PRIORITY[a.chipKind] - PRIORITY[b.chipKind]
    })

  // keep the hero (INC-0537, sorted to the top) in view — don't follow the stream down
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = bodyRef.current
    if (el) requestAnimationFrame(() => { el.scrollTop = 0 })
  }, [phaseKey])

  // when a card resolves, fly particles from it toward the graph (reaffirming the knowledge graph)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const emittedRef = useRef<Set<string>>(new Set())
  useEffect(() => { emittedRef.current.clear() }, [runId])
  useEffect(() => {
    if (!SHOW_PARTICLES) return
    const graph = document.querySelector('.demo-right')
    if (!graph) return
    const gr = graph.getBoundingClientRect()
    const to = { x: gr.left + gr.width * 0.42, y: gr.top + gr.height * 0.5 }
    for (const card of CARDS) {
      if (phases.get(card.incident) !== 'resolved' || card.chipKind === 'gap') continue
      if (emittedRef.current.has(card.id)) continue
      const el = cardRefs.current[card.id]
      if (!el) continue
      const r = el.getBoundingClientRect()
      spawnParticles({ x: r.right - 10, y: r.top + r.height / 2 }, to, card.chipKind === 'reweight' ? '#F59E0B' : '#00A651', 12)
      emittedRef.current.add(card.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseKey])

  return (
    <section className="p-panel p-resolution" data-active={active} data-collapsed={!open}>
      <header className="p-panel-head" onClick={() => setOpen((o) => !o)}>
        <span className="p-panel-num">2</span>
        <span className="p-panel-title">Resolution</span>
        <span className="p-panel-sub">{active ? 'match vs. graph' : 'waiting for findings'}</span>
        <span className="p-caret" data-open={open}>▾</span>
      </header>

      {open && active && (
        <div className="p-res-body" ref={bodyRef}>
          {visibleCards.map((card) => {
            const phase = phases.get(card.incident) ?? 'pending'
            const inc = INCIDENTS.find((i) => i.id === card.incident)!
            const color = INCIDENT_COLOR[card.incident]
            const focus = card.incident === FOCUS_INCIDENT
            // hero cards cascade: each stays in matching until its turn in the sequence comes up
            const focusIndex = focus ? FOCUS_CARDS.findIndex((c) => c.id === card.id) : -1
            const matching = focus
              ? phase === 'matching' || (phase === 'resolved' && heroResolved <= focusIndex)
              : phase === 'matching'
            return (
              <div key={card.id} ref={(el) => { cardRefs.current[card.id] = el }} className="p-res-row" data-kind={matching ? 'matching' : card.chipKind} data-mini={!focus} style={{ ['--inc' as string]: color }}>
                <div className="p-res-top">
                  <span className="p-res-dot" style={{ background: color }} />
                  <span className="p-res-incident" style={{ color }}>{card.incident} · {inc.asset}</span>
                  <span className="p-res-chip" data-kind={matching ? 'matching' : card.chipKind}>
                    {matching ? 'matching...' : card.chip}
                  </span>
                  {!focus && !matching && <span className="p-res-tick">✓</span>}
                </div>
                {/* Mini cards (reaffirm incidents) stop here — just the chip + ✓. Only the hero
                    (INC-0537) shows the matching theater + the full entity breakdown. */}
                {focus && (matching ? (
                  <div className="p-reveal"><span className="p-dots"><span /><span /><span /></span><span className="p-reveal-msg">resolving entities against the knowledge graph…</span></div>
                ) : (
                  <ul className="p-ent-list">
                    {card.entities.map((e, i) => (
                      <li key={i} className="p-ent" data-status={e.status}>
                        <span className="p-ent-glyph" data-status={e.status}>{STATUS_GLYPH[e.status]}</span>
                        <span className="p-ent-label">{e.label}</span>
                        <span className="p-ent-detail">{e.detail}</span>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
