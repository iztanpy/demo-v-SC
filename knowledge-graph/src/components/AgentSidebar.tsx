import { TEAMS, SKILLS } from '../data/agents'

// Right panel — 4 agents (= teams), skills nested under each.
// An agent lights when any of its skills is active this step; each active skill
// highlights within it. activeAgents holds skill ids (unchanged from steps.ts).
export function AgentSidebar({
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

      <div className="p2-agent-list">
        {TEAMS.map((agent) => {
          const skills = SKILLS.filter((s) => s.team === agent.key)
          const agentOn = skills.some((s) => active.has(s.id))
          return (
            <div
              key={agent.key}
              className="p2-agent-card"
              data-on={agentOn}
              style={{ '--agent-color': agent.color } as React.CSSProperties}
            >
              <div className="p2-agent-head">
                <span className="p2-agent-dot" />
                <span className="p2-agent-name">{agent.label}</span>
                <span className="p2-agent-verb">{agent.verb}</span>
              </div>
              <div className="p2-skill-list">
                {skills.map((s) => (
                  <div key={s.id} className="p2-skill-row" data-on={active.has(s.id)}>
                    <span className="p2-skill-tick" />
                    <div className="p2-skill-text">
                      <span className="p2-skill-name">{s.name}</span>
                      <span className="p2-skill-role">{s.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="p2-live-caption">
        <span className="p2-live-dot" />
        <span>{live}</span>
      </div>
    </aside>
  )
}
