import { TEAMS, SKILLS } from '../data/agents'
import { STEPS } from '../data/steps'
import { useP2 } from '../store'
import { useStepTimeline } from '../useStepTimeline'

// Right panel — 4 agents (= teams), skills nested under each. Skills flash in timed beats:
// the current beat PULSES, finished beats show a steady DONE ✓, the rest stay idle. An agent
// card lights when any of its skills is pulsing or done this step.
export function AgentSidebar() {
  const step = useP2((s) => s.step)
  const toggleRight = useP2((s) => s.toggleRight)
  const { pulsing, done } = useStepTimeline(step)
  const live = STEPS[step - 1]?.live ?? ''

  function skillState(id: string): 'pulsing' | 'done' | 'idle' {
    if (pulsing.has(id)) return 'pulsing'
    if (done.has(id)) return 'done'
    return 'idle'
  }

  return (
    <aside id="p2-agent-panel">
      <div className="p2-panel-label">
        Agent Orchestration
        <button className="p2-drawer-btn" onClick={toggleRight} title="Collapse">›</button>
      </div>

      <div className="p2-agent-list">
        {TEAMS.map((agent) => {
          const skills = SKILLS.filter((s) => s.team === agent.key)
          const agentOn = skills.some((s) => pulsing.has(s.id) || done.has(s.id))
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
                  <div key={s.id} className="p2-skill-row" data-state={skillState(s.id)}>
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
