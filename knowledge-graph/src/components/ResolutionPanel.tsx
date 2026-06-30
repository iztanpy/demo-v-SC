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
// re-weight rationale shown as a confidence-bar comparison (selected pick vs the overruled AI rec)
interface ResCompare {
  caption: string
  selected: { name: string; conf: number }
  overruled: { name: string; conf: number; tag?: string }
}
interface ResCard {
  id: string
  incident: string
  chip: string
  chipKind: 'reaffirm' | 'reweight' | 'gap'
  entities: ResEntity[]
  /** when set, render the confidence-bar comparison instead of the entity list */
  compare?: ResCompare
  /** captured Part-1 sensor readings (Faye / Lim) shown as a mono sub-line */
  sensors?: string
  matchedNodes: string[]
  /** graph edges ("SOURCE>TARGET") this card highlights teal on hover (nodes = matchedNodes) */
  hiEdges?: string[]
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
    hiEdges: ['SYM-001>DT-HOUSING-INSPECT', 'DT-HOUSING-INSPECT>RC-BEARING-SPALL'],
  },
  {
    id: 'c-0501', incident: 'INC-0501', chip: 'matched', chipKind: 'reaffirm',
    entities: [
      { label: 'Symptom', detail: 'BFP NDE vib high → SYM-001', status: 'match' },
      { label: 'Tests run', detail: 'Phase, Alignment → DT-PHASE, DT-ALIGNMENT', status: 'match' },
      { label: 'Diagnosis', detail: 'Misalignment → RC-MISALIGN', status: 'match' },
    ],
    matchedNodes: ['SYM-001', 'DT-PHASE', 'DT-ALIGNMENT', 'RC-MISALIGN'],
    hiEdges: ['SYM-001>DT-PHASE', 'DT-PHASE>DT-ALIGNMENT', 'DT-ALIGNMENT>RC-MISALIGN'],
  },
  {
    id: 'c-0455', incident: 'INC-0455', chip: 'matched', chipKind: 'reaffirm',
    entities: [
      { label: 'Symptom', detail: 'BFP NDE vib high → SYM-001', status: 'match' },
      { label: 'Tests run', detail: 'Housing inspect → DT-HOUSING-INSPECT', status: 'match' },
      { label: 'Diagnosis', detail: 'Bearing spalling → RC-BEARING-SPALL', status: 'match' },
    ],
    matchedNodes: ['SYM-001', 'DT-HOUSING-INSPECT', 'RC-BEARING-SPALL'],
    hiEdges: ['SYM-001>DT-HOUSING-INSPECT', 'DT-HOUSING-INSPECT>RC-BEARING-SPALL'],
  },
  {
    id: 'c-0472', incident: 'INC-0472', chip: 'matched', chipKind: 'reaffirm',
    entities: [
      { label: 'Symptom', detail: 'BFP NDE vib high → SYM-001', status: 'match' },
      { label: 'Tests run', detail: 'Alignment → DT-ALIGNMENT', status: 'match' },
      { label: 'Diagnosis', detail: 'Misalignment → RC-MISALIGN', status: 'match' },
    ],
    matchedNodes: ['SYM-001', 'DT-PHASE', 'DT-ALIGNMENT', 'RC-MISALIGN'],
    hiEdges: ['SYM-001>DT-PHASE', 'DT-PHASE>DT-ALIGNMENT', 'DT-ALIGNMENT>RC-MISALIGN'],
  },
  // INC-0537 (the exception) emits several resolution cards — most of it the graph already knows
  // (symptom, asset, first-line tests), one over-confident edge to re-weight, and the casing-crack
  // entities that have no home on the graph (the gaps that flow to New Knowledge).
  {
    id: 'c-0537-rw', incident: 'INC-0537', chip: 'conflict', chipKind: 'gap',
    entities: [],
    compare: {
      caption: 'Vibration signature pointed to bearing issue',
      selected: { name: 'NDE bearing spalling', conf: 80 },
      overruled: { name: 'Shaft misalignment', conf: 88, tag: 'AI rec' },
    },
    sensors: 'NDE vib RMS 8.4 mm/s vs 7.1 (ISO 10816-7 Zone C) · 1×RPM dominant · ~178° NDE–DE phase shift',
    matchedNodes: ['SYM-001', 'DT-PHASE'],
    hiEdges: ['DT-PHASE>RC-BENT-SHAFT'],
    reweight: true,
  },
  {
    id: 'c-0537-sop', incident: 'INC-0537', chip: 'matched', chipKind: 'reaffirm',
    entities: [
      { label: 'Diagnostic', detail: 'Weld NDT test used to confirm presence of casing crack; knowledge already present in knowledge graph', status: 'match' },
    ],
    matchedNodes: ['SYM-001', 'AC-BFP', 'DT-PHASE', 'DT-HOUSING-INSPECT'],
    hiEdges: ['SYM-001>AC-BFP', 'SYM-001>DT-PHASE', 'SYM-001>DT-HOUSING-INSPECT'],
  },
  {
    // Casing crack + weld-NDT already EXIST on the graph (matched). The single gap is the missing
    // CONNECTION from the temperature spike into that path.
    id: 'c-0537-gap', incident: 'INC-0537', chip: 'conflict', chipKind: 'gap',
    entities: [
      { label: 'Test', detail: 'Weld NDT (dye-penetrant) test advised as a troubleshooting step ', status: 'match' },
      { label: 'Root cause', detail: 'Vibration and temperature readings pointed to casing crack', status: 'gap' },
    ],
    sensors: 'NDE bearing temp 71°C rising · NDE vib RMS 8.4 mm/s',
    matchedNodes: ['RC-CASING-CRACK', 'DT-WELD-NDT', 'BFP-S0'],
    hiEdges: ['BFP-S0>DT-WELD-NDT', 'DT-WELD-NDT>RC-CASING-CRACK'],
    gap: true,
  },
]

// hidden for now — flip to true to re-enable the dots flying from resolved cards toward the graph
const SHOW_PARTICLES = false

// INC-0537 is the hero (the exception). Its re-weight + gap cards render full (entity lists);
// every other (reaffirm) incident stays a compact mini card — just the incident + chip + ✓.
const FOCUS_INCIDENT = 'INC-0537'

// The hero emits several cards on ONE per-incident phase. They SPAWN together (with every other
// card), but once the incident resolves they REVEAL one-by-one (in array order) for a sequenced
// cascade — so the yellow cards land separately, not all at once.
const FOCUS_CARDS = CARDS.filter((c) => c.incident === FOCUS_INCIDENT)
const HERO_STEP_MS = 600 // spacing between successive hero-card reveals

// As each "graph-imperfection" hero card resolves (re-weight + the 2 gaps), the graph flashes amber
// on a representative EXISTING node/edge for ~1s. The gaps' own nodes (casing crack / NDT) aren't on
// the graph yet, so we flash the nearest node already there. Edge keys are "SOURCE>TARGET".
const FLASH_BY_CARD: Record<string, { nodes: string[]; edges: string[] }> = {
  'c-0537-rw':  { nodes: ['RC-BENT-SHAFT'],                   edges: ['DT-PHASE>RC-BENT-SHAFT'] },
  'c-0537-gap': { nodes: ['BFP-S0', 'DT-WELD-NDT', 'RC-CASING-CRACK'], edges: ['DT-WELD-NDT>RC-CASING-CRACK'] },
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
  const runId = useDemo((s) => s.runId)
  const run = useDemo((s) => s.sectionRun.reso)
  const folded = useDemo((s) => s.sectionFolded.reso)
  const toggleFold = useDemo((s) => s.toggleFold)
  const setMatched = useDemo((s) => s.setMatched)
  const setReweight = useDemo((s) => s.setReweight)
  const setGap = useDemo((s) => s.setGap)
  const pulse = useDemo((s) => s.pulse)
  const setHover = useDemo((s) => s.setHover)
  const phases = useResolution(run, runId)
  const expanded = !folded

  // hero-card cascade: how many of INC-0537's cards have revealed so far (rest stay in matching).
  // Cards spawn together but flip from matching → revealed one-by-one once the incident resolves.
  const heroPhase = phases.get(FOCUS_INCIDENT) ?? 'pending'
  const [heroResolved, setHeroResolved] = useState(0)
  useEffect(() => { setHeroResolved(0) }, [runId])
  useEffect(() => {
    if (heroPhase !== 'resolved') { setHeroResolved(0); return }
    const timers = FOCUS_CARDS.map((_, i) => setTimeout(() => setHeroResolved(i + 1), i * HERO_STEP_MS))
    return () => timers.forEach(clearTimeout)
  }, [heroPhase, runId])

  // amber flash on the graph as each graph-imperfection card reveals (re-weight + the 2 gaps)
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

  // Per-incident expand state (mirrors the Documents tab): the hero (INC-0537) opens by default,
  // reaffirm incidents stay compact until clicked.
  const [manual, setManual] = useState<Record<string, boolean>>({})
  useEffect(() => { setManual({}) }, [runId])
  const isExpanded = (incId: string) => manual[incId] ?? (incId === FOCUS_INCIDENT)
  const toggleInc = (incId: string) => setManual((m) => ({ ...m, [incId]: !isExpanded(incId) }))

  // a card is still "matching" until its turn comes up (hero cascade) or its incident resolves
  const cardMatching = (card: ResCard) => {
    const phase = phases.get(card.incident) ?? 'pending'
    if (card.incident !== FOCUS_INCIDENT) return phase === 'matching'
    const idx = FOCUS_CARDS.findIndex((c) => c.id === card.id)
    return phase === 'matching' || (phase === 'resolved' && heroResolved <= idx)
  }

  // group visible incidents (INC-0537 first via INCIDENTS order), each holding its resolution cards
  const groups = INCIDENTS
    .map((inc) => ({ inc, cards: CARDS.filter((c) => c.incident === inc.id) }))
    .filter((g) => (phases.get(g.inc.id) ?? 'pending') !== 'pending')

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
    <section className="p-panel p-resolution" data-active={run} data-folded={folded}>
      <header className="p-panel-head" onClick={() => toggleFold('reso')}>
        <span className="p-panel-num">2</span>
        <span className="p-panel-title">Comparing against graph</span>
        <span className="p-panel-sub">{run ? 'match vs. graph' : 'waiting'}</span>
        <span className="p-caret" data-open={expanded}>▾</span>
      </header>

      {expanded && run && (
        <div className="p-res-body" ref={bodyRef}>
          {groups.map(({ inc, cards }) => {
            const phase = phases.get(inc.id) ?? 'pending'
            const color = INCIDENT_COLOR[inc.id]
            const focus = inc.id === FOCUS_INCIDENT
            const open = isExpanded(inc.id)
            const working = phase === 'matching'
            const revealed = cards.filter((c) => !cardMatching(c)).length
            const hasFlag = cards.some((c) => c.chipKind !== 'reaffirm')
            const allNodes = [...new Set(cards.flatMap((c) => c.matchedNodes))]
            const allEdges = [...new Set(cards.flatMap((c) => c.hiEdges ?? []))]
            return (
              <div key={inc.id} className="p-wf-card" data-outcome={inc.outcome} style={{ borderLeftColor: color, ['--inc' as string]: color }}>
                <div className="p-wf-head" onClick={() => toggleInc(inc.id)}
                  onMouseEnter={() => setHover({ nodes: allNodes, edges: allEdges, color: hasFlag ? '#F59E0B' : undefined })}
                  onMouseLeave={() => setHover(null)}>
                  <span className="p-doc-entry" style={{ background: color }}>incident</span>
                  <span className="p-doc-incident" style={{ color }}>{inc.id}</span>
                  <span className="p-doc-docs">{working ? 'matching…' : focus ? `${revealed}/${cards.length}` : 'matched'}</span>
                  {working && <span className="p-doc-spin"><span className="p-dots"><span /><span /><span /></span></span>}
                  <span className="p-wf-caret" data-open={open}>▾</span>
                </div>

                {open && (
                  <div className="p-wf-subs">
                    {cards.map((card) => {
                      const matching = cardMatching(card)
                      return (
                        <div key={card.id} ref={(el) => { cardRefs.current[card.id] = el }} className="p-res-row" data-kind={matching ? 'matching' : card.chipKind} style={{ ['--inc' as string]: color }}
                          onMouseEnter={() => setHover({ nodes: card.matchedNodes, edges: card.hiEdges ?? [], color: card.chipKind === 'reaffirm' ? undefined : '#F59E0B' })}
                          onMouseLeave={() => setHover(null)}>
                          <div className="p-res-top">
                            <span className="p-res-chip" data-kind={matching ? 'matching' : card.chipKind}>
                              {matching ? 'matching...' : card.chip}
                            </span>
                          </div>
                          {matching ? (
                            <div className="p-reveal"><span className="p-dots"><span /><span /><span /></span><span className="p-reveal-msg">resolving entities against the knowledge graph…</span></div>
                          ) : card.compare ? (
                            <div className="p-res-compare">
                              <div className="p-res-compare-cap">{card.compare.caption}</div>
                              {[{ ...card.compare.selected, on: true }, { ...card.compare.overruled, on: false }].map((d) => (
                                <div key={d.name} className="p-res-cmp-row" data-selected={d.on}>
                                  <span className="p-res-cmp-dot" />
                                  <span className="p-res-cmp-chip">{d.name} · {d.conf}%</span>
                                  {'tag' in d && d.tag && <span className="p-res-cmp-tag">{d.tag}</span>}
                                  <span className="p-res-cmp-verdict">{d.on ? 'selected' : 'overruled'}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <ul className="p-ent-list">
                              {card.entities.map((e, i) => (
                                <li key={i} className="p-ent" data-status={e.status}>
                                  <span className="p-ent-label">{e.label}</span>
                                  <span className="p-ent-detail">{e.detail}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {!matching && card.sensors && (
                            <div className="p-res-sensors"><span className="p-sensors-tag">SENSOR</span>{card.sensors}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
