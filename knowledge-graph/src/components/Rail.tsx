import { STEPS, TOTAL_STEPS } from '../data/steps'

export function Rail({ step }: { step: number }) {
  const copy = STEPS[step - 1]
  return (
    <aside id="p2-rail">
      <div>
        <div className="p2-rail-label">The story</div>
        <div id="p2-step-narration">
          <span className="p2-step-num">STEP {copy.n} / {TOTAL_STEPS}</span>
          <h2 className="p2-step-title">{copy.title}</h2>
          <div className="p2-step-goal">goal · {copy.goal}</div>
          <p className="p2-step-body">{copy.body}</p>
        </div>
      </div>

      <div className="p2-rail-bottom">
        <div id="p2-step-dots">
          {STEPS.map((s) => (
            <span
              key={s.n}
              className={
                'p2-dot' +
                (s.n === step ? ' p2-dot-current' : s.n < step ? ' p2-dot-done' : '')
              }
            />
          ))}
        </div>
        <div className="p2-mantra">
          documentation captures · data finds · evaluator judges · output produces
        </div>
      </div>
    </aside>
  )
}
