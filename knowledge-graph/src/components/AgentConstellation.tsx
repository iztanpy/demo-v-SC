import { TEAMS, AGENTS } from '../data/agents'
import type { TeamKey } from '../types'

// Constellation geometry — orchestrator at centre, 11 agents on a ring in team sectors.
const CX = 200
const CY = 360
const R = 140

const ANGLE: Record<string, number> = {
  // Data — right sector
  'data-retrieval': 35,
  'data-writer': 0,
  'data-guardian': -35,
  // Documentation — top sector
  'doc-transcript': 65,
  'doc-entity': 90,
  'doc-field': 115,
  // Evaluator — left sector
  'eval-rank': 145,
  'eval-tech': 180,
  'eval-sop': 215,
  // Output — bottom sector
  'out-wo': 255,
  'out-report': 285,
}

const SHORT: Record<string, string> = {
  'doc-transcript': 'Transcript',
  'doc-entity': 'Entity',
  'doc-field': 'Field Obs',
  'data-retrieval': 'Retrieval',
  'data-writer': 'Writer',
  'data-guardian': 'Guardian',
  'eval-rank': 'Ranking',
  'eval-tech': 'Tech Match',
  'eval-sop': 'SOP/Safety',
  'out-wo': 'Work Order',
  'out-report': 'Report',
}

const colorOf = (team: TeamKey) => TEAMS.find((t) => t.key === team)!.color

function pos(id: string) {
  const a = ((ANGLE[id] ?? 0) * Math.PI) / 180
  return { x: CX + R * Math.cos(a), y: CY - R * Math.sin(a) }
}

// Orchestrator → agent edge, gently curved for an organic feel.
function edgePath(x: number, y: number) {
  const dx = x - CX
  const dy = y - CY
  const len = Math.hypot(dx, dy) || 1
  const px = -dy / len
  const py = dx / len
  const mx = (CX + x) / 2
  const my = (CY + y) / 2
  const curve = 18
  return `M ${CX} ${CY} Q ${mx + px * curve} ${my + py * curve} ${x} ${y}`
}

export function AgentConstellation({
  activeAgents,
  live,
}: {
  activeAgents: string[]
  live: string
}) {
  const active = new Set(activeAgents)

  return (
    <aside id="p2-agent-panel">
      <div className="p2-panel-label">Agent Orchestration</div>

      <svg className="p2-constellation" viewBox="0 0 400 740" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="p2-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
          <radialGradient id="p2-orch-grad">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#00A651" />
          </radialGradient>
        </defs>

        {/* edges */}
        <g>
          {AGENTS.map((a) => {
            const { x, y } = pos(a.id)
            const on = active.has(a.id)
            const c = colorOf(a.team)
            return (
              <path
                key={a.id}
                id={`edge-${a.id}`}
                d={edgePath(x, y)}
                fill="none"
                stroke={on ? c : '#E2E8F0'}
                strokeWidth={on ? 2 : 1.2}
                opacity={on ? 0.9 : 0.5}
              />
            )
          })}
        </g>

        {/* dispatch particles (orchestrator → active agents) */}
        <g>
          {AGENTS.filter((a) => active.has(a.id)).map((a) => (
            <circle key={a.id} r={3.2} fill={colorOf(a.team)}>
              <animateMotion dur="1.5s" repeatCount="indefinite" calcMode="linear">
                <mpath href={`#edge-${a.id}`} />
              </animateMotion>
            </circle>
          ))}
        </g>

        {/* agent orbs */}
        {AGENTS.map((a) => {
          const { x, y } = pos(a.id)
          const on = active.has(a.id)
          const c = colorOf(a.team)
          return (
            <g key={a.id} className={'p2-orb' + (on ? ' p2-orb-active' : '')}>
              <circle className="p2-orb-halo" cx={x} cy={y} r={18} fill={c} filter="url(#p2-glow)" />
              <circle
                className="p2-orb-core"
                cx={x}
                cy={y}
                r={on ? 9 : 7}
                fill={on ? c : '#CBD5E1'}
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
              <text
                className="p2-orb-label"
                x={x}
                y={y + 20}
                textAnchor="middle"
                fill={on ? '#0F1B3D' : '#94A3B8'}
                fontWeight={on ? 700 : 500}
              >
                {SHORT[a.id]}
              </text>
            </g>
          )
        })}

        {/* orchestrator */}
        <g className="p2-orb p2-orb-active">
          <circle className="p2-orb-halo" cx={CX} cy={CY} r={30} fill="#00A651" filter="url(#p2-glow)" />
          <circle cx={CX} cy={CY} r={15} fill="url(#p2-orch-grad)" stroke="#FFFFFF" strokeWidth={2} />
          <text x={CX} y={CY + 32} textAnchor="middle" className="p2-orch-label">
            ORCHESTRATOR
          </text>
        </g>
      </svg>

      <div className="p2-live-caption">
        <span className="p2-live-dot" />
        <span>{live}</span>
      </div>
    </aside>
  )
}
