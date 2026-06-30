// ─────────────────────────────────────────────
// Hyperspace OS — Sembcorp Demo · Wave 1.5
// LIGHT THEME · personas panel external above tablet · Ops Control Tower view.
// render() is PURE PAINT — no timers, no animation kickoffs.
// ─────────────────────────────────────────────

// ═════════════════════════════════════════════
// DEMO TIMING KNOBS — edit these to retime the demo
// ═════════════════════════════════════════════
const TIMING = {
  // 1) GLOBAL 3-DOT LOADING THEATERS — speed multiplier.
  // Scales every staged "loading dots → content" reveal that runs through pushReveal:
  // Faye's initial-diagnosis load (5s/10s), each persona's screen reveal, the
  // action-step spinners — PLUS the post-call generating/analyzing-transcript stages.
  //   1 = as-tuned · 0.5 = twice as fast · 2 = twice as slow.
  dotsSpeed: 0.25,

  // 2) FAYE'S RIGHT-PANE AGENTIC WORKFLOW.
  faye: {
    // How long each agent card pulses "active" during Faye's triage
    // (Sensor Anomaly Inspector · Equipment Diagnostic Agent · Power Gen Critic). ms.
    // Nominally synced with the 5s diagnosis-load stage — if you retime the load feel
    // via dotsSpeed and want the cards to match, change this too.
    cardPulseMs: 5000,
    // Orchestration-narrative cascade (the reveal → pulse → check agent sequence in
    // the agent-orchestration view). Multiplier · 1 = as-tuned · lower = faster cascade.
    orchSpeed: 0.25,
  },
};
// helper — scales a base delay by the global 3-dot loader speed.
const dotsMs = (base) => Math.round((base || 0) * TIMING.dotsSpeed);

const state = {
  screen: 'monitoring',          // 'monitoring' | 'monitoring-notify' | 'monitoring-landed' | 'incident-detail'
  history: [],                   // nav stack
  activePersona: 'ops',          // 'ops' | 'onsite' | 'offsite' | 'analyst'
  part3: false,                  // Part 3 — "after learning" view: Faye re-triages a same-family BFP incident weeks later; AI now recommends casing crack. Switch in persona header. Stops at the diagnosis.
  bannerVisible: false,          // true during banner-display phase
  bannerKey: 'ops',              // W3.9 — which BANNER_COPY variant to render
  notifyTimer: null,             // setTimeout handle for banner fade
  incidentLanded: false,         // W3.10 — INC row no longer auto-visible; gated by byPersona[pKey].seen
  // ── Wave 3.2 — state pill state machine (W3.9 — TRIAGING/REVIEW_READY folded into TRIAGE_READY) ──
  incidentPhase: 'TRIAGE_READY', // 'TRIAGE_READY' | 'DISPATCHED_TO_ONSITE' | 'ONSITE_CONFIRMED' | 'AWAITING_ASSET_PERF'
  activeAgentId: null,
  agentStepIndex: {},
  arcTimers: [],                 // setTimeout handles for the sequencer (cleared on re-fire)
  // ── Wave 3.4 — right-pane toolbar + floating KG window ──
  logDropdownOpen: false,
  graphWinOpen: false,
  graphWinPos: { x: null, y: null },
  graphWinSize: { w: 460, h: 360 },
  // ── Wave 3.8 — right-pane drawer ──
  drawerOpen: false,
  // ── Wave 3.7 — Screen D tiered reveal + dispatch note ──
  screenDRevealStarted: false,
  assetChainRevealed: false,
  opsImpactRevealed: false,
  recommendationRevealed: false,
  dispatchNote: '',
  revealTimers: [],              // W3.9 — setTimeout handles for Screen D reveal (cleared on persona switch)
  // ── Wave 3.9 — per-persona ticket state model ──
  tickets: {
    'INC-2026-0537': {
      statePill: 'TRIAGE_READY', // mirrors state.incidentPhase via setStatePill()
      handoffPending: { ops: true, onsite: false, offsite: false, analyst: false },
      byPersona: {
        ops:     { seen: false, opened: false, actioned: false },
        onsite:  { seen: false, opened: false, actioned: false },
        offsite: { seen: false, opened: false, actioned: false },
        analyst: { seen: false, opened: false, actioned: false },
      },
    },
  },
  // ── Wave 3.9 — Screen D action-steps per persona ──
  actionSteps: {
    step1: { status: 'idle' },                                // idle | verifying | done
    step2: { status: 'locked', selectedEngineer: null },      // locked | finding | selecting | selected
    ctaEnabled: false,
  },
  // ── W13 R2 — Faye Initial Diagnosis gating ──
  faye: {
    diagnosisConfirmed: false,    // true after Faye clicks Confirm on Initial Diagnosis
    actionStepsSpawned: false,    // true after SOP Relevant section painted
    selectedOption: null,         // W19 — diagnosis option id picked by Faye (defaults to recommended)
    overrideReason: '',           // W40 — Faye's free-text reasoning when overriding the recommended diagnosis
    woReassignedTo: null,         // W19 — technician Faye resent WO-2026-1190-R1 to (escalation report)
    taskComplete: false,          // W19 — fast-forwarded to completion · RCA + service report generated
  },
  // ── W4 — Lim curated Screen D state ──
  lim: {
    checked: {},                       // map of inspection-item-id → true (W14 R2 — legacy · still populated for downstream paintLimChecklistComplete)
    revealStarted: false,
    summaryRevealed: false,
    callStarted: false,
    callEnded: false,
    transcriptAttached: false,
    diagnosisRevised: false,
    revisionTimestamp: null,
    // W4.1 — stage-gated checklist theater flags (dead post-W14 R2 — kept per WA #5)
    safetyTheaterFired: false,
    instrumentTheaterFired: false,
    rciTheaterFired: false,
    // W7 — Diagnosis Verdict + revised-diagnosis flow
    verdictSpawned: false,
    rejectClicked: false,
    confirmRevisedClicked: false,
    deviationRationale: '',            // Lim's free-text rationale for deviating to the offsite expert
    // ── W14 R2 — flat checklist + Assistant FAB state ──
    itemResults: {},                   // map of item-id → { type: 'tick'|'cross', photo?, voiceNote? }
    checklistRevealedTo: 1,            // 1..LIM_INSPECTION_CHECKLIST.length · sequential reveal cursor
    assistantButtonShown: false,       // FAB visibility flag · sticky after first appearance
  },
  // ── W4 — Ismail curated Screen D state ──
  ismail: {
    revealStarted: false,
    summaryRevealed: false,
    approvalGiven: false,
    approvalTimestamp: null,
  },
  // ── W6 — KG growth animation (P2 only · 10s after diagnosis-confirmed click) ──
  kgGrowthFired: false,
  // ── W5 — Priya / trading-desk state ──
  priyaUnlocked: false,
  priya: {
    escalationRevealStarted: false,
    escalationSummaryRevealed: false,
    selectedOption: null,
    decisionLocked: false,
    decisionTimestamp: null,
    demoEndBannerShown: false,
  },
};

// ── Wave 3.9 — ticket + persona helpers ──
function getCanonicalTicket() {
  return state.tickets['INC-2026-0537'];
}
function activePersonaTicketState() {
  return getCanonicalTicket().byPersona[state.activePersona];
}
function setStatePill(v) {
  state.incidentPhase = v;
  getCanonicalTicket().statePill = v;
}

const PERSONA_INITIALS = {
  ops:     { initials: 'FS',  name: 'Faye Sit',       workspace: 'Operations Control Tower' },
  onsite:  { initials: 'LWJ', name: 'Lim Wei Jie',    workspace: 'Engineer Workbench'        },
  offsite: { initials: 'AW',  name: 'Dr. A. Ismail'    },
  analyst: { initials: 'PS',  name: 'Priya Sundaram' },
};

const BANNER_COPY = {
  ops: {
    label: 'NEW INCIDENT · Hyperspace OS',
    body:  'JRG-CCGT-1 · Block 2 · BFP-3A · vibration anomaly · 02:47 SGT',
  },
  opsRouteBack: {
    label: 'ROUTED BACK · Hyperspace OS',
    body:  'INC-2026-0537 · Returned from <span class="dyn-name">Lim Wei Jie</span> · diagnosis revised via expert call · ops + commercial action required',
  },
  opsConfirmedReturn: {
    label: 'WO SUBMITTED · Hyperspace OS',
    body:  'INC-2026-0537 · Returned from <span class="dyn-name">Lim Wei Jie</span> · diagnosis confirmed · WO submitted · ops review required',
  },
  onsite: {
    label: 'INCOMING HANDOFF · Hyperspace OS',
    body:  'INC-2026-0537 · Routed from <span class="dyn-name">Faye Sit</span> · onsite fix dispatch · WO-2026-1190 attached',
  },
  offsite: {
    label: 'INCOMING HANDOFF · Hyperspace OS',
    body:  'INC-2026-0537 · Routed from <span class="dyn-name">Lim Wei Jie</span> · diagnosis revision + escalation pending sign-off',
  },
  analyst: {
    label: 'INCOMING ESCALATION · Hyperspace OS',
    body:  'INC-2026-0537 · Routed from <span class="dyn-name">Faye Sit</span> · trading desk decision required',
  },
};

// ── W7 — State pill labels (simplified chain · Ismail intermediate dropped) ──
const STATE_PILL_LABEL = {
  TRIAGE_READY:                     'TRIAGE READY',
  DISPATCHED_TO_ONSITE:             'DISPATCHED TO ONSITE',
  REVISED_DIAGNOSIS_ROUTED:         'ROUTED BACK · ACTION REQUIRED',
  DIAGNOSIS_CONFIRMED_WO_SUBMITTED: 'WO SUBMITTED · ROUTED',
  ROUTED_TO_TRADING_DESK:           'ROUTED TO TRADING DESK',
  HEDGED:                           'HEDGED · CLOSED',
};

// W5 — option labels for Priya's lock-decision footer
const PRIYA_OPTION_LABEL = {
  'hedge':       'Forward Q3 capacity hedge',
  'cross-site':  'Cross-site balance · Sakra-CCGT-1 standby',
  'spot':        'Spot market purchase · USEP peak',
  'curtailment': 'PSO curtailment notice',
};

// ── W4 — canonical incident row owner per active persona ──
const ROW_OWNER_BY_PERSONA = {
  ops:     { name: 'Faye Sit',         initials: 'FS'  },
  onsite:  { name: 'Lim Wei Jie',      initials: 'LWJ' },
  offsite: { name: 'Dr. A. Ismail',      initials: 'AW'  },
  analyst: { name: 'Priya Sundaram',   initials: 'PS'  },
};

const HANDOFF_NEXT = {
  ops:     'onsite',
  onsite:  'offsite',
  offsite: 'analyst',
  analyst: null,
};

const DISPATCH_LABEL = {
  ops:     'Lim Wei Jie',
  onsite:  'Dr. A. Ismail',
  offsite: 'Priya Sundaram',
};

const POST_DISPATCH_STATE_PILL = {
  ops:     'DISPATCHED_TO_ONSITE',
  // W7 — onsite/offsite no longer dispatch via this CTA path
};

// ── W13 R2 — Faye Summary "Initial Diagnosis" rationale rows ──
const INITIAL_DIAGNOSIS_RATIONALE = [
  { text: 'Vibration spectrum matches NDE bearing race spalling signature',
    strength: 'met',     badgeLabel: 'fully met' },
  { text: '1×RPM dominance · synchronous vibration component elevated',
    strength: 'partial', badgeLabel: 'partially met' },
  { text: 'Pattern-match · 3 prior BFP race-spalling failures across fleet (Jurong-CCGT-2 · Sakra-CCGT-1 · Banyan-CHP)',
    strength: 'met',     badgeLabel: 'fully met' },
  { text: 'Bearing temperature trend · NDE housing rising over last 4 hours',
    strength: 'partial', badgeLabel: 'partially met' },
  { text: 'Phase angle NDE-DE shift consistent with race-defect signature',
    strength: 'met',     badgeLabel: 'fully met' },
];

// W40 — "Full reasoning" rows for the recommended diagnosis (Shaft misalignment).
const SHAFT_MISALIGN_RATIONALE = [
  { text: 'Elevated 2×RPM harmonic alongside 1×RPM — characteristic misalignment spectrum',
    strength: 'met',     badgeLabel: 'fully met' },
  { text: 'NDE-DE phase shift ~180° across the coupling',
    strength: 'met',     badgeLabel: 'fully met' },
  { text: 'Vibration RMS elevated on BOTH NDE and DE bearing housings',
    strength: 'met',     badgeLabel: 'fully met' },
  { text: 'Pattern-match · misalignment-driven vibration on fleet BFPs',
    strength: 'partial', badgeLabel: 'partially met' },
  { text: 'Axial vibration component present but not fully resolved by current sensor set',
    strength: 'partial', badgeLabel: 'partially met' },
];

// ── Hardcoded incident data (Jurong-CCGT-1 BFP-3A) — W3.9 pivot ──
const INCIDENT = {
  id: 'INC-2026-0537',
  asset: 'JRG-CCGT-1 · Block 2 · BFP-3A',
  title: 'BFP-3A vibration RMS drift · NDE bearing housing',
  timestamp: '02:47 SGT · 2026-05-20',
  severity: 'AMBER',
  alarm: 'BFP-3A VIBRATION RMS DRIFT — NDE bearing housing exceeds ISO 10816-7 Zone C threshold (8.4 mm/s vs 7.1 mm/s alarm).',
  alarmSource: 'Bently Nevada 3500 / Honeywell Experion DCS',
  metrics: [
    { lbl: 'VIBRATION RMS · NDE', val: '8.4',   unit: 'mm/s', nom: 'ISO 10816-7 Zone C · alarm', tone: 'amber' },
    { lbl: 'VIBRATION RMS · DE',  val: '7.9',   unit: 'mm/s', nom: 'ISO 10816-7 Zone C · alarm', tone: 'amber' },
    { lbl: 'BEARING TEMP · NDE',  val: '78',    unit: '°C',   nom: 'Normal · trend rising',      tone: 'slate' },
    { lbl: 'SHAFT SPEED',         val: '2 985', unit: 'rpm',  nom: 'Nominal',                    tone: 'slate' },
  ],
  // W40 — recommended diagnosis is now Shaft misalignment (85%); Faye overrides to bearing race spalling.
  hypothesis: {
    primary: 'Shaft misalignment',
    confidence: 88,
    subtitle: 'Pending Onsite verification (Lim Wei Jie)',
    rationale: 'Elevated 2×RPM harmonic + ~180° NDE-DE phase shift across coupling match misalignment signature · pattern-matched across fleet BFPs',
  },
  // W19 — diagnosis options surfaced to Faye (primary = recommended). Each carries a one-line rationale
  // + a short "Full reasoning" dropdown (`details`) showing the single partial-match signal.
  // W40 — bearing race spalling demoted to a selectable alternate (Faye's override pick); keeps the full rationale.
  alternates: [
    { id: 'bearing-spalling', name: 'NDE bearing race spalling (early-stage)', conf: 80,
      rationale: 'Vibration spectrum + 1×RPM dominance match race-spalling signature · pattern-matched to 3 prior BFP failures across fleet',
      details: INITIAL_DIAGNOSIS_RATIONALE },
    { id: 'coupling-wear', name: 'Coupling wear', conf: 75,
      rationale: 'Coupling within last-service window · no sideband signature at coupling frequency',
      details: [
        { text: 'Vibration band partially overlaps coupling-wear signature', strength: 'partial', badgeLabel: 'partial match' },
      ] },
    { id: 'impeller-imbal', name: 'Impeller imbalance', conf: 70,
      rationale: 'Synchronous 1×RPM present, but no flow/head deviation consistent with imbalance',
      details: [
        { text: 'Synchronous 1×RPM component present', strength: 'partial', badgeLabel: 'partial match' },
      ] },
  ],
  chain: ['BFP-3A', 'HRSG-3', 'ST-3', 'GENERATOR-3', 'TRANSFORMER-3', 'SWITCHYARD-A'],
  vendor: 'Sulzer (BFP) · Bently Nevada 3500 (machinery protection)',
  historicalWOCount: 3,
};

// ── Part 3 — "after learning" rationale rows for the now-recommended casing-crack diagnosis ──
const CASING_CRACK_RATIONALE = [
  { text: 'Discharge-weld-toe fatigue signature — matches the resolved JRG-CCGT-1 BFP-3A casing crack (INC-2026-0537)',
    strength: 'met',     badgeLabel: 'fully met' },
  { text: 'Weld-NDT (dye-penetrant) confirmation step now part of the BFP vibration SOP after that case',
    strength: 'met',     badgeLabel: 'fully met' },
  { text: 'NDE bearing vibration + temperature rise consistent with secondary damage from a propagating casing crack',
    strength: 'met',     badgeLabel: 'fully met' },
  { text: '1×RPM dominance present — bearing-spalling look-alike now correctly de-prioritised',
    strength: 'partial', badgeLabel: 'partially met' },
  { text: 'Cyclic discharge-pressure loading on the Block 2 BFP volute — fatigue-conducive duty',
    strength: 'partial', badgeLabel: 'partially met' },
];

// ── Part 3 incident — same vibration readings, weeks later, sister unit (BFP-2B). The graph has
// learned the casing-crack failure mode from INC-0537, so the AI now leads with casing crack.
// Readings are shared verbatim with INCIDENT (the "same readings" point). View is Faye-only; stops
// at the diagnosis (no downstream workflow). getDiagnosisOptions() returns ACT3_INCIDENT.options
// when state.part3 is on; the recommended option is casing crack.
const ACT3_INCIDENT = {
  id: 'INC-2026-0612',
  asset: 'JRG-CCGT-1 · Block 2 · BFP-2B',
  title: 'BFP-2B vibration RMS drift · NDE bearing housing',
  timestamp: '03:14 SGT · 2026-06-18',
  severity: 'AMBER',
  alarm: 'BFP-2B VIBRATION RMS DRIFT — NDE bearing housing exceeds ISO 10816-7 Zone C threshold (8.4 mm/s vs 7.1 mm/s alarm).',
  alarmSource: 'Bently Nevada 3500 / Honeywell Experion DCS',
  metrics: INCIDENT.metrics,   // same readings as INC-0537 — the whole point of the contrast
  options: [
    { id: 'casing-crack', name: 'Pump casing crack / weld-toe fatigue', conf: 91, recommended: true,
      rationale: 'Discharge weld-toe fatigue — same failure mode the system confirmed on JRG-CCGT-1 BFP-3A (INC-2026-0537); weld-NDT step now standard',
      details: CASING_CRACK_RATIONALE, detailLabel: 'Full reasoning' },
    { id: 'shaft-misalign', name: 'Shaft misalignment', conf: 77, recommended: false,
      rationale: 'Elevated 2×RPM + ~180° NDE-DE phase shift — misalignment signature · down-weighted after the prior over-weight was corrected',
      details: SHAFT_MISALIGN_RATIONALE, detailLabel: 'Full reasoning' },
    { id: 'bearing-spalling', name: 'NDE bearing race spalling (early-stage)', conf: 73, recommended: false,
      rationale: 'Vibration spectrum + 1×RPM dominance overlap race-spalling · now secondary to the casing-crack pattern',
      details: INITIAL_DIAGNOSIS_RATIONALE, detailLabel: 'Full reasoning' },
    { id: 'coupling-wear', name: 'Coupling wear', conf: 68, recommended: false,
      rationale: 'Coupling within last-service window · no sideband signature at coupling frequency',
      details: [{ text: 'Vibration band partially overlaps coupling-wear signature', strength: 'partial', badgeLabel: 'partial match' }],
      detailLabel: 'Full reasoning' },
  ],
};

// Active incident for the Faye triage screen — swaps to the Part 3 incident when the switch is on.
function activeIncident() {
  return state.part3 ? ACT3_INCIDENT : INCIDENT;
}

// ── W19 — Work Order generated before dispatch ──
// Works-to-complete mirror the LIM_INSPECTION_CHECKLIST groups (Safety / Instrument / Root cause isolation),
// referenced at call time (LIM_INSPECTION_CHECKLIST is defined later in the file). R3 regenerates with the revised scope.
const WORK_ORDER = {
  id: 'WO-2026-1190',
};

// ── W19 — Regenerated Work Order after onsite deviation + revised diagnosis (pump casing crack) ──
const WORK_ORDER_REVISED = {
  id: 'WO-2026-1190-R1',
  diagnosis: 'Crack in pump casing on BFP-3A (bearing damage secondary)',
  checklist: [
    'Shut down BFP-3A · isolate Block 2 feedwater',
    'Casing NDT · dye-penetrant inspection at discharge weld',
    'Assess secondary NDE/DE bearing damage extent',
    'Escalate to Offsite Expert for sign-off per SOP-BFP-VIBR-001',
  ],
};

// ── Quantified impact summary — replaces the W45 service report on Lim's final page (compact card → expand modal) ──
const IMPACT_SUMMARY = {
  headline: [
    { k: 'Asset downtime', v: '~4h', note: 'BFP-3A offline · casing repair' },
    { k: 'Revenue at risk', v: '~SGD 2.4M', note: 'if unmitigated' },
  ],
  rows: [
    ['Asset offline', 'BFP-3A shut down · Block 2 feedwater isolated'],
    ['Estimated downtime', '~6h · casing dye-penetrant NDT + crack repair'],
    ['Generation impact', 'Block 2 derate ~50 MW if unmitigated'],
    ['PSO commitment window', '09:00–18:00 SGT · 4h peak tariff exposure'],
    ['Peak tariff', 'SGD 120/MWh'],
    ['Revenue at risk', '~SGD 2.4M (50 MW × 4h × SGD 120/MWh) · illustrative'],
    ['Action window', '45 min before T-zero PSO breach'],
    ['Mitigation eligible', 'PSO curtailment notice · Q3 forward capacity hedge'],
  ],
};

// ── W41 — Work Order provenance sources (AdvisorIQ-style "Sources" panel) ──
// Each source maps to a region of the WO document via `color`; `records` lists the concrete artifacts.
const WO_SOURCES = [
  {
    id: 's-machine', color: '#2563EB', agent: 'Sensor Anomaly Inspector',
    label: 'Machine history',
    desc: 'Asset identity and live condition pulled from the plant historian. The NDE bearing-housing vibration exceedance opened this work order.',
    records: ['BFP-3A · 90-day vibration RMS trend', 'NDE bearing · 30-day temperature trend', 'OSIsoft PI · 18-month telemetry', 'Bently Nevada 3500 · live machinery-protection feed'],
  },
  {
    id: 's-cases', color: '#D97706', agent: 'Equipment Diagnostic Agent',
    label: 'Past cases · BFP fleet RCAs',
    desc: 'Initial diagnosis and root-cause inspection scope pattern-matched against prior boiler-feed-pump failures across the Sembcorp fleet.',
    records: ['RCA · Jurong-CCGT-2 BFP · 2025-08', 'RCA · Sakra-CCGT-1 BFP · 2024-11', 'RCA · Banyan-CHP BFP · 2024-05'],
  },
  {
    id: 's-sop', color: '#00A651', agent: 'SOP Action Agent',
    label: 'SOP · BFP vibration investigation',
    desc: 'Safety isolation steps drawn from the standard operating procedure for boiler-feed-pump vibration response.',
    records: ['SOP-BFP-VIBR-001 · §2 Safety isolation', 'Lockout / tagout procedure', 'Confined-space + gas-check protocol'],
  },
  {
    id: 's-manual', color: '#DB2777', agent: 'BFP Maintenance Playbook Agent',
    label: 'Manuals & standards',
    desc: 'Instrument cross-checks and alarm thresholds drawn from OEM manuals and machinery-vibration standards.',
    records: ['Sulzer BFP · OEM maintenance manual', 'Bently Nevada 3500 · vibration-monitoring spec', 'ISO 10816-7 · alarm-zone thresholds'],
  },
];
// W41 — which source each "works to be completed" group is attributed to.
const WO_GROUP_SOURCE = { 'Safety': 's-sop', 'Instrument': 's-manual', 'Root cause isolation': 's-cases' };

// W41b — richer machine detail for the WO "Machine" block (attributed to Machine history).
// Duty/age figures illustrative; HPcp is Sulzer's barrel-casing boiler-feed-pump line.
const MACHINE_DETAIL = {
  asset: INCIDENT.asset,   // JRG-CCGT-1 · Block 2 · BFP-3A
  specs: [
    ['Equipment', 'Sulzer multi-stage barrel-casing boiler feed pump (HPcp series)'],
    ['Driver', 'ABB ACS variable-speed drive · 6.6 kV induction motor'],
    ['Rated duty', '720 m³/h · 1 980 m head · 7 stages · 2 985 rpm'],
    ['Protection', 'Bently Nevada 3500 · NDE + DE radial probes · API 670'],
    ['Commissioned', '2016-04 · 58 200 running hours'],
    ['Last major overhaul', '2023-06 · rotor element refurbished + balanced'],
  ],
  history: [
    ['2025-08', 'NDE bearing housing · lubrication service + vibration baseline reset'],
    ['2025-02', 'Coupling element · inspected · laser alignment within tolerance'],
    ['2024-09', 'Mechanical seal cartridge · replaced (Sulzer OEM)'],
    ['2024-03', 'DE bearing set · SKF replacement at 24 000-hr planned interval'],
    ['2023-06', 'Major overhaul · rotor refurbish · wear-ring + impeller clearance restored'],
  ],
};

// ── Persona roster ──
const PERSONAS = [
  { key: 'ops',     role: 'Ops · Control Tower',   name: 'FAYE SIT' },
  { key: 'onsite',  role: 'Onsite · Maint',         name: 'LIM WEI JIE' },
  { key: 'offsite', role: 'Offsite · Expert',       name: 'DR. A. WONG' },
  { key: 'analyst', role: 'Asset Perf · Analyst',   name: 'PRIYA SUNDARAM' },
];

// ── Persona scene SVGs (light-theme retuned) ──
// Stroke #475569 (slate-600) for silhouette/structure, #00A651 (Sembcorp green) for active accents,
// #94A3B8 (slate-400) for schematic lines.
const PERSONA_SCENES = {
  ops: `
    <svg viewBox="0 0 140 70" xmlns="http://www.w3.org/2000/svg">
      <!-- 3-monitor wall -->
      <rect x="6"   y="10" width="36" height="22" rx="2" fill="#FFFFFF" stroke="#00A651" stroke-width="0.7"/>
      <rect x="48"  y="6"  width="44" height="26" rx="2" fill="#FFFFFF" stroke="#00A651" stroke-width="0.7"/>
      <rect x="98"  y="10" width="36" height="22" rx="2" fill="#FFFFFF" stroke="#00A651" stroke-width="0.7"/>
      <!-- gridlines in center monitor -->
      <line x1="55" y1="13" x2="86" y2="13" stroke="#94A3B8" stroke-width="0.4" stroke-dasharray="2,2"/>
      <line x1="55" y1="20" x2="86" y2="20" stroke="#94A3B8" stroke-width="0.4" stroke-dasharray="2,2"/>
      <!-- alert dot -->
      <circle cx="68" cy="20" r="2.4" fill="#F59E0B"/>
      <circle cx="68" cy="20" r="5"   fill="none" stroke="#F59E0B" stroke-width="0.5" opacity="0.55"/>
      <!-- silhouette -->
      <circle cx="70" cy="52" r="5.5" fill="#475569"/>
      <path d="M 56 70 Q 70 56 84 70 Z" fill="#475569"/>
    </svg>`,
  onsite: `
    <svg viewBox="0 0 140 70" xmlns="http://www.w3.org/2000/svg">
      <!-- turbine -->
      <ellipse cx="95" cy="36" rx="14" ry="22" fill="#FFFFFF" stroke="#475569" stroke-width="0.7"/>
      <line x1="95" y1="14" x2="95" y2="58" stroke="#94A3B8" stroke-width="0.5"/>
      <line x1="83" y1="36" x2="107" y2="36" stroke="#94A3B8" stroke-width="0.5"/>
      <circle cx="95" cy="36" r="5" fill="none" stroke="#475569" stroke-width="0.6"/>
      <!-- hard hat silhouette -->
      <path d="M 32 28 Q 32 20 44 20 Q 56 20 56 28 L 56 30 L 32 30 Z" fill="#00A651"/>
      <rect x="30" y="29" width="28" height="2" fill="#475569"/>
      <circle cx="44" cy="36" r="4.5" fill="#475569"/>
      <path d="M 30 66 Q 44 44 58 66 Z" fill="#475569"/>
      <!-- tablet -->
      <rect x="56" y="46" width="14" height="10" rx="1" fill="#FFFFFF" stroke="#475569" stroke-width="0.6"/>
    </svg>`,
  offsite: `
    <svg viewBox="0 0 140 70" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="50" width="112" height="3" fill="#94A3B8"/>
      <!-- left monitor: schematic -->
      <rect x="22" y="14" width="42" height="32" rx="2" fill="#FFFFFF" stroke="#475569" stroke-width="0.6"/>
      <line x1="28" y1="22" x2="58" y2="22" stroke="#94A3B8" stroke-width="0.4"/>
      <line x1="28" y1="28" x2="58" y2="28" stroke="#94A3B8" stroke-width="0.4"/>
      <line x1="28" y1="34" x2="58" y2="34" stroke="#94A3B8" stroke-width="0.4"/>
      <rect x="32" y="24" width="6" height="6" fill="#94A3B8"/>
      <rect x="44" y="30" width="6" height="6" fill="#94A3B8"/>
      <line x1="38" y1="27" x2="44" y2="33" stroke="#475569" stroke-width="0.5"/>
      <!-- right monitor -->
      <rect x="76" y="14" width="42" height="32" rx="2" fill="#FFFFFF" stroke="#475569" stroke-width="0.6"/>
      <line x1="80" y1="22" x2="114" y2="22" stroke="#94A3B8" stroke-width="0.4"/>
      <line x1="80" y1="28" x2="114" y2="28" stroke="#94A3B8" stroke-width="0.4"/>
      <line x1="80" y1="34" x2="114" y2="34" stroke="#94A3B8" stroke-width="0.4"/>
      <!-- silhouette -->
      <circle cx="70" cy="58" r="4.5" fill="#475569"/>
      <path d="M 58 70 Q 70 62 82 70 Z" fill="#475569"/>
    </svg>`,
  analyst: `
    <svg viewBox="0 0 140 70" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="50" width="112" height="3" fill="#94A3B8"/>
      <!-- monitor -->
      <rect x="38" y="10" width="64" height="36" rx="2" fill="#FFFFFF" stroke="#475569" stroke-width="0.7"/>
      <!-- bar chart -->
      <rect x="46" y="34" width="6" height="8"  fill="#00A651"/>
      <rect x="56" y="28" width="6" height="14" fill="#00A651"/>
      <rect x="66" y="22" width="6" height="20" fill="#00A651"/>
      <rect x="76" y="18" width="6" height="24" fill="#00A651"/>
      <rect x="86" y="14" width="6" height="28" fill="#00A651"/>
      <line x1="44" y1="42" x2="96" y2="42" stroke="#475569" stroke-width="0.5"/>
      <!-- dollar overlay -->
      <text x="91" y="22" font-family="monospace" font-size="10" fill="#DB2777" font-weight="bold">$</text>
      <!-- silhouette -->
      <circle cx="70" cy="58" r="4.5" fill="#475569"/>
      <path d="M 58 70 Q 70 62 82 70 Z" fill="#475569"/>
    </svg>`,
};

// ── Pre-existing incident roster (locked, Sembcorp-canonical) — W2.6 ──
const PRE_EXISTING_INCIDENTS = [
  {
    id: 'INC-2026-0521',
    asset: 'Jurong-CCGT-2 · BFP-2A',
    body: 'Bearing vibration trending within OEM band — surveillance only.',
    severity: 'GREEN',
    state: 'MONITORING',
    age: '2h 14m ago',
    owner: 'Faye Sit',
    ownerInitials: 'FS',
    clickable: false,
    // W3.6 — inline dynamic content shown next to state pill
    dynamicTagText: { label: 'update expected in', value: '35m', from: 'Lim Wei Jie' },
  },
  {
    id: 'INC-2026-0529',
    asset: 'Sakra-CCGT-1 · ST-1',
    body: 'LP turbine exhaust pressure rise — wash cycle scheduled per OEM PTC.',
    severity: 'AMBER',
    state: 'SCHEDULED',
    age: '58m ago',
    owner: 'Faye Sit',
    ownerInitials: 'FS',
    clickable: false,
    dynamicTagText: { label: 'task scheduled for', value: '06:30 SGT', from: 'M. Lim' },
  },
  {
    id: 'INC-2026-0532',
    asset: 'Banyan-CHP · Cooling Tower 2',
    body: 'CT2 fill media plugging — supplementary cooling engaged.',
    severity: 'RED',
    state: 'MONITORING',
    age: '31m ago',
    owner: 'Faye Sit',
    ownerInitials: 'FS',
    clickable: false,
    dynamicTagText: { label: 'update expected in', value: '12m', from: 'J. Tan' },
  },
];

// ── W3.10 — Per-persona own-task arrays (static theater) ──
const PERSONA_OWN_TASKS = {
  ops: PRE_EXISTING_INCIDENTS, // 3 fleet incidents preserved verbatim
  onsite: [
    {
      id: 'WO-2026-1182',
      asset: 'JRG-CCGT-1 · GT-2',
      body: 'GT-2 borescope inspection · stage 1 compressor',
      severity: 'INFO', state: 'SCHEDULED 09:00 SGT', stateClass: 'info',
      age: '—', owner: 'Lim Wei Jie', ownerInitials: 'LWJ',
      clickable: false, dynamicTagText: null,
    },
    {
      id: 'WO-2026-1156',
      asset: 'JRG-CCGT-1 · BFP-2B',
      body: 'BFP-2B coupling re-greasing',
      severity: 'INFO', state: 'IN PROGRESS', stateClass: 'info',
      age: '—', owner: 'Lim Wei Jie', ownerInitials: 'LWJ',
      clickable: false, dynamicTagText: null,
    },
    {
      id: 'WO-2026-1173',
      asset: 'JRG-CCGT-1 · HRSG-2',
      body: 'HRSG-2 hand valve overhaul · awaiting parts',
      severity: 'INFO', state: 'BLOCKED · PARTS ETA 4D', stateClass: 'info',
      age: '—', owner: 'Lim Wei Jie', ownerInitials: 'LWJ',
      clickable: false, dynamicTagText: null,
    },
  ],
  offsite: [
    {
      id: 'RCA-2026-0034',
      asset: 'Sakra-CCGT-1 · GT-1',
      body: 'Sakra-CCGT-1 GT-1 trip RCA · lead investigator',
      severity: 'INFO', state: 'IN PROGRESS', stateClass: 'info',
      age: '—', owner: 'Dr. A. Ismail', ownerInitials: 'AW',
      clickable: false, dynamicTagText: null,
    },
    {
      id: 'ER-2026-0089',
      asset: 'Jurong-CCGT-2 · BFP',
      body: 'Jurong-CCGT-2 BFP overhaul technical review',
      severity: 'INFO', state: 'AWAITING INPUT', stateClass: 'info',
      age: '—', owner: 'Dr. A. Ismail', ownerInitials: 'AW',
      clickable: false, dynamicTagText: null,
    },
    {
      id: 'CR-2026-0156',
      asset: 'Tuas-Power · Generator',
      body: 'Tuas-Power generator stator advisory · stakeholder call',
      severity: 'INFO', state: 'SCHEDULED 11:00 SGT', stateClass: 'info',
      age: '—', owner: 'Dr. A. Ismail', ownerInitials: 'AW',
      clickable: false, dynamicTagText: null,
    },
  ],
  analyst: [
    {
      id: 'TRD-2026-0218',
      asset: 'Sakra-CCGT-1 · Block 1',
      body: 'Cross-site balancing · Sakra-CCGT-1 standby evaluation · capacity reserve sizing',
      severity: 'INFO', state: 'IN PROGRESS', stateClass: 'info',
      age: '—', owner: 'Priya Sundaram', ownerInitials: 'PS',
      clickable: false, dynamicTagText: null,
    },
    {
      id: 'TRD-2026-0224',
      asset: 'Jurong-CCGT-1 · Forward Curve',
      body: 'USEP forward curve review · Q3 capacity hedge eligibility',
      severity: 'INFO', state: 'IN PROGRESS', stateClass: 'info',
      age: '—', owner: 'Priya Sundaram', ownerInitials: 'PS',
      clickable: false, dynamicTagText: null,
    },
    {
      id: 'TRD-2026-0231',
      asset: 'PSO commitment ledger',
      body: 'PSO dispatch reconciliation · daily close',
      severity: 'INFO', state: 'IN PROGRESS', stateClass: 'info',
      age: '—', owner: 'Priya Sundaram', ownerInitials: 'PS',
      clickable: false, dynamicTagText: null,
    },
  ],
};

function buildPersonaOwnTasks(personaKey) {
  return PERSONA_OWN_TASKS[personaKey] || [];
}

// ── Helpers ──
function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

// W3.6 — multi-source caption helpers (3 source styles: hyperspace / knowledge-graph / netzero-os)
function buildHyperspaceCaption(extraClass) {
  const cap = el('div', 'hyperspace-source' + (extraClass ? ' ' + extraClass : ''));
  cap.innerHTML = `<span class="hyperspace-source-icon">✦</span> hyperspace.live`;
  return cap;
}
function buildKGSourceCaption() {
  const cap = el('div', 'kg-source');
  cap.innerHTML = `
    <span class="kg-source-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 3a3 3 0 0 0-3 3v1a3 3 0 0 0-1 5 3 3 0 0 0 1 5v1a3 3 0 0 0 3 3"/>
        <path d="M15 3a3 3 0 0 1 3 3v1a3 3 0 0 1 1 5 3 3 0 0 1-1 5v1a3 3 0 0 1-3 3"/>
        <line x1="12" y1="3" x2="12" y2="21"/>
      </svg>
    </span> knowledge-graph.live`;
  return cap;
}
function buildNetzeroCaption() {
  const cap = el('div', 'nz-source');
  cap.innerHTML = `<span class="nz-source-icon">✦</span> netzero-os.live`;
  return cap;
}

function goto(n) {
  state.history.push(state.screen);
  state.screen = n;
  render();
}

function back() {
  if (!state.history.length) return;
  state.screen = state.history.pop();
  render();
}

// ── Personas panel (external, above tablet) — W7: Ismail tile removed (3 tiles) ──
// W8 Section 0 Part 1 — diff-update (build once, mutate attrs/classes on subsequent calls).
// Preserves in-flight .persona-tile-pulse keyframe — fixes "flash" caused by innerHTML wipe restarting pulse from 0%.
function renderPersonasPanel() {
  const row = document.getElementById('personas-row');
  if (!row) return;
  const ticket = getCanonicalTicket();
  const visiblePersonas = PERSONAS.filter(p => p.key !== 'offsite' && p.key !== 'analyst');

  // Lazy build — first call only.
  if (!row.dataset.built) {
    row.innerHTML = '';
    visiblePersonas.forEach(p => {
      const tile = el('div', 'persona-tile');
      tile.dataset.personaKey = p.key;
      tile.innerHTML = `
        <div class="persona-scene">${PERSONA_SCENES[p.key]}</div>
        <div class="persona-label">
          <span class="persona-role">${p.role}</span>
          <span class="persona-name">${p.name}</span>
        </div>`;
      tile.addEventListener('click', () => onPersonaTileClick(p.key));
      row.appendChild(tile);
    });
    row.dataset.built = '1';
  }

  // Diff-update — runs every render(), only touches attrs/classes.
  visiblePersonas.forEach(p => {
    const tile = row.querySelector(`.persona-tile[data-persona-key="${p.key}"]`);
    if (!tile) return;
    let dataState;
    if (p.key === state.activePersona) dataState = 'active';
    else if (p.key === 'analyst' && !state.priyaUnlocked) dataState = 'locked';
    else                               dataState = 'available';
    if (tile.getAttribute('data-state') !== dataState) {
      tile.setAttribute('data-state', dataState);
    }
    const shouldPulse = dataState !== 'locked' && ticket && ticket.handoffPending[p.key];
    const hasPulse = tile.classList.contains('persona-tile-pulse');
    if (shouldPulse && !hasPulse) {
      tile.classList.add('persona-tile-pulse');
    } else if (!shouldPulse && hasPulse) {
      tile.classList.remove('persona-tile-pulse');
    }
    // If pulse already on + still should be on → leave class untouched (preserves keyframe phase).
  });
}

function onPersonaTileClick(personaKey) {
  if (personaKey === 'analyst' && !state.priyaUnlocked) return;
  if (personaKey === state.activePersona) return;
  switchToPersona(personaKey);
}

// ── Part 3 switch (persona header) — flip Faye's triage between "initial triage" and "after learning" ──
// On either flip we land on Faye's incident-detail triage screen with a fresh selection, so the two
// views read as an A/B of the SAME readings. Part 3 paints the diagnosis instantly + stops there.
function setPart3(on) {
  if (state.part3 === on) return;
  cancelInProgressReveal();
  state.part3 = on;
  // reset Faye's triage so each view default-selects its own recommended option fresh
  state.faye.selectedOption = null;
  state.faye.overrideReason = '';
  state.faye.diagnosisConfirmed = false;
  state.faye.actionStepsSpawned = false;
  // land on Faye's triage screen in both modes
  state.activePersona = 'ops';
  state.screen = 'incident-detail';
  const bp = getCanonicalTicket().byPersona.ops;
  bp.seen = true; bp.opened = true; bp.actioned = false;
  syncActSwitch();
  render();
}

function syncActSwitch() {
  const t = document.getElementById('act-toggle');
  if (t) t.setAttribute('aria-checked', state.part3 ? 'true' : 'false');
}

function switchToPersona(personaKey) {
  // W7 — offsite tile removed; guard against any stray call
  if (personaKey === 'offsite') return;
  cancelInProgressReveal();
  state.activePersona = personaKey;
  state.screen = 'monitoring';
  state.history = [];
  state.bannerVisible = false;
  if (state.notifyTimer) { clearTimeout(state.notifyTimer); state.notifyTimer = null; }
  // W3.9 — reset Screen D action-steps per persona switch
  state.actionSteps = {
    step1: { status: 'idle' },
    step2: { status: 'locked', selectedEngineer: null },
    ctaEnabled: false,
  };
  render();
  updateAgentDimmingForActivePersona();
}

function cancelInProgressReveal() {
  if (state.revealTimers && state.revealTimers.length) {
    state.revealTimers.forEach(t => clearTimeout(t));
    state.revealTimers = [];
  }
}

// ─────────────────────────────────────────────
// W6 — right-pane agent lifecycle helper + per-persona dim
// ─────────────────────────────────────────────

const AGENT_PERSONA_RELEVANCE = {
  // W7 — offsite persona removed from all relevance arrays
  // W8 — sop-action + audio-transcription added (Section A)
  orchestrator:          ['ops', 'onsite', 'analyst'],
  inspection:            ['ops', 'onsite'],
  triage:                ['ops', 'onsite'],
  'diag-hrsg':           [],
  'diag-electrical':     [],
  playbook:              ['ops', 'onsite'],
  'sop-action':          ['ops', 'onsite'],
  'audio-transcription': ['onsite'],
  'wo-prefill':          ['ops'],
  workflow:              ['ops', 'onsite', 'analyst'],  // a.k.a. A2A Coordination Agent
  learning:              ['analyst'],
  'critic-power-gen':    ['ops', 'onsite'],
  'critic-renewables':   [],
  'critic-networks':     [],
  hse:                   ['onsite'],
  pl:                    ['ops', 'analyst'],
  'market-intelligence': ['analyst'],
};

function fireAgentCardLifecycle(agentId, durationMs = 5000) {
  if (!agentId) return;
  const card = document.querySelector(`.agent-card[data-agent-id="${agentId}"]`);
  if (!card) return;
  card.classList.remove('agent-card-pulse');
  card.dataset.state = 'active';
  void card.offsetWidth; // restart animation
  card.classList.add('agent-card-pulse');
  setTimeout(() => {
    if (card.dataset.state === 'active') {
      card.classList.remove('agent-card-pulse');
      card.dataset.state = 'done';
    }
  }, durationMs);
}

function fireAgentCardsParallel(agentIds, durationMs) {
  (agentIds || []).forEach(id => fireAgentCardLifecycle(id, durationMs));
}

function updateAgentDimmingForActivePersona() {
  const personaKey = state.activePersona;
  document.querySelectorAll('.agent-card').forEach(card => {
    const agentId = card.dataset.agentId;
    const isStandby = card.classList.contains('standby');
    const relevant = (AGENT_PERSONA_RELEVANCE[agentId] || []).includes(personaKey);
    card.classList.toggle('agent-dim', !isStandby && !relevant);
  });
}

function initAgentCardStates() {
  document.querySelectorAll('.agent-card').forEach(card => {
    if (!card.dataset.state) card.dataset.state = 'idle';
  });
}

// ── W4 / W5 — per-persona Screen D dispatcher (state-aware for ops) ──
function renderIncidentDetailView(root) {
  // Part 3 — Faye-only re-triage; bypass persona/escalation routing and always show her triage screen.
  if (state.part3) return renderOpsIncidentDetail(root);
  const ticket = getCanonicalTicket();
  switch (state.activePersona) {
    case 'ops': {
      const pill = ticket && ticket.statePill;
      // W7 — Escalation Report fires on revised or confirmed return paths (plus downstream Priya states)
      if (pill === 'REVISED_DIAGNOSIS_ROUTED' ||
          pill === 'DIAGNOSIS_CONFIRMED_WO_SUBMITTED' ||
          pill === 'ROUTED_TO_TRADING_DESK' ||
          pill === 'HEDGED') {
        return renderOpsEscalationReport(root);
      }
      return renderOpsIncidentDetail(root);
    }
    case 'onsite':  return renderOnsiteIncidentDetail(root);
    case 'offsite': return renderOffsiteIncidentDetail(root);  // W7 — tile removed; path dead
    case 'analyst': return renderAnalystIncidentDetail(root);
  }
}

// ── Ops Control Tower incident detail view (Screen D) — W3.9 rewrite ──
// Banner + metrics + 2-stage loading theater + Summary report + Action Steps + Notes.
function renderOpsIncidentDetail(root) {
  const content = el('div', 'tablet-content');
  content.id = 'incident-detail-view';

  // (A) header band — green gradient + back chevron + title/ID/severity
  const inc = activeIncident();
  const hdr = el('div', 'inc-header');
  hdr.innerHTML = `
    <span class="inc-back">
      <svg viewBox="0 0 8 13" fill="none">
        <path d="M7 1L1 6.5L7 12" stroke="rgba(255,255,255,0.85)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Back
    </span>
    <div class="inc-hdr-row">
      <div class="inc-hdr-left">
        <div class="inc-workspace">${PERSONA_INITIALS.ops.workspace}</div>
        <div class="inc-title">${inc.asset}</div>
        <div class="inc-id">${inc.id}</div>
        <div class="inc-ts">${inc.timestamp}</div>
      </div>
      <span class="sev-pill" data-severity="${inc.severity}">▲ Severity: ${inc.severity}</span>
    </div>`;
  content.appendChild(hdr);

  // (B) Metrics card (2×2 grid)
  const grid = el('div', 'metrics-card');
  inc.metrics.forEach(m => {
    const cell = el('div', 'metric-cell');
    cell.innerHTML = `
      <div class="mc-lbl">${m.lbl}</div>
      <div class="mc-val ${m.tone}">${m.val}<span class="mc-unit">${m.unit}</span></div>
      <div class="mc-nom">${m.nom}</div>`;
    grid.appendChild(cell);
  });
  content.appendChild(grid);

  // (C) Summary report slot — placeholder or completed
  const summarySlot = el('div', 'summary-slot');
  summarySlot.id = 'summary-slot';
  content.appendChild(summarySlot);

  // (D) Action Steps slot — W8 B: Notes section now lives INSIDE Step 2 (between Lim row + Confirm CTA).
  const actionSlot = el('div', 'action-steps-slot');
  actionSlot.id = 'action-steps-slot';
  content.appendChild(actionSlot);

  // Back button — pops state.history
  const backBtn = content.querySelector('.inc-back');
  if (backBtn) {
    backBtn.style.cursor = 'pointer';
    backBtn.addEventListener('click', backToMonitoring);
  }

  root.appendChild(content);

  // Drive content into the slots based on per-persona state
  const personaState = activePersonaTicketState();
  if (personaState.actioned) {
    // Already actioned — paint completed Summary + Action Steps + capture footer.
    // W13 R2 — re-entry must reflect locked diagnosis state.
    state.faye.diagnosisConfirmed = true;
    state.faye.actionStepsSpawned = true;
    paintSummaryComplete(summarySlot);
    paintActionStepsComplete(actionSlot);
    setTimeout(appendDispatchCaptureFooter, 200);
  } else if (state.part3) {
    // Part 3 — the AI re-analysed after learning and now recommends casing crack. Play the same
    // 2-stage agent loading theater as the initial triage, then STOP at the diagnosis (the
    // re-entry action-steps branch is gated on diagnosisConfirmed, false on a fresh switch).
    startScreenDRevealW39(summarySlot, actionSlot);
  } else {
    // First open or in-progress — kick off the 2-stage reveal; Action Steps now gated on Confirm click.
    startScreenDRevealW39(summarySlot, actionSlot);
  }
}

// ── W3.9 — Standalone Notes section (formerly inside diag-hypothesis-card) ──
function buildNotesSectionStandalone() {
  const wrap = el('div', 'notes-standalone');
  wrap.innerHTML = `
    <div class="notes-section">
      <div class="notes-header">
        <span class="notes-title">Note for onsite engineer</span>
        <button class="notes-mic-btn" data-recording="false" type="button">
          <svg class="mic-ic" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V5a3 3 0 0 0-3-3zm5 9a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/>
          </svg>
          <span class="notes-mic-lbl">Record</span>
        </button>
      </div>
      <textarea class="notes-textarea" placeholder="Optional note — voice or type." readonly>${state.dispatchNote || ''}</textarea>
    </div>`;
  return wrap;
}

// ── W3.9 — 2-stage Summary reveal + Action Steps lifecycle ──
function startScreenDRevealW39(summarySlot, actionSlot) {
  // Stage 1: Inspection placeholder paints immediately (t=0)
  summarySlot.innerHTML = `
    <div class="reveal-pending" data-stage="summary">
      <div class="reveal-dots"><span></span><span></span><span></span></div>
      <div class="reveal-msg">
        <span class="reveal-agent">Sensor Anomaly Inspector</span> ·
        Loading incident summary for <strong>Faye Sit</strong>
      </div>
    </div>`;
  // W6 — fire right-pane card lifecycle synced with Loading #1
  fireAgentCardLifecycle('inspection', TIMING.faye.cardPulseMs);

  // Stage 2 at t=5s: swap to Summary report shell + embedded Triage placeholder
  pushReveal(() => {
    summarySlot.innerHTML = `
      <div class="summary-report" data-block-real="summary">
        <div class="sr-heading">Initial Diagnosis${state.part3 ? ` <span class="sr-act-chip">After learning · ${ACT3_INCIDENT.id}</span>` : ''}</div>
        <div class="sr-body" id="sr-body">
          <div class="reveal-pending" data-stage="hypothesis">
            <div class="reveal-dots"><span></span><span></span><span></span></div>
            <div class="reveal-msg">
              <span class="reveal-agent">Equipment Diagnostic Agent</span> ·
              Loading diagnosis hypothesis
            </div>
          </div>
        </div>
      </div>`;
    // W6 — fire triage + power-gen critic synced with Loading #2
    fireAgentCardsParallel(['triage', 'critic-power-gen'], TIMING.faye.cardPulseMs);
  }, 5000);

  // Stage 3 at t=10s: swap Triage placeholder for Initial Diagnosis summary + Rationale + Confirm CTA
  pushReveal(() => {
    paintSummaryComplete(summarySlot);
    // W13 R2 — re-entry mid-flow (Faye exits + returns before dispatch while diagnosisConfirmed=true):
    // re-paint Action Steps in their current state. DOM was wiped; flag stays true so re-spawn helper bypasses guard.
    if (state.faye.diagnosisConfirmed && !document.querySelector('.action-steps')) {
      state.faye.actionStepsSpawned = false;
      spawnSOPRelevantNextBestActions();
    }
  }, 10000);

  // W13 R2 — Action Steps NO LONGER auto-spawned at t=10s on first open.
  // Action Steps gated on Confirm click → onInitialDiagnosisConfirmClick → spawnSOPRelevantNextBestActions.
}

// W19 — diagnosis options: primary (recommended) + 3 alternates, each w/ confidence + rationale + dropdown rows.
// W40 — name of the diagnosis Faye actually captured (may differ from the AI recommendation after override).
function capturedDiagnosisName() {
  const id = (state.faye && state.faye.selectedOption) || 'primary';
  const opt = getDiagnosisOptions().find(o => o.id === id);
  return opt ? opt.name : INCIDENT.hypothesis.primary;
}

// W40 — minimal HTML escape for operator-typed override reasoning rendered into innerHTML.
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getDiagnosisOptions() {
  if (state.part3) return ACT3_INCIDENT.options;   // Part 3 — casing crack recommended
  const hyp = INCIDENT.hypothesis;
  return [
    { id: 'primary', name: hyp.primary, conf: hyp.confidence, rationale: hyp.rationale, recommended: true,
      details: SHAFT_MISALIGN_RATIONALE, detailLabel: 'Full reasoning' },
    ...INCIDENT.alternates.map(a => ({ id: a.id, name: a.name, conf: a.conf, rationale: a.rationale, recommended: false,
      details: a.details || [], detailLabel: 'Full reasoning' })),
  ];
}

// W19 — build the rationale rows (strength-badged) for an option's dropdown.
function buildRationaleRows(details) {
  return (details || []).map(r => `
    <div class="sr-rationale-row" data-strength="${r.strength}">
      <span class="sr-rat-bullet">·</span>
      <span class="sr-rat-text">${r.text}</span>
      <span class="sr-rat-badge sr-rat-badge-${r.strength}">${r.badgeLabel}</span>
    </div>
  `).join('');
}

function paintSummaryComplete(summarySlot) {
  // W19 — heading "Initial Diagnosis" now lists ALL options (recommended + alternates) w/ confidence + rationale.
  // User picks one (default = recommended); Confirm captures the choice. Primary keeps the detailed rationale dropdown.
  const options = getDiagnosisOptions();
  const recId = (options.find(o => o.recommended) || options[0]).id;
  // Default-select the recommended option on first paint (id differs in Part 3 → casing-crack).
  if (state.faye && !state.faye.selectedOption) state.faye.selectedOption = recId;
  const selectedId = (state.faye && state.faye.selectedOption) || recId;

  const optionsHtml = options.map(o => `
    <div class="sr-option${o.id === selectedId ? ' sr-option-selected' : ''}" data-option-id="${o.id}" role="button" tabindex="0">
      <span class="sr-opt-radio" aria-hidden="true"></span>
      <div class="sr-opt-main">
        <div class="sr-opt-row">
          <span class="sr-opt-name">${o.name}</span>
          ${o.recommended ? `<span class="sr-opt-rec">Recommended</span>` : ''}
          <span class="sr-opt-conf">${o.conf}% confidence</span>
        </div>
        <div class="sr-opt-rationale">${o.rationale}</div>
        ${(o.details && o.details.length) ? `
        <div class="sr-rationale-block">
          <button class="sr-rationale-toggle" data-expanded="false" type="button">
            <span class="sr-rationale-toggle-icon">▸</span>
            <span class="sr-rationale-toggle-lbl">${o.detailLabel}</span>
          </button>
          <div class="sr-rationale-list" style="display:none">
            ${buildRationaleRows(o.details)}
          </div>
        </div>` : ''}
      </div>
    </div>
  `).join('');

  const confirmed = state.faye && state.faye.diagnosisConfirmed;
  // W40 — overriding = picking a non-recommended option; requires free-text reasoning before confirm.
  const isOverride = isOverrideOption(selectedId);
  const reason = (state.faye && state.faye.overrideReason) || '';
  const confirmDisabled = isOverride && !reason.trim();
  const confirmRowHtml = confirmed
    ? confirmedRowHtml(selectedId)
    : `<button class="sr-confirm-btn" type="button"${confirmDisabled ? ' disabled' : ''}>Confirm selected diagnosis</button>`;

  summarySlot.innerHTML = `
    <div class="summary-report" data-block-real="summary">
      <div class="sr-heading">Initial Diagnosis${state.part3 ? ` <span class="sr-act-chip">After learning · ${ACT3_INCIDENT.id}</span>` : ''}</div>
      <div class="sr-section">
        <div class="sr-options">
          ${optionsHtml}
        </div>
        <div class="sr-override"${isOverride ? '' : ' style="display:none"'}>
          <div class="sr-override-label">⚠ Override — you're selecting a lower-confidence diagnosis over the AI recommendation. Provide your reasoning before confirming.</div>
          <textarea class="sr-override-input" placeholder="Why override the recommendation? e.g. onsite vibration trend + NDE bearing temp rise point to race spalling; misalignment 2×RPM signature weaker than the model weights it.">${escapeHtml(reason)}</textarea>
        </div>
        <div class="sr-confirm-row">
          ${confirmRowHtml}
        </div>
      </div>
    </div>`;
  wireRationaleToggle();
  wireConfirmInitialDiagnosis();
  if (!confirmed) {
    wireDiagnosisOptionClick();
    wireOverrideInput();
  }
}

// W40 — true if the option id is a non-recommended diagnosis (override path).
function isOverrideOption(optionId) {
  const opt = getDiagnosisOptions().find(o => o.id === optionId);
  return !!(opt && !opt.recommended);
}

// W40 — confirm-row markup once a diagnosis is captured (adds the override reasoning line if present).
function confirmedRowHtml(selectedId) {
  const reason = ((state.faye && state.faye.overrideReason) || '').trim();
  let html = `<span class="sr-confirmed-pill">✓ Diagnosis captured: ${diagnosisOptionLabel(selectedId)}</span>`;
  if (isOverrideOption(selectedId) && reason) {
    html += `<div class="sr-override-captured"><span class="sr-override-captured-lbl">Override reasoning</span>${escapeHtml(reason)}</div>`;
  }
  return html;
}

// W40 — capture override reasoning + gate the Confirm button.
function wireOverrideInput() {
  const ta = document.querySelector('.sr-override-input');
  if (!ta || ta.dataset.wired === '1') return;
  ta.dataset.wired = '1';
  ta.addEventListener('input', () => {
    if (state.faye) state.faye.overrideReason = ta.value;
    refreshConfirmEnabled();
  });
  // Auto-fill (typewriter) Faye's override rationale on first press, then the Sensor Anomaly
  // Inspector offers to attach the exact telemetry behind the call.
  const fill = () => typewriterFill(ta, 'specific vibration frequency suggests bearing issue', {
    onComplete: () => showSensorClarifier(ta, {
      msg: 'Your note is sparse. I can attach the exact telemetry behind this call — NDE bearing vibration RMS 8.4 mm/s vs 7.1 mm/s ISO 10816-7 Zone C threshold, 1×RPM dominant, ~178° NDE–DE phase shift. Add the readings to your note?',
      append: 'NDE bearing vib RMS 8.4 mm/s vs 7.1 mm/s (ISO 10816-7 Zone C); 1×RPM dominant; ~178° NDE–DE phase shift.',
    }),
  });
  ta.addEventListener('focus', fill);
  ta.addEventListener('click', fill);
}

// W40 — enable Confirm only when not in an unjustified override.
function refreshConfirmEnabled() {
  const btn = document.querySelector('.sr-confirm-btn');
  if (!btn) return;
  const selectedId = (state.faye && state.faye.selectedOption) || 'primary';
  const reason = ((state.faye && state.faye.overrideReason) || '').trim();
  btn.disabled = isOverrideOption(selectedId) && !reason;
}

// W19 — "Name (NN%)" label for the captured-choice pill.
function diagnosisOptionLabel(optionId) {
  const opt = getDiagnosisOptions().find(o => o.id === optionId) || getDiagnosisOptions()[0];
  return `${opt.name} (${opt.conf}%)`;
}

// W19 — option select: highlight clicked row (DOM toggle only, no full render).
function wireDiagnosisOptionClick() {
  document.querySelectorAll('.sr-option').forEach(row => {
    if (row.dataset.wired === '1') return;
    row.dataset.wired = '1';
    const handler = () => onDiagnosisOptionClick(row.dataset.optionId);
    row.addEventListener('click', e => {
      // let the Full-reasoning toggle work without changing selection
      if (e.target.closest('.sr-rationale-toggle')) return;
      handler();
    });
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
    });
  });
}

function onDiagnosisOptionClick(optionId) {
  if (state.faye && state.faye.diagnosisConfirmed) return;   // locked
  if (!optionId) return;
  state.faye.selectedOption = optionId;
  document.querySelectorAll('.sr-option').forEach(row => {
    row.classList.toggle('sr-option-selected', row.dataset.optionId === optionId);
  });
  // W40 — reveal the reasoning prompt only when overriding the recommendation.
  const overrideBlock = document.querySelector('.sr-override');
  if (overrideBlock) overrideBlock.style.display = isOverrideOption(optionId) ? '' : 'none';
  refreshConfirmEnabled();
}

// ── W13 R2 — SOP Relevant next best actions (replaces paintActionStepsInitial in live flow) ──
function paintSOPRelevantInitial(actionSlot) {
  actionSlot.innerHTML = `
    <div class="action-steps" data-variant="sop-relevant">
      <div class="as-heading">SOP Relevant next best actions</div>
      <div class="as-sop-theater-slot"></div>
      <div class="as-step-slot" data-step-slot="1"></div>
      <div class="as-step-slot" data-step-slot="2"></div>
      <div class="as-step-slot" data-step-slot="3"></div>
      <button class="action-cta" disabled type="button">
        Assign to fix · Lim Wei Jie
      </button>
    </div>`;
}

function playSOPAnticipationTheater() {
  const theaterSlot = document.querySelector('.as-sop-theater-slot');
  if (!theaterSlot) return;
  // Phase 1: SOP Compliance Agent checking SOP-specific steps (2s)
  theaterSlot.innerHTML = `
    <div class="sop-anticipation-theater" data-phase="checking">
      <span class="reveal-dots"><span></span><span></span><span></span></span>
      <span class="reveal-msg">
        <span class="reveal-agent">SOP Compliance Agent</span> · confirming SOP specific steps for BFP vibration investigation
      </span>
    </div>`;
  if (window.LOG) {
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: 'sop-action',
      text: 'SOP Compliance Agent · confirming SOP-BFP-VIBR-001 specific steps · checking pre-conditions',
      dataSource: 'Hyperspace OS',
      nodeChain: ['sop-bfp-vibration-investigation'],
    });
  }
  fireAgentCardLifecycle('sop-action', 2000);

  pushReveal(() => {
    // Phase 2: result lands. Telemetry step removed — go straight to work-order creation.
    theaterSlot.innerHTML = `
      <div class="sop-anticipation-result">
        <span class="sar-icon">📋</span>
        <span class="sar-text">SOP pre-conditions confirmed · generating work order</span>
      </div>`;
    revealCreateWorkOrderStep();
  }, 2000);
}

// Telemetry Step 1 removed (Faye action steps renumbered to 2). Work-order creation is now the first
// step and auto-starts after the SOP check. Internal data-step="2"/"3" preserved so unlockActionStep2/3
// + wireEngineerCardClick selectors keep working; only the visible numbering changes.
// revealStep1WithAddButton (telemetry path) kept below as dead code per WA #5.
function revealCreateWorkOrderStep() {
  const slot1 = document.querySelector('.as-step-slot[data-step-slot="1"]');
  const slot2 = document.querySelector('.as-step-slot[data-step-slot="2"]');
  const slot3 = document.querySelector('.as-step-slot[data-step-slot="3"]');
  if (!slot2 || !slot3) return;
  if (slot1) slot1.innerHTML = '';
  slot2.innerHTML = `
    <div class="as-step" data-step="2" data-status="locked">
      <div class="as-step-head">
        <span class="as-step-num">○</span>
        <span class="as-step-title">Step 1 · Create work order</span>
      </div>
      <div class="as-step-body">
        <span class="as-step-msg">Hyperspace OS · preparing work order…</span>
      </div>
    </div>`;
  slot3.innerHTML = `
    <div class="as-step" data-step="3" data-status="locked">
      <div class="as-step-head">
        <span class="as-step-num">○</span>
        <span class="as-step-title">Step 2 · Schedule optimisation and assignment of engineer <span class="as-step-optional">(optional)</span></span>
      </div>
      <div class="as-step-body">
        <span class="as-step-msg">Locked — create the work order first.</span>
      </div>
    </div>`;
  unlockActionStep2();
}

function revealStep1WithAddButton() {
  const slot1 = document.querySelector('.as-step-slot[data-step-slot="1"]');
  const slot2 = document.querySelector('.as-step-slot[data-step-slot="2"]');
  const slot3 = document.querySelector('.as-step-slot[data-step-slot="3"]');
  if (!slot1 || !slot2 || !slot3) return;
  slot1.innerHTML = `
    <div class="as-step" data-step="1" data-status="awaiting-add">
      <div class="as-step-head">
        <span class="as-step-num">○</span>
        <span class="as-step-title">Step 1 · Inspect and confirm telemetry</span>
      </div>
      <div class="as-step-body">
        <span class="as-step-msg">Telemetry snapshot pre-fetched by Hyperspace OS · pending operator confirmation</span>
        <button class="as-step-add-btn" type="button">Review</button>
      </div>
    </div>`;
  // W19 — Step 2 = create work order (was "find engineer"); engineer moved to Step 3.
  slot2.innerHTML = `
    <div class="as-step" data-step="2" data-status="locked">
      <div class="as-step-head">
        <span class="as-step-num">○</span>
        <span class="as-step-title">Step 2 · Create work order</span>
      </div>
      <div class="as-step-body">
        <span class="as-step-msg">Locked — complete Step 1 first.</span>
      </div>
    </div>`;
  slot3.innerHTML = `
    <div class="as-step" data-step="3" data-status="locked">
      <div class="as-step-head">
        <span class="as-step-num">○</span>
        <span class="as-step-title">Step 3 · Schedule optimisation and assignment of engineer <span class="as-step-optional">(optional)</span></span>
      </div>
      <div class="as-step-body">
        <span class="as-step-msg">Locked — create the work order first.</span>
      </div>
    </div>`;
  wireAddTelemetryButton();
}

function wireAddTelemetryButton() {
  const btn = document.querySelector('.as-step-add-btn');
  if (!btn || btn.dataset.wired === '1') return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', onReviewTelemetryClick);
}

// W14 R1 — Review button opens telemetry modal (was: immediately marked step done)
function onReviewTelemetryClick() {
  const modal = document.getElementById('telemetry-modal');
  if (!modal) return;
  modal.dataset.open = 'true';
  modal.setAttribute('aria-hidden', 'false');
  wireTelemetryModal();           // delegated close handler (no-op if already wired)
  wireAttachTelemetryButton();    // new Attach CTA wiring (idempotent)
}

// W14 R1 — Attach click closes modal + fires existing step-done lifecycle
function wireAttachTelemetryButton() {
  const btn = document.querySelector('.telemetry-modal-attach');
  if (!btn || btn.dataset.wired === '1') return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', onAttachTelemetryClick);
}

function onAttachTelemetryClick() {
  closeTelemetryModal();
  const step1 = document.querySelector('.as-step[data-step="1"]');
  if (!step1) return;
  step1.dataset.status = 'verifying';
  state.actionSteps.step1.status = 'verifying';
  step1.querySelector('.as-step-body').innerHTML = `
    <span class="as-step-spinner"><span class="reveal-dots"><span></span><span></span><span></span></span></span>
    <span class="as-step-msg">Confirming telemetry…</span>`;
  fireAgentCardLifecycle('pl', 1000);
  pushReveal(() => {
    step1.dataset.status = 'done';
    step1.querySelector('.as-step-num').textContent = '✓';
    step1.querySelector('.as-step-body').innerHTML = `
      <span class="as-step-msg italic">Telemetry confirmed for INC-2026-0537</span>
      <button class="as-step-attach" type="button" aria-label="View verified metrics">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
          <path d="M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10a1 1 0 0 1-2 0V6h-1.5v9a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6z"/>
        </svg>
      </button>`;
    state.actionSteps.step1.status = 'done';
    wireTelemetryModal();
    unlockActionStep2();
  }, 1000);
}

// Dead code per WA #5 — pre-W14 R1 direct-step-done path (function name preserved for any stale refs)
function onAddTelemetryClick() {
  return onReviewTelemetryClick();
}

// ── Legacy (W3.9) — paintActionStepsInitial + startActionStep1 kept as dead code per WA #5 ──
function paintActionStepsInitial(actionSlot) {
  actionSlot.innerHTML = `
    <div class="action-steps">
      <div class="as-heading">Action steps</div>
      <div class="as-step" data-step="1" data-status="idle">
        <div class="as-step-head">
          <span class="as-step-num">○</span>
          <span class="as-step-title">Step 1 · Verify metrics</span>
        </div>
        <div class="as-step-body">
          <span class="as-step-spinner"><span class="reveal-dots"><span></span><span></span><span></span></span></span>
          <span class="as-step-msg">Verifying metrics for INC-2026-0537…</span>
        </div>
      </div>
      <div class="as-step" data-step="2" data-status="locked">
        <div class="as-step-head">
          <span class="as-step-num">○</span>
          <span class="as-step-title">Step 2 · Schedule optimisation and assignment of engineer <span class="as-step-optional">(optional)</span></span>
        </div>
        <div class="as-step-body">
          <span class="as-step-msg">Locked — complete Step 1 first.</span>
        </div>
      </div>
      <button class="action-cta" disabled type="button">
        Confirm on-site dispatch
      </button>
    </div>`;
}

function paintActionStepsComplete(actionSlot) {
  // Already actioned (re-render after dispatch). Telemetry Step 1 removed — 2-step flow:
  // Step 1 = Create work order (internal data-step="2"), Step 2 = assign engineer (data-step="3").
  actionSlot.innerHTML = `
    <div class="action-steps" data-variant="sop-relevant">
      <div class="as-heading">SOP Relevant next best actions</div>
      <div class="as-step" data-step="2" data-status="done">
        <div class="as-step-head">
          <span class="as-step-num">✓</span>
          <span class="as-step-title">Step 1 · Create work order</span>
        </div>
        <div class="as-step-body">${buildWorkOrderCardHTML({
          id: WORK_ORDER.id,
          title: 'Work order created',
          asset: INCIDENT.asset,
          diagnosisLabel: diagnosisOptionLabel((state.faye && state.faye.selectedOption) || 'primary'),
          groups: LIM_INSPECTION_CHECKLIST,
        })}</div>
      </div>
      <div class="as-step" data-step="3" data-status="selected">
        <div class="as-step-head">
          <span class="as-step-num">✓</span>
          <span class="as-step-title">Step 2 · Schedule optimisation and assignment of engineer <span class="as-step-optional">(optional)</span></span>
        </div>
        <div class="as-step-body">
          <span class="as-step-msg">Lim Wei Jie selected</span>
        </div>
      </div>
      <div class="dispatch-confirmed">✓ Dispatched to fix at ${currentSGTTime()} · ${DISPATCH_LABEL[state.activePersona] || 'next persona'} notified</div>
    </div>`;
}

function startActionStep1() {
  const step1 = document.querySelector('.as-step[data-step="1"]');
  if (!step1) return;
  step1.dataset.status = 'verifying';
  state.actionSteps.step1.status = 'verifying';
  // W6 — fire P&L Impact Validator card synced with Step 1 (2s verify)
  fireAgentCardLifecycle('pl', 2000);
  pushReveal(() => {
    step1.dataset.status = 'done';
    step1.querySelector('.as-step-num').textContent = '✓';
    step1.querySelector('.as-step-body').innerHTML = `
      <span class="as-step-msg italic">Metrics for INC-2026-0537 confirmed</span>
      <button class="as-step-attach" type="button" aria-label="View verified metrics">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
          <path d="M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10a1 1 0 0 1-2 0V6h-1.5v9a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6z"/>
        </svg>
      </button>`;
    state.actionSteps.step1.status = 'done';
    wireTelemetryModal();
    unlockActionStep2();
  }, 2000);
}

// W19 — Step 2 = Create work order. Work Order Pre-fill Agent theater → WO card (machine + diagnosis + works) → unlock Step 3.
function unlockActionStep2() {
  const step2 = document.querySelector('.as-step[data-step="2"]');
  if (!step2) return;
  step2.dataset.status = 'generating';
  step2.querySelector('.as-step-body').innerHTML = `
    <div class="as-wo-theater">
      <span class="reveal-dots"><span></span><span></span><span></span></span>
      <span class="reveal-msg">
        <span class="reveal-agent">Work Order Pre-fill Agent</span> · generating work order · attaching machine + diagnosis + works to complete
      </span>
    </div>`;
  if (window.LOG) {
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: 'wo-prefill',
      text: `${WORK_ORDER.id} generated · ${INCIDENT.asset} · initial diagnosis + works to complete attached`,
      dataSource: 'Hyperspace OS',
      nodeChain: ['sop-wo-creation', 'sop-bfp-vibration-investigation'],
    });
  }
  fireAgentCardLifecycle('wo-prefill', 2000);
  pushReveal(() => {
    step2.dataset.status = 'done';
    step2.querySelector('.as-step-num').textContent = '✓';
    step2.querySelector('.as-step-body').innerHTML = buildWorkOrderCardHTML({
      id: WORK_ORDER.id,
      title: 'Work order created',
      asset: INCIDENT.asset,
      diagnosisLabel: diagnosisOptionLabel((state.faye && state.faye.selectedOption) || 'primary'),
      groups: LIM_INSPECTION_CHECKLIST,
    });
    unlockActionStep3();
  }, 2000);
}

// W19 — Step 3 = Find available engineer (was Step 2). Find theater (5s) → engineer card → select → enable dispatch.
function unlockActionStep3() {
  const step3 = document.querySelector('.as-step[data-step="3"]');
  if (!step3) return;
  step3.dataset.status = 'finding';
  state.actionSteps.step2.status = 'finding';
  step3.querySelector('.as-step-body').innerHTML = `
    <span class="as-step-spinner"><span class="reveal-dots"><span></span><span></span><span></span></span></span>
    <span class="as-step-msg">Hyperspace OS · finding on-duty engineers…</span>`;
  // W6 — fire Workflow Agent card synced with the find step (5s)
  fireAgentCardLifecycle('workflow', 5000);
  pushReveal(() => {
    step3.dataset.status = 'selecting';
    state.actionSteps.step2.status = 'selecting';
    step3.querySelector('.as-step-body').innerHTML = `
      <div class="as-engineer-card" data-engineer="lim-wei-jie">
        <div class="as-eng-status-pill">AVAILABLE</div>
        <div class="as-eng-name">Lim Wei Jie</div>
        <div class="as-eng-meta">Block 2 mechanical maintenance · on-duty · 02:47 SGT</div>
        <div class="as-eng-hint">Click to select</div>
      </div>`;
    wireEngineerCardClick();
  }, 5000);
}

// W8 B — Notes tile lives inside Step 2 (between Lim row + Confirm CTA).
function insertOpsNotesIntoStep2() {
  const stepsRoot = document.querySelector('.action-steps');
  if (!stepsRoot) return;
  if (stepsRoot.querySelector('.notes-standalone')) return;
  const cta = stepsRoot.querySelector('.action-cta');
  const notes = buildNotesSectionStandalone();
  notes.classList.add('notes-in-step2');
  if (cta) {
    stepsRoot.insertBefore(notes, cta);
  } else {
    stepsRoot.appendChild(notes);
  }
  wireNotesMic();
}

function wireEngineerCardClick() {
  const card = document.querySelector('.as-engineer-card[data-engineer="lim-wei-jie"]');
  if (!card) return;
  card.addEventListener('click', () => {
    state.actionSteps.step2.selectedEngineer = 'lim-wei-jie';
    state.actionSteps.step2.status = 'selected';
    const step3 = document.querySelector('.as-step[data-step="3"]');
    if (!step3) return;
    step3.dataset.status = 'selected';
    step3.querySelector('.as-step-num').textContent = '✓';
    step3.querySelector('.as-step-body').innerHTML = `<span class="as-step-msg">Lim Wei Jie selected</span>`;
    enableActionCTA();
  });
}

// W19 — WO card markup (machine + initial diagnosis + works to complete). Reused by R3 for the regenerated WO.
// `groups` (LIM_INSPECTION_CHECKLIST shape) renders grouped works; `checklist` (flat strings) renders a plain list.
function buildWorkOrderCardHTML(wo) {
  const assetRow = wo.asset
    ? `<div class="as-wo-asset"><span class="as-wo-lbl">Machine</span> ${wo.asset}</div>`
    : '';
  const isInitialWO = !!(wo.groups && wo.groups.length);
  // Initial grouped WO renders COMPACT — card first; machine spec, servicing history + grouped
  // works live in the ◆ Sources modal (the expanded version).
  if (isInitialWO) {
    const stepCount = wo.groups.reduce((n, g) => n + g.items.length, 0);
    return `
      <div class="as-wo-card as-wo-card-compact">
        <div class="as-wo-head">
          <span class="as-wo-title">${wo.title}</span>
          <span class="as-wo-head-right">
            <span class="as-wo-id">${wo.id}</span>
            <button class="as-wo-sources-btn" type="button">◆ Full version</button>
          </span>
        </div>
        ${assetRow}
        <div class="as-wo-diagnosis"><span class="as-wo-lbl">${wo.diagnosisHeading || 'Initial diagnosis'}</span> ${wo.diagnosisLabel}</div>
        <div class="as-wo-compact-hint">${wo.groups.length} work groups · ${stepCount} steps · machine spec + servicing history → tap <strong>◆ Full version</strong> for the complete work order</div>
      </div>`;
  }
  // Flat checklist (regenerated WO) — full detail inline.
  const worksHtml = `<ul class="as-wo-checklist">${(wo.checklist || []).map(c => `<li class="as-wo-check">${c}</li>`).join('')}</ul>`;
  return `
    <div class="as-wo-card${wo.regenerated ? ' as-wo-card-regen' : ''}">
      <div class="as-wo-head">
        <span class="as-wo-title">${wo.title}</span>
        <span class="as-wo-head-right">
          <span class="as-wo-id">${wo.id}</span>
        </span>
      </div>
      ${assetRow}
      <div class="as-wo-diagnosis"><span class="as-wo-lbl">${wo.diagnosisHeading || 'Initial diagnosis'}</span> ${wo.diagnosisLabel}</div>
      <div class="as-wo-checklist-lbl">Works to be completed</div>
      ${worksHtml}
    </div>`;
}

// ── W41 — Work Order "Sources" provenance modal (two-column: source cards + color-coded WO doc) ──
function provSource(id) { return WO_SOURCES.find(s => s.id === id) || WO_SOURCES[0]; }

function buildSourcesModalLeft() {
  return WO_SOURCES.map(s => `
    <div class="prov-card" style="--prov:${s.color}">
      <span class="prov-card-agent">${s.agent}</span>
      <div class="prov-card-title">${s.label}</div>
      <div class="prov-card-desc">${s.desc}</div>
      <ul class="prov-card-records">${s.records.map(r => `<li>${r}</li>`).join('')}</ul>
    </div>`).join('');
}

// W41b — rich Machine block: asset + spec grid + servicing/replacement history.
function buildMachineProvBlock() {
  const s = provSource('s-machine');
  const specRows = MACHINE_DETAIL.specs.map(([k, v]) =>
    `<div class="prov-spec-row"><span class="prov-spec-k">${k}</span><span class="prov-spec-v">${v}</span></div>`).join('');
  const histRows = MACHINE_DETAIL.history.map(([d, t]) =>
    `<li><span class="prov-hist-date">${d}</span> ${t}</li>`).join('');
  return `
    <div class="prov-block" style="--prov:${s.color}">
      <span class="prov-block-via">via ${s.agent}</span>
      <div class="prov-block-lbl">Machine</div>
      <div class="prov-block-val prov-machine-asset">${MACHINE_DETAIL.asset}</div>
      <div class="prov-spec-grid">${specRows}</div>
      <div class="prov-hist-lbl">Servicing &amp; replacement history</div>
      <ul class="prov-hist-list">${histRows}</ul>
    </div>`;
}

function buildSourcesModalRight() {
  const diagLabel = diagnosisOptionLabel((state.faye && state.faye.selectedOption) || 'primary');
  const sCases = provSource('s-cases');
  const fieldBlock = (src, lbl, val) => `
    <div class="prov-block" style="--prov:${src.color}">
      <span class="prov-block-via">via ${src.agent}</span>
      <div class="prov-block-lbl">${lbl}</div>
      <div class="prov-block-val">${val}</div>
    </div>`;
  const worksHtml = LIM_INSPECTION_CHECKLIST.map(g => {
    const src = provSource(WO_GROUP_SOURCE[g.group] || 's-cases');
    return `
      <div class="prov-block" style="--prov:${src.color}">
        <span class="prov-block-via">via ${src.agent}</span>
        <div class="prov-works-group-lbl">${g.group}</div>
        <ul class="prov-works-list">${g.items.map(it => `<li>${it.text}</li>`).join('')}</ul>
      </div>`;
  }).join('');
  return `
    <div class="prov-doc-note">Each highlighted section maps to a source on the left.</div>
    <div class="prov-doc-head">
      <span class="prov-doc-title">Work order created</span>
      <span class="prov-doc-id">${WORK_ORDER.id}</span>
    </div>
    ${buildMachineProvBlock()}
    ${fieldBlock(sCases, 'Initial diagnosis', diagLabel)}
    <div class="prov-works-lbl">Works to be completed</div>
    ${worksHtml}`;
}

function openSourcesModal(kind) {
  const modal = document.getElementById('sources-modal');
  if (!modal) return;
  const left = document.getElementById('sources-col-left');
  const right = document.getElementById('sources-col-right');
  const sub = modal.querySelector('.sources-modal-sub');
  if (kind === 'service-report') {
    if (left) left.innerHTML = buildServiceSourcesLeft();
    if (right) right.innerHTML = buildServiceSourcesRight();
    if (sub) sub.textContent = 'Where each agent captured this service report';
  } else {
    if (left) left.innerHTML = buildSourcesModalLeft();
    if (right) right.innerHTML = buildSourcesModalRight();
    if (sub) sub.textContent = 'Where each agent extracted this work order';
  }
  const title = modal.querySelector('.sources-modal-title');
  if (title) title.textContent = 'Sources';
  modal.dataset.layout = 'two';
  modal.dataset.open = 'true';
  modal.setAttribute('aria-hidden', 'false');
}

// Single-column document modal — reuses the #sources-modal shell for the impact summary +
// regenerated work order full docs (compact card → expand pattern, no provenance column).
// NOTE: distinct from openDocModal() (the W3.6 OCR doc modal) — different shell.
function openReportDocModal(kind) {
  const modal = document.getElementById('sources-modal');
  if (!modal) return;
  const left = document.getElementById('sources-col-left');
  const right = document.getElementById('sources-col-right');
  const sub = modal.querySelector('.sources-modal-sub');
  const title = modal.querySelector('.sources-modal-title');
  if (left) left.innerHTML = '';
  if (kind === 'impact') {
    if (title) title.textContent = 'Quantified impact summary';
    if (sub) sub.textContent = 'Operational + commercial exposure · routed to Faye Sit';
    if (right) right.innerHTML = buildImpactDocHTML();
  } else {
    if (title) title.textContent = 'Regenerated work order';
    if (sub) sub.textContent = `${WORK_ORDER_REVISED.id} · revised diagnosis + updated works`;
    if (right) right.innerHTML = buildRegenWoDocHTML();
  }
  modal.dataset.layout = 'single';
  modal.dataset.open = 'true';
  modal.setAttribute('aria-hidden', 'false');
}

function buildImpactDocHTML() {
  const rows = IMPACT_SUMMARY.rows.map(([k, v]) =>
    `<div class="doc-kv"><span class="doc-k">${k}</span><span class="doc-v">${v}</span></div>`).join('');
  return `
    <div class="prov-doc-head">
      <span class="prov-doc-title">Quantified impact</span>
      <span class="prov-doc-id">INC-2026-0537</span>
    </div>
    <div class="doc-kv-list">${rows}</div>
    <div class="prov-doc-note">Illustrative commercial figures · routed to <span class="dyn-name">Faye Sit</span> for ops + commercial action.</div>`;
}

function buildRegenWoDocHTML() {
  const works = WORK_ORDER_REVISED.checklist.map(c => `<li>${c}</li>`).join('');
  return `
    <div class="prov-doc-head">
      <span class="prov-doc-title">Work order regenerated</span>
      <span class="prov-doc-id">${WORK_ORDER_REVISED.id}</span>
    </div>
    <div class="doc-revised-diagnosis">
      <div class="doc-rd-lbl">Revised diagnosis</div>
      <div class="doc-rd-val">${WORK_ORDER_REVISED.diagnosis}</div>
    </div>
    <div class="doc-section-lbl">Works to be completed</div>
    <ul class="doc-list">${works}</ul>
    ${buildMachineProvBlock()}
    <div class="doc-kv"><span class="doc-k">Supersedes</span><span class="doc-v">${WORK_ORDER.id}</span></div>
    ${buildCompletedWorksHTML()}
    <div class="prov-doc-note">Routed to <span class="dyn-name">Faye Sit</span> for ops + commercial action.</div>`;
}

// Completed works carried over from the first work order (WO-2026-1190) — Lim's onsite inspection,
// drawn live from state (Safety = checked, Instrument = tick/cross/halted).
function buildCompletedWorksHTML() {
  const checked = state.lim.checked || {};
  // Instrument group removed; onsite works = Safety + Root cause isolation. Root-cause checks halted by
  // the temp-spike render as "superseded" (escalated to offsite expert) rather than done.
  const groups = LIM_INSPECTION_CHECKLIST.filter(g => g.group === 'Safety' || g.group === 'Root cause isolation').map(g => {
    const rows = g.items.map(it => {
      const done = !!checked[it.id];
      let status, cls;
      if (done)                             { status = '✓ done';       cls = 'doc-st-done'; }
      else if (state.lim.tempSpikeTriggered){ status = '— superseded'; cls = 'doc-st-skip'; }
      else                                  { status = '— not reached'; cls = 'doc-st-pending'; }
      return `<li class="doc-check"><span class="doc-check-txt">${it.text}</span><span class="doc-check-st ${cls}">${status}</span></li>`;
    }).join('');
    return `<div class="doc-works-group-lbl">${g.group}</div><ul class="doc-list doc-check-list">${rows}</ul>`;
  }).join('');
  return `<div class="doc-section-lbl">Completed works · carried from ${WORK_ORDER.id}</div>${groups}`;
}

function closeSourcesModal() {
  const modal = document.getElementById('sources-modal');
  if (!modal) return;
  modal.dataset.open = 'false';
  modal.setAttribute('aria-hidden', 'true');
}

function initSourcesModal() {
  document.body.addEventListener('click', e => {
    if (e.target.closest('.as-wo-sources-btn')) { e.preventDefault(); openSourcesModal('wo'); return; }
    if (e.target.closest('.svr-sources-btn')) { e.preventDefault(); openSourcesModal('service-report'); return; }
    if (e.target.closest('.lim-impact-card')) { e.preventDefault(); openReportDocModal('impact'); return; }
    if (e.target.closest('.lim-regenwo-card')) { e.preventDefault(); openReportDocModal('regen-wo'); return; }
    if (e.target.closest('#sources-modal-close, #sources-modal-overlay')) { closeSourcesModal(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSourcesModal();
  });
}

// ── W46 — provenance sources for the service report (mirrors the WO sources panel) ──
const SERVICE_REPORT_SOURCES = [
  { id: 'sr-machine', color: '#2563EB', agent: 'Sensor Anomaly Inspector',
    label: 'Machine telemetry',
    desc: 'Live condition data plus the onsite temperature spike that reframed the incident.',
    records: ['OSIsoft PI · BFP-3A telemetry', 'Bently Nevada 3500 · vibration RMS', 'Honeywell Experion DCS · bearing temp'] },
  { id: 'sr-diag', color: '#D97706', agent: 'Equipment Diagnostic Agent + Power Gen Critic',
    label: 'Diagnostic reasoning + fleet cases',
    desc: 'Ranked diagnoses with confidence, pattern-matched against prior BFP failures.',
    records: ['Hyperspace KG · differential diagnosis', 'RCA · Jurong-CCGT-2 / Sakra-CCGT-1 / Banyan-CHP'] },
  { id: 'sr-human', color: '#DB2777', agent: 'Faye Sit + Lim Wei Jie',
    label: 'Human-in-the-loop decisions',
    desc: 'Ops override rationale and onsite safety + root-cause checks captured in-workflow.',
    records: ['Faye Sit · diagnosis override + reasoning', 'Lim Wei Jie · safety 5/5 · root-cause 2/5'] },
  { id: 'sr-call', color: '#00A5A8', agent: 'Audio-transcription Agent',
    label: 'Escalation call transcript',
    desc: 'Diarised Lim ↔ Dr. Ismail call that confirmed the revised failure mode.',
    records: ['Call · Lim Wei Jie ↔ Dr. A. Ismail', 'Transcript · 6 exchanges · auto-attached'] },
  { id: 'sr-sop', color: '#00A651', agent: 'Work Order Pre-fill + SOP Action Agent',
    label: 'SOP + work order',
    desc: 'Remediation steps drawn from the regenerated work order and the BFP SOP.',
    records: ['WO-2026-1190-R1 · revised works', 'SOP-BFP-VIBR-001 · escalation playbook'] },
];

function svcSource(id) { return SERVICE_REPORT_SOURCES.find(s => s.id === id) || SERVICE_REPORT_SOURCES[0]; }

function buildServiceSourcesLeft() {
  return SERVICE_REPORT_SOURCES.map(s => `
    <div class="prov-card" style="--prov:${s.color}">
      <span class="prov-card-agent">${s.agent}</span>
      <div class="prov-card-title">${s.label}</div>
      <div class="prov-card-desc">${s.desc}</div>
      <ul class="prov-card-records">${s.records.map(r => `<li>${r}</li>`).join('')}</ul>
    </div>`).join('');
}

// W46 — right column = the FULL service report, each section highlighted/tinted by its source.
function buildServiceSourcesRight() {
  const blocks = serviceReportSections().map(sec => {
    const src = svcSource(sec.sourceId);
    return `
      <div class="prov-block" style="--prov:${src.color}">
        <span class="prov-block-via">via ${src.agent}</span>
        <div class="prov-block-lbl">${sec.label}</div>
        <div class="svr-prov-body">${sec.html}</div>
      </div>`;
  }).join('');
  return `
    <div class="prov-doc-note">The full service report — each section highlighted by its source on the left.</div>
    <div class="prov-doc-head">
      <span class="prov-doc-title">Service Report</span>
      <span class="prov-doc-id">INC-2026-0537</span>
    </div>
    ${blocks}`;
}

function enableActionCTA() {
  const cta = document.querySelector('.action-cta');
  if (!cta) return;
  cta.disabled = false;
  cta.classList.add('action-cta-enabled');
  state.actionSteps.ctaEnabled = true;
  cta.addEventListener('click', onActionCTAClick, { once: true });
}

function onActionCTAClick() {
  const cta = document.querySelector('.action-cta');
  if (cta && cta.disabled) return;
  onDispatchCTA();
}

// ── Section D — Source legend (3-chip row) ──
function buildScreenDSourceLegend() {
  const legend = el('div', 'screen-d-sources');
  legend.innerHTML = `
    <span class="source-chip">
      <svg class="source-ic" viewBox="0 0 24 24" width="18" height="18" fill="#3B82F6" aria-hidden="true">
        <path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2z"/>
      </svg>
      <span>Hyperspace OS</span>
    </span>
    <span class="source-chip">
      <svg class="source-ic" viewBox="0 0 24 24" width="18" height="18" fill="#00A651" aria-hidden="true">
        <path d="M12 2C7 7 4 11 4 15a8 8 0 0 0 16 0c0-4-3-8-8-13zm0 5l4 4-4 4-4-4 4-4z"/>
      </svg>
      <span>NetZeroOS</span>
    </span>
    <span class="source-chip">
      <svg class="source-ic" viewBox="0 0 24 24" width="18" height="18" fill="#F59E0B" aria-hidden="true">
        <circle cx="6" cy="6" r="2.5"/>
        <circle cx="18" cy="6" r="2.5"/>
        <circle cx="12" cy="18" r="2.5"/>
        <path d="M6 6L18 6M6 6L12 18M18 6L12 18" stroke="#F59E0B" stroke-width="1.5" fill="none"/>
      </svg>
      <span>Knowledge-Graph</span>
    </span>`;
  return legend;
}

// ── Block 1 — Asset chain card ──
function buildAssetChainCard() {
  const card = el('div', 'ops-card');
  const chainStr = INCIDENT.chain.map((n, i) =>
    i === 0 ? n : `<span class="arrow">→</span>${n}`
  ).join('');
  card.innerHTML = `
    <div class="ops-card-lbl">Actively monitoring connected asset chain</div>
    <div class="chain-text">${chainStr}</div>
    <div class="chain-note">✦ Connected nodes monitored — chain alerts route here automatically.</div>`;
  return card;
}

// ── Block 2 — Ops impact card (Section M revised content) ──
function buildOpsImpactCard() {
  const card = el('div', 'ops-card');
  // [illustrative — confirm w/ Sembcorp before 2026-05-27]
  const tariff = 'SGD 120/MWh peak';
  const revenueRisk = 'SGD 2.4M';
  card.innerHTML = `
    <div class="ops-card-lbl">Operational + revenue impact</div>
    <div class="ops-impact-text">
      <ul style="margin: 0 0 0 18px; padding: 0;">
        <li>MW dispatch reliability at risk — <span class="dyn-entity dyn-entity-asset">Block 2</span> derate <span class="dyn-entity dyn-entity-metric">circa 50 MW</span> if unmitigated</li>
        <li>PSO commitment window 09:00–18:00 SGT · 4h peak tariff exposure per <a class="dyn-entity dyn-entity-ref" href="#" data-doc-ref="ieee-1159">IEEE 1159 § 4.2</a></li>
        <li>Revenue at risk: ~<span class="dyn-entity dyn-entity-metric">${revenueRisk}</span> (50 MW × 4h × ${tariff}) <em style="color: var(--text-muted); font-style: italic;">[illustrative]</em></li>
      </ul>
      <div style="margin-top: 8px;">Hedge: forward Q3 capacity contract eligible (P&amp;L Validator confirms)</div>
    </div>
    <div class="ops-impact-action">Action window: 45 min before T-zero PSO breach</div>`;
  return card;
}

// ── History accordion (unchanged from W3.6) ──
function buildHistoryAccordion() {
  const acc = el('div', 'acc-row-w1');
  acc.dataset.open = 'false';
  acc.innerHTML = `
    <div class="acc-row-w1-hdr">
      <span class="acc-row-w1-lbl">Historical work orders for GT-3 (${INCIDENT.historicalWOCount})</span>
      <span class="acc-row-w1-chev">
        <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
          <path d="M1 1l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    </div>
    <div class="acc-row-w1-body">
      <div class="acc-wo-row">
        <div class="acc-wo-id">WO-2026-0489</div>
        <div class="acc-wo-detail">Compressor wash cycle · scheduled · 2026-05-18 → 2026-05-19</div>
        <div class="acc-wo-status acc-wo-status-closed">CLOSED</div>
      </div>
      <div class="acc-wo-row">
        <div class="acc-wo-id">WO-2025-3147</div>
        <div class="acc-wo-detail">IGV calibration verification · OEM service bulletin GE-9HA-014</div>
        <div class="acc-wo-status acc-wo-status-closed">CLOSED</div>
      </div>
      <div class="acc-wo-row">
        <div class="acc-wo-id">WO-2025-2814</div>
        <div class="acc-wo-detail">Generator excitation system inspection · annual</div>
        <div class="acc-wo-status acc-wo-status-closed">CLOSED</div>
      </div>
    </div>`;
  acc.querySelector('.acc-row-w1-hdr').addEventListener('click', () => {
    acc.dataset.open = acc.dataset.open === 'true' ? 'false' : 'true';
  });
  return acc;
}

// ── Block 3 — Recommendation (Sections G / H / I / J / CTA) ──
function buildRecommendationBlock() {
  const next = el('div', 'next-action');
  next.innerHTML = `
    <div class="next-action-hdr">
      <span class="hitl-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="3"/>
          <path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/>
        </svg>
      </span>
      <span>Next action steps for Faye Sit</span>
      <span class="hitl-tag">Human-in-the-loop</span>
    </div>
    <div class="next-action-step-lbl"><span class="next-action-step-num">1.</span> Verify and confirm diagnosis</div>
    <div class="diag-hypothesis-card">
      <div class="diag-hyp-row">
        <div class="diag-hyp-title">Diagnosis hypothesis · compressor fouling (humidity-correlated)</div>
        <span class="diag-hyp-conf">78% confidence</span>
      </div>
      <div class="diag-hyp-subtitle">Pending Onsite verification (Lim Wei Jie)</div>
      <button class="see-reasoning-toggle" data-expanded="false" type="button">
        <span class="see-reasoning-icon">▸</span>
        <span>See full reasoning</span>
      </button>
      <div class="see-reasoning-panel" style="display:none">
        <div class="reasoning-step">
          <span class="rs-num">1</span>
          <span class="rs-body"><span class="rs-agent">Sensor Anomaly Inspector</span> detected GT-3 exhaust temp spread widening to 8.4&deg;C (target &le;5&deg;C) over rolling 14-day window. Correlated with heat rate drift +2.1% and compressor pressure ratio drop &minus;0.4.</span>
        </div>
        <div class="reasoning-step">
          <span class="rs-num">2</span>
          <span class="rs-body"><span class="rs-agent">Sensor Anomaly Inspector</span> traversed Knowledge-Graph L2 &rarr; L3 &rarr; L4: GT-3 &rarr; compressor stage &rarr; 90-day humidity profile correlation.</span>
        </div>
        <div class="reasoning-step">
          <span class="rs-num">3</span>
          <span class="rs-body"><span class="rs-agent">Equipment Diagnostic Agent</span> pattern-matched against 3 prior RCAs across the fleet (Jurong-CCGT-2 &middot; 2025-08, Sakra-CCGT-1 &middot; 2025-11, Jurong-CCGT-1 &middot; 2024-09 &mdash; all compressor fouling, all humidity-correlated).</span>
        </div>
        <div class="reasoning-step">
          <span class="rs-num">4</span>
          <span class="rs-body"><span class="rs-agent">Power Gen Critic</span> validated KG path backwards. Humidity-fouling pattern matches GE 9HA OEM degradation curve.</span>
        </div>
        <div class="reasoning-step">
          <span class="rs-num">5</span>
          <span class="rs-body">Diagnosis hypothesis: <strong>compressor fouling, humidity-correlated</strong>. 78% confidence. Onsite verification recommended before remediation.</span>
        </div>
      </div>
      <div class="alt-diag-section">
        <div class="alt-diag-header">Alternative diagnoses considered</div>
        <div class="alt-diag-list">
          <div class="alt-diag-row">
            <span class="alt-diag-name">IGV-3 actuator drift</span>
            <span class="alt-diag-conf">52% confidence</span>
          </div>
          <div class="alt-diag-row">
            <span class="alt-diag-name">Inlet filter &Delta;P rising</span>
            <span class="alt-diag-conf">31% confidence</span>
          </div>
          <div class="alt-diag-row">
            <span class="alt-diag-name">HRSG-3 tube degradation</span>
            <span class="alt-diag-conf">19% confidence</span>
          </div>
        </div>
        <div class="alt-diag-note">All considered alongside primary hypothesis. Onsite verification confirms or surfaces co-factors.</div>
      </div>
      <div class="notes-section">
        <div class="notes-header">
          <span class="notes-title">Note for onsite engineer</span>
          <button class="notes-mic-btn" data-recording="false" type="button">
            <svg class="mic-ic" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V5a3 3 0 0 0-3-3zm5 9a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/>
            </svg>
            <span class="notes-mic-lbl">Record</span>
          </button>
        </div>
        <textarea class="notes-textarea" placeholder="Optional note — voice or type." readonly>${state.dispatchNote || ''}</textarea>
      </div>
    </div>
  `;

  // W3.9 — CTA vs confirmed driven by per-persona actioned, not global statePill
  const personaState = activePersonaTicketState();
  const persona = PERSONA_INITIALS[state.activePersona] || PERSONA_INITIALS.ops;
  const nextPersona = HANDOFF_NEXT[state.activePersona];
  const nextName = DISPATCH_LABEL[state.activePersona] || 'next persona';
  if (!personaState.actioned) {
    const cta = el('button', 'dispatch-cta');
    cta.innerHTML = `Dispatch for Onsite Inspection <span class="dispatch-cta-arrow">→</span>`;
    cta.addEventListener('click', onDispatchCTA);
    next.appendChild(cta);
    const sub = el('div', 'dispatch-cta-sublbl');
    sub.textContent = `${persona.name} · routes incident to ${nextName} for diagnosis verification`;
    next.appendChild(sub);
  } else {
    const confirm = el('div', 'dispatch-confirmed');
    confirm.innerHTML = `✓ Dispatched at ${currentSGTTime()} · ${nextName} notified`;
    next.appendChild(confirm);
  }

  return next;
}

// ── Section K — Pending placeholder (loading-dots) ──
function buildPendingPlaceholder(blockId) {
  const placeholder = el('div', 'reveal-pending');
  placeholder.setAttribute('data-block', blockId);

  let agentName, msg;
  if (blockId === 'asset-chain') {
    agentName = 'Sensor Anomaly Inspector';
    msg = 'building asset chain for monitoring + RCA';
  } else if (blockId === 'ops-impact') {
    agentName = 'P&amp;L Impact Validator';
    msg = 'reviewing revenue commitment exposure';
  } else if (blockId === 'recommendation') {
    agentName = 'Orchestrator';
    msg = `reviewing SOP + historical next-best-actions for <span class="reveal-alarm-box">DCS ALARM · GT EXHAUST TEMP SPREAD DRIFT</span>`;
  } else {
    agentName = 'Agent';
    msg = 'working';
  }
  placeholder.innerHTML = `
    <div class="reveal-dots"><span></span><span></span><span></span></div>
    <div class="reveal-msg"><span class="reveal-agent">${agentName}</span> ${msg}</div>`;
  return placeholder;
}

// W3.9 — reveal timer tracking (cancellable on persona switch)
function pushReveal(fn, delay) {
  // dotsSpeed scales the global 3-dot loading theaters (see TIMING at top).
  const h = setTimeout(fn, dotsMs(delay));
  state.revealTimers.push(h);
  return h;
}

// ── Section K — reveal driver (W3.7.1 — 10s cadence per Pulkit) ──
function startScreenDReveal() {
  // Block 1: asset chain reveals at t=10s
  pushReveal(() => {
    revealBlock('asset-chain');
    state.assetChainRevealed = true;
    spawnPlaceholderInDOM('ops-impact');
    fireRevealBlock2Agents();
  }, 10000);

  // Block 2: ops impact reveals at t=20s
  pushReveal(() => {
    revealBlock('ops-impact');
    state.opsImpactRevealed = true;
    spawnPlaceholderInDOM('recommendation');
    fireRevealBlock3Agents();
  }, 20000);

  // Block 3: recommendation reveals at t=30s
  pushReveal(() => {
    revealBlock('recommendation');
    state.recommendationRevealed = true;
    wireSeeReasoningToggle();
    wireNotesMic();
  }, 30000);

  // Block 1 agents (Sensor Anomaly Inspector) — runs through t=10s
  fireRevealBlock1Agents();
}

function revealBlock(blockId) {
  const pending = document.querySelector(`.reveal-pending[data-block="${blockId}"]`);
  const real = document.querySelector(`[data-block-real="${blockId}"]`);
  if (pending) pending.remove();
  if (real) {
    real.style.display = '';
    real.classList.add('reveal-in');
  }
}

function spawnPlaceholderInDOM(blockId) {
  // Avoid double-mounting
  if (document.querySelector(`.reveal-pending[data-block="${blockId}"]`)) return;
  const real = document.querySelector(`[data-block-real="${blockId}"]`);
  if (!real || !real.parentNode) return;
  const placeholder = buildPendingPlaceholder(blockId);
  real.parentNode.insertBefore(placeholder, real.nextSibling);
}

// ── Section L — Right-pane agent firings synced w/ reveal blocks ──
function fireRevealBlock1Agents() {
  const agentId = 'inspection';
  setAgentActive(agentId, 'Asset Chain Assembly', 4);
  const lines = [
    { ts: '02:47:12', source: 'inspection', text: 'L2 traverse · compressor stage · IGV-3 actuator · HRSG-3',     dataSource: 'OSIsoft PI System', nodeChain: ['gt-3','igv-3-actuator','hrsg-3'] },
    { ts: '02:47:13', source: 'inspection', text: 'L3 lookup · 90-day humidity profile · degradation curve',       dataSource: 'OSIsoft PI System', nodeChain: ['gt-3-90d-temp','mdl-humidity-v3'] },
    { ts: '02:47:14', source: 'inspection', text: 'L4 traverse · compressor-fouling pattern · humidity-correlated', nodeChain: ['pat-comp-fouling','mdl-humidity-v3'] },
    { ts: '02:47:15', source: 'inspection', text: 'asset chain assembled · 6 nodes · 5 edges',                     nodeChain: ['gt-3','hrsg-3','condenser-3','generator-3','transformer-3','switchyard-a'] },
  ];
  lines.forEach((line, idx) => {
    pushReveal(() => {
      window.LOG.appendLine(line);
      advanceAgentStep(agentId, idx, { log: line });
    }, 1500 + idx * 2000);
  });
  pushReveal(() => teardownAgentTree(agentId), 9800);
}

function fireRevealBlock2Agents() {
  const agentId = 'pl';
  setAgentActive(agentId, 'Revenue Commitment Exposure', 3);
  const lines = [
    { ts: '02:47:16', source: 'pl', text: 'pulling PSO commitment window 09:00–18:00 SGT',         dataSource: 'Hyperspace OS', nodeChain: ['esc-pso','pred-mw-derate'] },
    { ts: '02:47:17', source: 'pl', text: 'revenue at risk · 50MW × 4h × SGD 120/MWh peak tariff', dataSource: 'NetZeroOS',     nodeChain: ['pred-mw-derate'] },
    { ts: '02:47:18', source: 'pl', text: 'exposure ~SGD 2.4M · forward Q3 capacity hedge eligible', dataSource: 'NetZeroOS',   nodeChain: ['pred-mw-derate','roi-wash'] },
  ];
  lines.forEach((line, idx) => {
    pushReveal(() => {
      window.LOG.appendLine(line);
      advanceAgentStep(agentId, idx, { log: line });
    }, 1500 + idx * 2700);
  });
  pushReveal(() => teardownAgentTree(agentId), 9800);
}

function fireRevealBlock3Agents() {
  // Activate 3 in parallel — bypass setAgentActive (which tears down previous)
  activateAgentParallel('triage',           2);
  activateAgentParallel('playbook',         1);
  activateAgentParallel('critic-power-gen', 1);

  const lines = [
    { ts: '02:47:19', source: 'triage',           text: 'pattern-match · 3 prior RCAs · compressor fouling humidity-correlated', dataSource: 'Hyperspace KG', nodeChain: ['rca-2025-014-sakra','rca-2024-093-jurong','rca-2025-031-jurong2','pat-comp-fouling'] },
    { ts: '02:47:20', source: 'triage',           text: 'diagnosis hypothesis · 78% confidence',                                  dataSource: 'Hyperspace OS', nodeChain: ['pat-comp-fouling'] },
    { ts: '02:47:21', source: 'playbook',         text: 'OEM procedure · GE 9HA compressor offline wash · est 6h',                dataSource: 'Maximo',         nodeChain: ['oem-ge-9ha-manual','rec-oem-playbook'] },
    { ts: '02:47:22', source: 'critic-power-gen', text: 'KG path validated · humidity-fouling matches GE 9HA degradation curve ✓', dataSource: 'Hyperspace KG', nodeChain: ['pat-comp-fouling','mdl-humidity-v3','oem-ge-9ha-manual'] },
    { ts: '02:47:23', source: 'orchestrator',     text: 'recommendation ready · SOP-WASH-001 · awaiting dispatch',                 dataSource: 'Hyperspace OS', nodeChain: ['rec-oem-playbook'] },
  ];
  lines.forEach((line, idx) => {
    pushReveal(() => {
      window.LOG.appendLine(line);
      if (line.source === 'triage' || line.source === 'playbook' || line.source === 'critic-power-gen') {
        const stepIdx = ({ triage: idx < 2 ? idx : 1, playbook: 0, 'critic-power-gen': 0 })[line.source];
        advanceAgentStep(line.source, stepIdx, { log: line });
      }
    }, 1000 + idx * 1800);
  });
  pushReveal(() => {
    teardownAgentTree('triage');
    teardownAgentTree('playbook');
    teardownAgentTree('critic-power-gen');
  }, 9800);
}

// W3.7 helper — parallel agent activation (does not tear down previous active)
function activateAgentParallel(agentId, totalSteps) {
  const card = document.querySelector(`.agent-card[data-agent-id="${agentId}"]`);
  if (!card) return;
  card.classList.add('agent-active');
  card.classList.remove('agent-done');
  state.agentStepIndex[agentId] = 0;
  ensureStepPill(card, 0, totalSteps);
}

// ── Section H — See full reasoning toggle ──
function wireSeeReasoningToggle() {
  const btn = document.querySelector('.see-reasoning-toggle');
  if (!btn || btn.dataset.wired === '1') return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', () => {
    const expanded = btn.dataset.expanded === 'true';
    btn.dataset.expanded = String(!expanded);
    const panel = btn.parentElement.querySelector('.see-reasoning-panel');
    if (panel) panel.style.display = expanded ? 'none' : 'block';
  });
}

// ── W13 R2 — Confirm Initial Diagnosis (gates Action Steps spawn) ──
function wireConfirmInitialDiagnosis() {
  const btn = document.querySelector('.sr-confirm-btn');
  if (!btn || btn.dataset.wired === '1') return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', onInitialDiagnosisConfirmClick);
}

function onInitialDiagnosisConfirmClick() {
  if (state.faye.diagnosisConfirmed) return;
  // W40 — block confirm if overriding without reasoning (button should already be disabled).
  const selId = (state.faye && state.faye.selectedOption) || 'primary';
  const overrideReason = ((state.faye && state.faye.overrideReason) || '').trim();
  if (isOverrideOption(selId) && !overrideReason) return;
  state.faye.diagnosisConfirmed = true;

  // W42b — replace the whole confirm row with a fresh "Locking in…" pill (a NEW element, not the
  // mutated button) so there's no transition/disabled repaint artifact on the live button.
  const lockRow = document.querySelector('.sr-confirm-row');
  if (lockRow) {
    lockRow.innerHTML = `<span class="sr-locking-pill"><span class="sr-locking-dots"><span></span><span></span><span></span></span>Locking in…</span>`;
  }

  // 2s lock-in theater — 3 agent pulses + KG flash on diagnosis-related nodes
  fireAgentCardLifecycle('inspection',        2000);
  fireAgentCardLifecycle('triage',            2000);
  fireAgentCardLifecycle('critic-power-gen',  2000);
  flashKGDiagnosisNodes();

  // W19 — lock the option list (no further re-selection) + log the captured choice.
  const selectedId = (state.faye && state.faye.selectedOption) || 'primary';
  document.querySelectorAll('.sr-option').forEach(row => row.classList.add('sr-option-locked'));

  if (window.LOG) {
    const overrideNote = (isOverrideOption(selectedId) && overrideReason)
      ? ` · OVERRIDE of recommendation (${diagnosisOptionLabel('primary')}) — Faye's reasoning: "${overrideReason}"`
      : '';
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: 'orchestrator',
      text: `Diagnosis captured by Faye Sit · ${diagnosisOptionLabel(selectedId)}${overrideNote} · workflow handoff to SOP-relevant next-best actions`,
      dataSource: 'Hyperspace OS',
      nodeChain: ['bearing-spalling-pattern', 'sop-bfp-vibration-investigation'],
    });
  }

  pushReveal(() => {
    // Replace Confirm button row w/ captured-choice pill (+ override reasoning line if present)
    const row = document.querySelector('.sr-confirm-row');
    if (row) {
      row.innerHTML = confirmedRowHtml(selectedId);
    }
    const overrideBlock = document.querySelector('.sr-override');
    if (overrideBlock) overrideBlock.style.display = 'none';
    if (!state.part3) spawnSOPRelevantNextBestActions();   // Part 3 stops at the diagnosis
  }, 2000);
}

// W13 R2 — KG green flash on diagnosis pattern + physical bearing nodes
function flashKGDiagnosisNodes() {
  if (!KG_STATE || !KG_STATE.graph) return;
  if (!KG_STATE.newlyAddedNodes) KG_STATE.newlyAddedNodes = new Set();
  KG_STATE.newlyAddedNodes.add('bearing-spalling-pattern');
  KG_STATE.newlyAddedNodes.add('bearing-bfp-3a-nde');
  refreshKGStyles();
  setTimeout(() => {
    if (!KG_STATE.newlyAddedNodes) return;
    KG_STATE.newlyAddedNodes.delete('bearing-spalling-pattern');
    KG_STATE.newlyAddedNodes.delete('bearing-bfp-3a-nde');
    refreshKGStyles();
  }, 2000);
}

function spawnSOPRelevantNextBestActions() {
  if (state.faye.actionStepsSpawned) return;
  state.faye.actionStepsSpawned = true;
  const actionSlot = document.getElementById('action-steps-slot');
  if (!actionSlot) return;
  paintSOPRelevantInitial(actionSlot);
  playSOPAnticipationTheater();
}

// ── W13 R2 / W19 — Rationale collapsible(s). W19: every diagnosis option has its own dropdown,
// so wire ALL toggles, scoping the open/close to each toggle's own .sr-rationale-block. ──
function wireRationaleToggle() {
  document.querySelectorAll('.sr-rationale-toggle').forEach(btn => {
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      const expanded = btn.dataset.expanded === 'true';
      btn.dataset.expanded = String(!expanded);
      const icon = btn.querySelector('.sr-rationale-toggle-icon');
      if (icon) icon.textContent = expanded ? '▸' : '▾';
      const block = btn.closest('.sr-rationale-block') || btn.parentElement;
      const list = block && block.querySelector('.sr-rationale-list');
      if (list) list.style.display = expanded ? 'none' : 'block';
    });
  });
}

// ── W3.10 — Alt-hypotheses collapsible (kept as dead code per WA #5; Lim summary may still wire) ──
function wireAltHypothesesToggle() {
  const btn = document.querySelector('.sr-alt-toggle');
  if (!btn || btn.dataset.wired === '1') return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', () => {
    const expanded = btn.dataset.expanded === 'true';
    btn.dataset.expanded = String(!expanded);
    const list = btn.parentElement.querySelector('.sr-alt-list');
    if (list) list.style.display = expanded ? 'none' : 'block';
  });
}

// ── W3.10 — Telemetry modal (Step 1 paperclip) ──
function openTelemetryModal() {
  const m = document.getElementById('telemetry-modal');
  if (m) { m.dataset.open = 'true'; m.setAttribute('aria-hidden', 'false'); }
}
function closeTelemetryModal() {
  const m = document.getElementById('telemetry-modal');
  if (m) { m.dataset.open = 'false'; m.setAttribute('aria-hidden', 'true'); }
}
function wireTelemetryModal() {
  const modal = document.getElementById('telemetry-modal');
  const attachBtns = document.querySelectorAll('.as-step-attach');
  if (modal && modal.dataset.wired !== '1') {
    modal.dataset.wired = '1';
    // Delegated close: clicks on backdrop or close-button close the modal;
    // clicks inside the card pass through.
    modal.addEventListener('click', e => {
      if (e.target.closest('.telemetry-modal-close')) { closeTelemetryModal(); return; }
      if (e.target.classList.contains('telemetry-modal-backdrop')) { closeTelemetryModal(); return; }
      if (e.target === modal) { closeTelemetryModal(); }
    });
  }
  attachBtns.forEach(btn => {
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', openTelemetryModal);
  });
}

// ── Section J — Mic record + 5s preload ──
const PRELOAD_NOTE = 'Lim — checks rule out simple bearing fault. Inspect casing weld area near discharge flange — fatigue cracking pattern observed on similar Sulzer BFPs across the fleet. Confirm before reporting back.';

function wireNotesMic() {
  const btn = document.querySelector('.notes-mic-btn');
  if (!btn || btn.dataset.wired === '1') return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', e => {
    const target = e.currentTarget;
    if (target.dataset.recording === 'true') return;
    target.dataset.recording = 'true';
    target.querySelector('.notes-mic-lbl').textContent = 'Recording…';
    const textarea = target.closest('.notes-section').querySelector('.notes-textarea');
    textarea.value = '';
    setTimeout(() => {
      textarea.value = PRELOAD_NOTE;
      target.dataset.recording = 'false';
      target.querySelector('.notes-mic-lbl').textContent = 'Record';
      state.dispatchNote = PRELOAD_NOTE;
    }, 5000);
  });
}

// ── Section N — Post-dispatch 3-line capture footer (W3.9: dispatched-to label per persona) ──
function appendDispatchCaptureFooter() {
  const container = document.getElementById('incident-detail-view');
  if (!container) return;
  if (container.querySelector('.dispatch-capture-footer')) return;
  const footer = el('div', 'dispatch-capture-footer');
  footer.innerHTML = `
    <div class="dcf-line">
      <span class="dcf-ic">✓</span>
      <span class="dcf-txt"><strong>${WORK_ORDER.id}</strong> created · diagnosis + fix checklist attached</span>
    </div>
    <div class="dcf-line">
      <span class="dcf-ic">✓</span>
      <span class="dcf-txt">Notes sent to <strong>A2A Coordination Agent</strong> for review</span>
    </div>
    <div class="dcf-line">
      <span class="dcf-ic">✓</span>
      <span class="dcf-txt"><strong>Knowledge-Graph</strong> · team · incident · workflow enriched</span>
    </div>`;
  container.appendChild(footer);
  const lbl = el('div', 'dispatched-to-label');
  const nextName = DISPATCH_LABEL[state.activePersona] || 'next persona';
  lbl.innerHTML = `Dispatched to fix · <span class="dyn-name">${nextName}</span> · 02:47 SGT`;
  container.appendChild(lbl);
}

// ── W3.9 — Dispatch CTA: per-persona routing, advances statePill + handoffPending ──
function onDispatchCTA() {
  const personaKey = state.activePersona;
  if (personaKey === 'analyst') return;
  const ticket = getCanonicalTicket();
  ticket.byPersona[personaKey].actioned = true;
  const newPill = POST_DISPATCH_STATE_PILL[personaKey];
  if (newPill) setStatePill(newPill);
  const next = HANDOFF_NEXT[personaKey];
  if (next) ticket.handoffPending[next] = true;
  render();
  fireWorkflowAgentArc();
}

// Backwards-compat alias (older callers, defensive) — routes to new handler
function dispatchToOnsite() {
  onDispatchCTA();
}

function fireWorkflowAgentArc() {
  let t = 0;
  t += 200;
  scheduleArcStep(t, () => {
    setAgentActive(WORKFLOW_AGENT_SCRIPT.agentId, WORKFLOW_AGENT_SCRIPT.taskTreeLabel, WORKFLOW_AGENT_SCRIPT.steps.length);
  });
  WORKFLOW_AGENT_SCRIPT.steps.forEach((step, idx) => {
    t += step.delayMs;
    scheduleArcStep(t, () => {
      window.LOG.appendLine(step.log);
      advanceAgentStep(WORKFLOW_AGENT_SCRIPT.agentId, idx, step);
    });
  });
  t += 400;
  scheduleArcStep(t, () => teardownAgentTree(WORKFLOW_AGENT_SCRIPT.agentId));
}

// ── W7 stub persona renderer ──
function renderAnalystView(root) { stubView(root, 'Asset Perf Analyst view — Wave 7'); }
function stubView(root, label) {
  const s = el('div', 'tablet-content');
  s.style.cssText = 'display:flex;align-items:center;justify-content:center;color:#64748B;font-family:var(--mono);font-size:12px;';
  s.textContent = label;
  root.appendChild(s);
}

// ─────────────────────────────────────────────
// W4 — Lim Wei Jie (Onsite) curated Screen D
// Banner + metrics + summary (loading theater) + diagnosis hypothesis
// + inspection checklist + binary CTAs + call flow + diagnosis morph + escalate
// ─────────────────────────────────────────────

// 2-group structure (Instrument group removed). Safety 5 items / Root cause isolation 5 items = 10 total.
// Temp-spike escalation relocated from Instrument (instr-2) → Root cause isolation (rci-2).
const LIM_INSPECTION_CHECKLIST = [
  {
    group: 'Safety',
    items: [
      { id: 'safety-1', text: 'Check the area for gas leaks before approaching the equipment.' },
      { id: 'safety-2', text: 'Verify there is no active fire, smoke, or overheating around the machine.' },
      { id: 'safety-3', text: 'Confirm vibration levels are stable enough for safe inspection.' },
      { id: 'safety-4', text: 'Check casing temperature is within safe handling range.' },
      { id: 'safety-5', text: 'Confirm lockout/tagout is in place before close inspection.' },
    ],
  },
  {
    group: 'Root cause isolation',
    items: [
      { id: 'rci-1', text: 'Inspect sleeve bearings for clearance issues, oil film condition, wipe damage, and instability.' },
      { id: 'rci-2', text: 'Inspect rolling element bearings for spalling, lubrication condition, cage defects, and preload issues.' },
      { id: 'rci-3', text: 'Inspect coupling alignment · laser shaft alignment · DE coupling face · 4 dial-indicator points.' },
      { id: 'rci-4', text: 'Inspect pump casing volute + discharge weld + 4-o\'clock position · check for hairline cracks.' },
      { id: 'rci-5', text: 'Inspect impeller balance + clearance + wear patterns on NDE + DE sides.' },
    ],
  },
];

const LIM_CHECKLIST_THRESHOLD = 10;

// W4.1 — group theater (HSE for Safety, Instrument Diagnostic, Sensor Anomaly Inspector + Equipment Diag for root-cause)
const GROUP_THEATER_AGENT = {
  'Safety': {
    source: 'hse',
    displayName: 'HSE Agent',
    loadingText: 'Loading PPE + gas-leak + thermal safety protocols for BFP-3A approach',
    nodeChain: ['sop-bfp-vibration-investigation'],
    cardAgentIds: ['hse'],
  },
  'Instrument': {
    source: 'inspection',
    displayName: 'Instrument Diagnostic Agent',
    loadingText: 'Loading vibration sensor + cable + grounding inspection protocols',
    nodeChain: ['vt-bfp-3a-nde-x', 'vt-bfp-3a-nde-y', 'vt-bfp-3a-de-x', 'vt-bfp-3a-de-y'],
    cardAgentIds: ['inspection'],
  },
  'Root cause isolation': {
    source: 'triage',
    displayName: 'Sensor Anomaly Inspector + Equipment Diagnostic Agent',
    loadingText: 'Loading sleeve + rolling-element bearing isolation protocols',
    nodeChain: ['bearing-bfp-3a-nde', 'coupling-bfp-3a', 'shaft-bfp-3a'],
    cardAgentIds: ['inspection', 'triage'],
  },
};

const GROUP_LOCKED_HINT = {
  'Safety': '',
  'Instrument': '🔒 awaiting safety completion',
  'Root cause isolation': '🔒 awaiting safety completion',
};

function buildLimDetailScaffold() {
  const content = el('div', 'tablet-content');
  content.id = 'incident-detail-view';

  // Banner — green gradient + back chevron + state pill
  const hdr = el('div', 'inc-header');
  hdr.innerHTML = `
    <span class="inc-back">
      <svg viewBox="0 0 8 13" fill="none">
        <path d="M7 1L1 6.5L7 12" stroke="rgba(255,255,255,0.85)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Back
    </span>
    <div class="inc-hdr-row">
      <div class="inc-hdr-left">
        <div class="inc-workspace">${PERSONA_INITIALS.onsite.workspace}</div>
        <div class="inc-title">${INCIDENT.asset}</div>
        <div class="inc-id">${INCIDENT.id} · routed from Faye Sit</div>
        <div class="inc-ts">${INCIDENT.timestamp}</div>
      </div>
      <span class="sev-pill" data-severity="${INCIDENT.severity}">▲ Severity: ${INCIDENT.severity}</span>
    </div>`;
  content.appendChild(hdr);

  // Metrics card (re-use Faye layout)
  const grid = el('div', 'metrics-card');
  INCIDENT.metrics.forEach(m => {
    const cell = el('div', 'metric-cell');
    cell.innerHTML = `
      <div class="mc-lbl">${m.lbl}</div>
      <div class="mc-val ${m.tone}">${m.val}<span class="mc-unit">${m.unit}</span></div>
      <div class="mc-nom">${m.nom}</div>`;
    grid.appendChild(cell);
  });
  content.appendChild(grid);

  // W13 R1 — inbound Faye-notes section dropped from Lim Screen D (caller removed; buildLimNotesSection kept as dead code per WA #5).

  // Summary report slot
  const summarySlot = el('div', 'summary-slot');
  summarySlot.id = 'lim-summary-slot';
  content.appendChild(summarySlot);

  // Inspection checklist slot
  const checklistSlot = el('div', 'lim-checklist-slot');
  checklistSlot.id = 'lim-checklist-slot';
  content.appendChild(checklistSlot);

  // Binary CTAs slot
  const ctasSlot = el('div', 'lim-ctas-slot');
  ctasSlot.id = 'lim-ctas-slot';
  content.appendChild(ctasSlot);

  const backBtn = content.querySelector('.inc-back');
  if (backBtn) {
    backBtn.style.cursor = 'pointer';
    backBtn.addEventListener('click', backToMonitoring);
  }
  return content;
}

const LIM_INCOMING_NOTE = 'Lim — checks rule out simple bearing fault. Inspect casing weld area near discharge flange — fatigue cracking pattern observed on similar Sulzer BFPs across the fleet. Confirm before reporting back.';

function buildLimNotesSection() {
  // W8 C.3 + C.4 — display-only incoming note (no record affordance, no textarea).
  // 12px top margin separates from metrics 2x2 above.
  const wrap = el('div', 'notes-standalone notes-incoming');
  wrap.innerHTML = `
    <div class="notes-section notes-section-display">
      <div class="notes-header notes-header-display">
        <span class="notes-title">Note from <span class="dyn-name">Faye Sit</span></span>
        <span class="notes-incoming-chip">incoming · 02:48 SGT</span>
      </div>
      <div class="notes-body-display">${LIM_INCOMING_NOTE}</div>
    </div>`;
  return wrap;
}

function renderOnsiteIncidentDetail(root) {
  const content = buildLimDetailScaffold();
  root.appendChild(content);

  const personaState = activePersonaTicketState();
  if (personaState.actioned) {
    // W7 — post-action re-entry. Pick footer per state pill (Confirm path vs Reject/Confirm-revised path).
    const ticket = getCanonicalTicket();
    const pill = ticket.statePill;
    paintLimSummaryComplete(state.lim.diagnosisRevised);
    paintLimChecklistComplete();
    const slot = document.getElementById('lim-ctas-slot');
    if (slot) {
      slot.innerHTML = '';
      // Quantified impact summary + regenerated work order on Lim's final page (revised-diagnosis path).
      if (state.lim.diagnosisRevised) spawnLimReportCards(slot);
    }
    setTimeout(() => {
      if (pill === 'DIAGNOSIS_CONFIRMED_WO_SUBMITTED') {
        appendConfirmedCaptureFooter();
      } else {
        appendRevisedDiagnosisCaptureFooter();
      }
    }, 200);
    return;
  }

  // First-open path — paint reveal theater
  if (state.lim.summaryRevealed) {
    paintLimSummaryComplete(state.lim.diagnosisRevised);
    paintLimChecklist();
    // W15 — Assistant FAB always present (drop W14 R2 reveal-gate). Skip when call flow owns CTAs slot.
    if (state.lim.diagnosisRevised) {
      // Past the call — show post-call state + Revise diagnosis tile (or footer if already routed)
      spawnInCallStrip();
      paintPostCallStagesFromState();
      spawnReviseDiagnosisTile();
    } else if (state.lim.callEnded) {
      spawnInCallStrip();
      paintPostCallStagesFromState();
    } else if (state.lim.callStarted) {
      spawnInCallStrip();
    } else {
      spawnAssistantFloatingButton();
    }
  } else {
    startLimScreenDReveal();
  }
}

function startLimScreenDReveal() {
  // W8 C.1 + C.2 — paint Predicted Diagnosis IMMEDIATELY (Faye already revealed it · no 10s reload).
  // Eliminates the W6 dual-stage theater + the double-paint bug where pushReveal Stage 3 fired
  // paintLimSummaryComplete a second time after the section was already painted.
  if (state.lim.summaryRevealed) return;
  state.lim.summaryRevealed = true;
  paintLimSummaryComplete(false);
  // Inspection Workflow checklist spawns at t=2s — gives metrics + notes + diagnosis time to settle.
  pushReveal(() => {
    paintLimChecklist();
    // W15 — Assistant FAB always present on Lim Screen D (was gated on item-2 reveal in W14 R2).
    spawnAssistantFloatingButton();
  }, 2000);
}

function paintLimSummaryComplete(revised) {
  const slot = document.getElementById('lim-summary-slot');
  if (!slot) return;
  // W14 R2 — Rationale dropdown replaces Alt-hypotheses dropdown · re-uses W13 R2 INITIAL_DIAGNOSIS_RATIONALE + wireRationaleToggle (Faye-consistent).
  const rationaleHtml = INITIAL_DIAGNOSIS_RATIONALE.map(r => `
    <div class="sr-rationale-row" data-strength="${r.strength}">
      <span class="sr-rat-bullet">·</span>
      <span class="sr-rat-text">${r.text}</span>
      <span class="sr-rat-badge sr-rat-badge-${r.strength}">${r.badgeLabel}</span>
    </div>
  `).join('');

  let tileHtml;
  if (revised) {
    tileHtml = buildRevisedDiagnosisTileHTML();
  } else {
    // W8 C.1 — confirmation pill: Faye already passed this through Hyperspace OS · pending onsite verification.
    tileHtml = `
      <div class="sr-hypothesis">
        <div class="sr-hyp-row">
          <span class="sr-hyp-name">${capturedDiagnosisName()}</span>
          <span class="sr-hyp-status-pill">pending onsite verification</span>
        </div>
      </div>
      <div class="sr-rationale-block">
        <button class="sr-rationale-toggle" data-expanded="false" type="button">
          <span class="sr-rationale-toggle-icon">▸</span>
          <span class="sr-rationale-toggle-lbl">Rationale</span>
        </button>
        <div class="sr-rationale-list" style="display:none">
          ${rationaleHtml}
        </div>
      </div>`;
  }

  // W19 — Lim does NOT see the regenerated work order; that lives in Faye's escalation report only.
  slot.innerHTML = `
    <div class="summary-report">
      <div class="sr-heading">Diagnosis</div>
      <div class="sr-section">
        ${tileHtml}
      </div>
    </div>`;
  wireRationaleToggle();
  wireTranscriptModalLinks();
}

function buildRevisedDiagnosisTileHTML() {
  const ts = state.lim.revisionTimestamp || '02:55 SGT';
  return `
    <div class="sr-hypothesis sr-hypothesis-revised">
      <div class="sr-hyp-row sr-hyp-original">
        <span class="sr-hyp-name strikethrough">${capturedDiagnosisName()}</span>
        <span class="sr-hyp-flag">SUPERSEDED</span>
      </div>
      <div class="sr-hyp-row sr-hyp-revised">
        <span class="sr-hyp-revised-label">Revised fault ·</span>
        <span class="sr-hyp-name"><span class="dyn-name">Crack in pump casing on BFP-3A</span></span>
      </div>
      <div class="sr-hyp-revised-detail">
        Confirmed via expert field-experience pattern + targeted inspection (60mm hairline discontinuity, 4-o'clock on volute, near discharge weld).
        Bearing damage secondary, caused by imbalanced loading under casing fatigue.
        <button class="sr-hyp-transcript-link" type="button">View call transcript · <span class="dyn-name">${ts}</span></button>
      </div>
    </div>`;
}

function buildLimGroupHTML(grp, locked) {
  const checkedCount = grp.items.filter(it => state.lim.checked[it.id]).length;
  if (locked) {
    // W6 — locked groups render header label ONLY (no items in DOM)
    const status = GROUP_LOCKED_HINT[grp.group] || '';
    return `
      <div class="ic-group" data-group="${grp.group}" data-locked="true">
        <div class="ic-group-label ic-group-label-locked">
          <span class="ic-group-label-text">${grp.group}</span>
          <span class="ic-group-label-status">${status}</span>
        </div>
      </div>`;
  }
  const isInstrument = grp.group === 'Instrument';
  const itemsHtml = grp.items.map(it => {
    const isChecked = !!state.lim.checked[it.id];
    if (isInstrument) {
      // W15 — Instrument items use tick/cross UX (text input on cross click).
      const result = (state.lim.instrumentResults || {})[it.id];   // 'tick' | 'cross' | undefined
      const crossReason = (state.lim.instrumentReasons || {})[it.id];
      // W43 — after a temperature spike is detected, remaining unchecked instrument items are
      // struck through (no longer required — escalating to offsite expert instead).
      if (state.lim.tempSpikeTriggered && !result) {
        return `
        <div class="ic-item ic-item-instrument ic-item-struck" data-item-id="${it.id}" data-result="">
          <div class="ic-instr-row">
            <span class="ic-text">${it.text}</span>
            <span class="ic-instr-superseded">superseded</span>
          </div>
        </div>`;
      }
      return `
        <div class="ic-item ic-item-instrument" data-item-id="${it.id}" data-result="${result || ''}">
          <div class="ic-instr-row">
            <span class="ic-text">${it.text}</span>
            ${result === 'tick' ? '<span class="ic-instr-done">✓ Done</span>' : ''}
            ${result === 'cross' ? '<span class="ic-instr-done ic-instr-done-skip">✗ Skipped</span>' : ''}
            ${!result ? `
              <div class="ic-instrument-actions">
                <button class="ic-instr-btn ic-instr-tick" data-item="${it.id}" type="button" aria-label="Mark done">✓</button>
                <button class="ic-instr-btn ic-instr-cross" data-item="${it.id}" type="button" aria-label="Skip + reason">✗</button>
              </div>` : ''}
          </div>
          ${result === 'cross' && !crossReason ? `
            <div class="ic-cross-reason-block">
              <input type="text" class="ic-cross-reason-input" data-item="${it.id}" placeholder="Reason for skipping..." />
              <button class="ic-cross-reason-submit" data-item="${it.id}" type="button">Save</button>
            </div>` : ''}
          ${result === 'cross' && crossReason ? `
            <div class="ic-cross-reason-saved">
              <span class="ic-cross-reason-icon">📝</span>
              <span class="ic-cross-reason-text">${crossReason}</span>
            </div>` : ''}
        </div>`;
    }
    // Root-cause items halted after the temp spike render as superseded (escalating to offsite expert).
    if (state.lim.tempSpikeTriggered && grp.group === 'Root cause isolation' && !isChecked) {
      return `
        <div class="ic-item ic-item-struck" data-item-id="${it.id}" data-checked="false">
          <span class="ic-check">○</span>
          <span class="ic-text">${it.text}</span>
          <span class="ic-instr-superseded">superseded</span>
        </div>`;
    }
    return `
      <div class="ic-item" data-item-id="${it.id}" data-checked="${isChecked}">
        <span class="ic-check">${isChecked ? '✓' : '○'}</span>
        <span class="ic-text">${it.text}</span>
      </div>`;
  }).join('');
  // W43 — temperature spike: surface a new "contact offsite expert" item in the Instrument group.
  const escalateHtml = (grp.group === 'Root cause isolation' && state.lim.tempSpikeTriggered) ? `
      <div class="ic-escalate-item" data-item-id="contact-offsite-expert">
        <span class="ic-escalate-arrow">→</span>
        <div class="ic-escalate-body">
          <span class="ic-escalate-text">Contact offsite expert · <span class="dyn-name">Dr. A. Ismail</span></span>
          <span class="ic-escalate-sub">Component temperature spiking — remote vibration phase analysis required</span>
        </div>
      </div>` : '';
  return `
    <div class="ic-group" data-group="${grp.group}" data-locked="false">
      <div class="ic-group-label">${grp.group} · ${checkedCount}/${grp.items.length}</div>
      ${itemsHtml}
      ${escalateHtml}
    </div>`;
}

// W15 — Restored grouped paint from commit 17cd4c3.
function paintLimChecklist() {
  const slot = document.getElementById('lim-checklist-slot');
  if (!slot) return;
  const allDone = LIM_INSPECTION_CHECKLIST.every(g => g.items.every(it => state.lim.checked[it.id]));
  const groupsHtml = LIM_INSPECTION_CHECKLIST.map((grp, idx) => {
    let locked;
    if (allDone) {
      locked = false;
    } else if (idx === 0) {
      locked = false;
    } else {
      const prevGrp = LIM_INSPECTION_CHECKLIST[idx - 1];
      const prevDone = prevGrp.items.every(it => state.lim.checked[it.id]);
      locked = !prevDone;
    }
    return buildLimGroupHTML(grp, locked);
  }).join('');
  const total = LIM_INSPECTION_CHECKLIST.reduce((n, g) => n + g.items.length, 0);
  const checked = Object.keys(state.lim.checked).length;
  let progressText;
  if (state.lim.tempSpikeTriggered) {
    // W46 — escalated path: show per-group progress (Safety 5/5 · Root cause 2/5), not the aggregate.
    const grpProg = g => `${g.group} ${g.items.filter(it => state.lim.checked[it.id]).length}/${g.items.length}`;
    const safety = LIM_INSPECTION_CHECKLIST.find(g => g.group === 'Safety');
    const rci = LIM_INSPECTION_CHECKLIST.find(g => g.group === 'Root cause isolation');
    progressText = `${grpProg(safety)} · ${grpProg(rci)} · escalated to offsite expert`;
  } else {
    progressText = `${checked}/${total} checks complete`;
  }
  slot.innerHTML = `
    <div class="inspection-checklist">
      <div class="ic-heading">Inspection workflow (INC-2026-0537 · per the SOP)</div>
      <div class="ic-sub">Complete safety + root-cause checks sequentially.</div>
      ${groupsHtml}
      <div class="ic-progress"><span class="ic-progress-num">${progressText}</span></div>
    </div>`;
  wireInspectionChecklist();
  wireInstrumentActions();

  // W4.1 — fire HSE Agent theater on first paint (no items checked yet)
  if (!allDone && checked === 0 && !state.lim.safetyTheaterFired) {
    state.lim.safetyTheaterFired = true;
    triggerGroupTheater('Safety', { skipUnlock: true });
  }
}

function paintLimChecklistComplete() {
  // W43 — temp-spike path: Lim escalated early (safety + 2 instrument checks, rest superseded).
  // Do NOT force-complete the checklist — render the real state so progress isn't wrongly 13/13.
  if (!state.lim.tempSpikeTriggered) {
    // Legacy/confirm path: all items rendered as checked (post-escalation re-entry)
    LIM_INSPECTION_CHECKLIST.forEach(g => g.items.forEach(it => { state.lim.checked[it.id] = true; }));
  }
  paintLimChecklist();
  // W8 C.5 — re-entry path also shows truncated groups.
  truncateInspectionGroupsToCompleted();
}

// W15 — Instrument tick/cross handlers (per-item · separate from generic ic-item click wiring).
function wireInstrumentActions() {
  document.querySelectorAll('.ic-instr-tick').forEach(btn => {
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', e => { e.stopPropagation(); onInstrumentTick(btn.dataset.item); });
  });
  document.querySelectorAll('.ic-instr-cross').forEach(btn => {
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', e => { e.stopPropagation(); onInstrumentCross(btn.dataset.item); });
  });
  document.querySelectorAll('.ic-cross-reason-submit').forEach(btn => {
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', e => { e.stopPropagation(); onCrossReasonSubmit(btn.dataset.item); });
  });
  // W43 — "Contact offsite expert" escalation item → open the call screen.
  document.querySelectorAll('.ic-escalate-item').forEach(item => {
    if (item.dataset.wired === '1') return;
    item.dataset.wired = '1';
    item.addEventListener('click', onContactOffsiteExpert);
  });
  // Stop generic ic-item click handler on instrument rows (tick/cross owns toggle)
  document.querySelectorAll('.ic-item-instrument').forEach(row => {
    if (row.dataset.wiredInstr === '1') return;
    row.dataset.wiredInstr = '1';
    row.addEventListener('click', e => e.stopPropagation());
  });
}

function onInstrumentTick(itemId) {
  if (state.lim.checked[itemId]) return;
  state.lim.instrumentResults = state.lim.instrumentResults || {};
  state.lim.instrumentResults[itemId] = 'tick';
  state.lim.checked[itemId] = true;
  logChecklistItem(itemId);
  paintLimChecklist();
  updateChecklistProgress();
}

// W43 — "Contact offsite expert" item → same effect as the Assistant "Call" button:
// set the verdict-reject flags, then run the SOP-routing theater (3s) → in-call strip.
function onContactOffsiteExpert() {
  if (state.lim.callStarted) return;
  state.lim.rejectClicked = true;
  state.lim.callStarted = true;
  onSOPSuggestCallClick();
}

function onInstrumentCross(itemId) {
  if (state.lim.checked[itemId]) return;
  state.lim.instrumentResults = state.lim.instrumentResults || {};
  state.lim.instrumentResults[itemId] = 'cross';
  state.lim.checked[itemId] = true;
  logChecklistItem(itemId);
  paintLimChecklist();
  updateChecklistProgress();
}

function onCrossReasonSubmit(itemId) {
  const input = document.querySelector(`.ic-cross-reason-input[data-item="${itemId}"]`);
  if (!input) return;
  const reason = input.value.trim();
  if (!reason) return;
  state.lim.instrumentReasons = state.lim.instrumentReasons || {};
  state.lim.instrumentReasons[itemId] = reason;
  paintLimChecklist();
}

// ─────────────────────────────────────────────
// W14 R2 — Assistant FAB + popup (Lim Screen D · bottom-right)
// FAB reveals after item 2 done. Popup w/ 4 options. Primary option ("Review with on-call Senior Engineer")
// calls existing onVerdictReject() → chains into W12 SOP suggest dialogue → call flow.
// ─────────────────────────────────────────────
// W15 — 4 options · no sub-descriptions · primary "Senior Technical Expert" routes to existing onVerdictReject() chain.
const ASSISTANT_OPTIONS = [
  { id: 'wo-history',       label: 'Check work-order history' },
  { id: 'alt-diagnoses',    label: 'Potential alternative diagnoses' },
  { id: 'troubleshoot-faq', label: 'Further troubleshooting FAQ' },
  { id: 'senior-expert',    label: 'Connect to Senior Technical Expert', isPrimary: true },
];

function spawnAssistantFloatingButton() {
  if (document.querySelector('.lim-assistant-fab')) return;
  // W15 — Anchor INSIDE tablet bezel (was body via position:fixed). Tablet is already position:relative.
  const host = document.getElementById('tablet') || document.getElementById('incident-detail-view') || document.body;
  const fab = document.createElement('button');
  fab.className = 'lim-assistant-fab';
  fab.type = 'button';
  fab.innerHTML = `<span class="laf-icon">✦</span><span class="laf-lbl">Assistant</span>`;
  fab.addEventListener('click', openAssistantPopup);
  host.appendChild(fab);
}

function openAssistantPopup() {
  if (document.querySelector('.lim-assistant-popup')) return;
  const popup = document.createElement('div');
  popup.className = 'lim-assistant-popup';
  popup.innerHTML = `
    <div class="lap-backdrop"></div>
    <div class="lap-card" role="dialog" aria-modal="true" aria-label="Assistant options">
      <div class="lap-header">
        <div class="lap-title">Assistant</div>
        <button class="lap-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="lap-body">
        ${ASSISTANT_OPTIONS.map(o => `
          <button class="lap-option ${o.isPrimary ? 'lap-option-primary' : ''}" type="button" data-option="${o.id}">
            <span class="lap-opt-label">${o.label}</span>
          </button>
        `).join('')}
        <div class="lap-query-block">
          <input type="text" class="lap-query-input" placeholder="Type your question..." />
          <button class="lap-mic-btn" type="button" aria-label="Voice query">🎤</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(popup);
  wireAssistantPopup();
}

function wireAssistantPopup() {
  const closeBtn = document.querySelector('.lim-assistant-popup .lap-close');
  if (closeBtn) closeBtn.addEventListener('click', closeAssistantPopup);
  const backdrop = document.querySelector('.lim-assistant-popup .lap-backdrop');
  if (backdrop) backdrop.addEventListener('click', closeAssistantPopup);
  document.querySelectorAll('.lim-assistant-popup .lap-option').forEach(btn => {
    btn.addEventListener('click', () => onAssistantOptionClick(btn.dataset.option));
  });
  // W15 — mic icon: 2s "recording" → populate canned query in input box.
  const micBtn = document.querySelector('.lim-assistant-popup .lap-mic-btn');
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      micBtn.disabled = true;
      micBtn.textContent = '🎤 Recording…';
      setTimeout(() => {
        micBtn.disabled = false;
        micBtn.textContent = '🎤';
        const input = document.querySelector('.lim-assistant-popup .lap-query-input');
        if (input) input.value = 'What is the failure mode for casing crack on NDE?';
      }, 2000);
    });
  }
}

function closeAssistantPopup() {
  const popup = document.querySelector('.lim-assistant-popup');
  if (popup) popup.remove();
}

function onAssistantOptionClick(optionId) {
  closeAssistantPopup();
  if (optionId === 'senior-expert') {
    // W15 — FAB stays visible (always-present per Section D); call flow occupies CTAs slot.
    onVerdictReject();
    return;
  }
  // 3 non-primary options · stub toast (out of scope for demo)
  const opt = ASSISTANT_OPTIONS.find(o => o.id === optionId);
  const label = opt ? opt.label : optionId;
  showAssistantToast(`${label} · option not in this demo path`);
}

function showAssistantToast(msg) {
  const existing = document.querySelector('.lim-assistant-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'lim-assistant-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// W8 C.5 — replace each inspection group's inner content with header-only completed row.
function truncateInspectionGroupsToCompleted() {
  document.querySelectorAll('.ic-group').forEach(grpEl => {
    if (grpEl.dataset.collapsed === 'true') return;
    const groupName = grpEl.dataset.group;
    const grpDef = LIM_INSPECTION_CHECKLIST.find(g => g.group === groupName);
    if (!grpDef) return;
    const total = grpDef.items.length;
    // W47 — reflect ACTUAL per-group completion (temp-spike path supersedes some checks),
    // so the collapsed headers stay consistent with the progress line.
    const done = grpDef.items.filter(it => state.lim.checked[it.id]).length;
    let status, statusCls = '';
    if (done === total) {
      status = `✓ ${done}/${total} completed`;
    } else if (done > 0) {
      status = `${done}/${total} · ${total - done} superseded`;
      statusCls = ' ic-group-label-status-partial';
    } else {
      status = `superseded · escalated to offsite expert`;
      statusCls = ' ic-group-label-status-superseded';
    }
    grpEl.innerHTML = `
      <div class="ic-group-label ic-group-label-completed">
        <span class="ic-group-label-text">${groupName}</span>
        <span class="ic-group-label-status${statusCls}">${status}</span>
      </div>`;
    grpEl.dataset.collapsed = 'true';
    grpEl.dataset.locked = 'false';
  });
  // Also drop any in-flight theater placeholders that would now be orphaned.
  document.querySelectorAll('.ic-group-theater').forEach(t => t.remove());
}

function wireInspectionChecklist() {
  document.querySelectorAll('.ic-item').forEach(item => {
    // W15 — Instrument rows handled by wireInstrumentActions (tick/cross buttons); skip generic wiring.
    if (item.classList.contains('ic-item-instrument')) return;
    // Superseded root-cause rows (post temp-spike) are not tickable.
    if (item.classList.contains('ic-item-struck')) return;
    if (item.dataset.wired === '1') return;
    item.dataset.wired = '1';
    item.addEventListener('click', () => {
      if (item.dataset.checked === 'true') return;
      const group = item.closest('.ic-group');
      if (group && group.dataset.locked === 'true') return;
      const itemId = item.dataset.itemId;
      state.lim.checked[itemId] = true;
      item.dataset.checked = 'true';
      item.querySelector('.ic-check').textContent = '✓';
      logChecklistItem(itemId);
      updateChecklistProgress();
    });
  });
}

// W4.1 — group theater placeholder above the target group.
// On Safety paint: visual flavor only (skipUnlock=true, Safety already unlocked).
// On Instrument/Root cause: fires after prior group complete → 3s later removes + unlocks target.
function triggerGroupTheater(targetGroupName, opts = {}) {
  const { skipUnlock = false } = opts;
  const target = document.querySelector(`.ic-group[data-group="${targetGroupName}"]`);
  if (!target) return;
  if (target.previousElementSibling && target.previousElementSibling.classList.contains('ic-group-theater')) return;

  const meta = GROUP_THEATER_AGENT[targetGroupName];
  const theater = document.createElement('div');
  theater.className = 'ic-group-theater';
  theater.dataset.targetGroup = targetGroupName;
  theater.innerHTML = `
    <span class="reveal-dots"><span></span><span></span><span></span></span>
    <span class="ic-group-theater-msg">
      <span class="ic-group-theater-agent">${meta.displayName}</span> ·
      ${meta.loadingText}
    </span>`;
  target.parentNode.insertBefore(theater, target);

  if (window.LOG) {
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: meta.source,
      text: `${meta.displayName} · ${meta.loadingText}`,
      dataSource: 'Hyperspace OS',
      nodeChain: meta.nodeChain,
    });
  }

  // W6 — fire right-pane card lifecycle synced with theater duration
  fireAgentCardsParallel(meta.cardAgentIds, 3000);

  setTimeout(() => {
    if (theater.parentNode) theater.parentNode.removeChild(theater);
    if (skipUnlock) return;
    // W6 — locked group was header-only; spawn full items markup now
    const grpDef = LIM_INSPECTION_CHECKLIST.find(g => g.group === targetGroupName);
    if (grpDef) {
      const newHTML = buildLimGroupHTML(grpDef, false);
      const wrapper = document.createElement('div');
      wrapper.innerHTML = newHTML;
      const replacement = wrapper.firstElementChild;
      if (replacement && target.parentNode) {
        target.parentNode.replaceChild(replacement, target);
        wireInspectionChecklist();
        wireInstrumentActions();   // W15 — newly-spawned Instrument items need tick/cross wiring
      }
    }
  }, 3000);
}

function logChecklistItem(itemId) {
  if (!window.LOG) return;
  window.LOG.appendLine({
    ts: currentSGTLog(),
    source: 'workflow',
    text: `Inspection check · ${itemId} · confirmed by Lim Wei Jie`,
    dataSource: 'Hyperspace OS',
    nodeChain: ['sop-bfp-vibration-investigation'],
  });
}

let _SGT_LOG_SEC = 30;
function currentSGTLog() {
  _SGT_LOG_SEC += 3;
  const m = 51 + Math.floor(_SGT_LOG_SEC / 60);
  const s = _SGT_LOG_SEC % 60;
  return `02:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function updateChecklistProgress() {
  const total = LIM_INSPECTION_CHECKLIST.reduce((n, g) => n + g.items.length, 0);
  const checked = Object.keys(state.lim.checked).length;
  const progNum = document.querySelector('.ic-progress-num');
  if (progNum) progNum.textContent = `${checked}/${total} checks complete`;

  const groupCompleted = {};
  document.querySelectorAll('.ic-group').forEach(grp => {
    const groupName = grp.dataset.group;
    const grpDef = LIM_INSPECTION_CHECKLIST.find(g => g.group === groupName);
    if (!grpDef) return;
    const grpChecked = grpDef.items.filter(it => state.lim.checked[it.id]).length;
    const label = grp.querySelector('.ic-group-label');
    const isLocked = grp.dataset.locked === 'true';
    const hint = isLocked ? ` · ${GROUP_LOCKED_HINT[groupName] || ''}` : '';
    if (label) label.textContent = `${groupName} · ${grpChecked}/${grpDef.items.length}${hint}`;
    if (grpChecked === grpDef.items.length) groupCompleted[groupName] = true;
  });

  // W4.1 — chain theater triggers on prior-group completion.
  // Instrument group removed → Safety completion now fires the Root cause isolation theater directly.
  if (groupCompleted['Safety'] && !state.lim.rciTheaterFired) {
    state.lim.rciTheaterFired = true;
    triggerGroupTheater('Root cause isolation');
  }

  // W14 R2 — Fault Review auto-spawn at threshold REMOVED.
  // Assistant FAB is the new trigger (Section D/E) — paintDiagnosisVerdict kept as dead code per WA #5.
  // (Previously: if checked >= LIM_CHECKLIST_THRESHOLD → paintDiagnosisVerdict() unconditionally.)
}

// W7 — Diagnosis Verdict section (replaces W4.1 binary-ctas)
// Spawns ONLY when 10/10 inspection checks complete. Reject = main path, Confirm = stub.
// W8 C.5 — truncate inspection groups to header-only at this moment (frees vertical space).
function paintDiagnosisVerdict() {
  const slot = document.getElementById('lim-ctas-slot');
  if (!slot) return;
  if (slot.querySelector('.diagnosis-verdict')) return;
  state.lim.verdictSpawned = true;

  // W8 C.5 — collapse all inspection groups to header-only `✓ <label> · N/N completed`.
  truncateInspectionGroupsToCompleted();

  slot.innerHTML = `
    <div class="diagnosis-verdict">
      <div class="dv-heading">Fault review</div>
      <div class="dv-sub">Accept the fault diagnosis OR route the fault for senior engineer review.</div>
      <div class="dv-buttons">
        <button class="dv-btn dv-review-senior" type="button">Review with Senior Engineer</button>
        <button class="dv-btn dv-confirm" type="button">Accept fault diagnosis</button>
      </div>
    </div>`;
  wireVerdictButtons();
  if (window.LOG) {
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: 'workflow',
      text: 'Inspection workflow complete · 10/10 checks logged · Fault review gated open',
      dataSource: 'Hyperspace OS',
      nodeChain: ['sop-bfp-vibration-investigation'],
    });
  }
}

function wireVerdictButtons() {
  // W13 R1 — Reject button renamed → `.dv-review-senior` (grey · "Review with Senior Engineer"). Handler `onVerdictReject` unchanged — same downstream flow.
  const reject = document.querySelector('.dv-review-senior');
  const confirm = document.querySelector('.dv-confirm');
  if (reject && reject.dataset.wired !== '1') {
    reject.dataset.wired = '1';
    reject.addEventListener('click', onVerdictReject);
  }
  if (confirm && confirm.dataset.wired !== '1') {
    confirm.dataset.wired = '1';
    confirm.addEventListener('click', onVerdictConfirm);
  }
}

// W7 — Reject = main path. W12 Section F — intermediate "SOP suggests calling <name>" dialogue.
// Reject → dialogue spawns → user clicks Call → SOP-routing theater (3s) → in-call strip.
function onVerdictReject() {
  if (state.lim.rejectClicked) return;
  state.lim.rejectClicked = true;
  state.lim.callStarted = true;

  const slot = document.getElementById('lim-ctas-slot');
  if (!slot) return;
  // Drop verdict section, spawn SOP-suggest dialogue. Escalating to the offsite expert is a deviation
  // from the onsite-remediation path, so Lim logs his rationale before the call (Workflow Agent trace).
  slot.innerHTML = `
    <div class="sop-suggest-dialogue">
      <div class="ssd-row">
        <div class="ssd-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1 1 0 0 0-1.02.24l-2.2 2.2a15.05 15.05 0 0 1-6.59-6.58l2.2-2.21a1 1 0 0 0 .25-1.02A11.36 11.36 0 0 1 8.5 4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1c0 9.39 7.61 17 17 17a1 1 0 0 0 1-1v-3.5a1 1 0 0 0-1-1z"/></svg>
        </div>
        <div class="ssd-body">
          <div class="ssd-text">SOP suggests calling <span class="dyn-name">Dr. A. Ismail</span></div>
          <div class="ssd-sub">SOP-BFP-VIBR-001 · escalation playbook · Senior Engineer reference</div>
        </div>
      </div>
      <div class="ssd-deviation">
        <label class="ssd-dev-label">Rationale for deviation <span class="ssd-dev-req">· required</span></label>
        <textarea class="ssd-dev-input" rows="3" placeholder="Why escalate to the offsite expert? e.g. onsite checks don't fit the bearing-spalling hypothesis — lube oil clean, no spall pattern on the inspection port; vibration + NDE temp rise point elsewhere.">${escapeHtml(state.lim.deviationRationale || '')}</textarea>
      </div>
      <button class="ssd-action" type="button" disabled>Call</button>
    </div>`;

  wireSOPSuggestDialogue();
}

function wireSOPSuggestDialogue() {
  const btn = document.querySelector('.sop-suggest-dialogue .ssd-action');
  const ta = document.querySelector('.sop-suggest-dialogue .ssd-dev-input');
  // Deviation rationale: capture + gate the Call button; auto-fill (typewriter) on first press.
  if (ta && ta.dataset.wired !== '1') {
    ta.dataset.wired = '1';
    const sync = () => {
      state.lim.deviationRationale = ta.value;
      if (btn) btn.disabled = !ta.value.trim();
    };
    ta.addEventListener('input', sync);
    const fill = () => typewriterFill(ta, 'Unexpected temperature rise not consistent with bearing issue', {
      onComplete: () => showSensorClarifier(ta, {
        msg: 'Your rationale is sparse. Attach the onsite readings that triggered the deviation — dial-indicator runout 0.18 mm TIR at shaft mid-span (limit 0.05 mm), NDE bearing housing temp 71°C vs 55°C baseline; 1×RPM + ~180° phase = bent-shaft signature, not bearing spalling. Add the readings?',
        append: 'Dial-indicator runout 0.18 mm TIR at shaft mid-span (limit 0.05 mm); NDE bearing housing temp 71°C vs 55°C baseline; 1×RPM dominant + ~180° NDE–DE phase shift = bent-shaft signature, not bearing spalling.',
      }),
    });
    ta.addEventListener('focus', fill);
    ta.addEventListener('click', fill);
    sync();
  }
  if (btn && btn.dataset.wired !== '1') {
    btn.dataset.wired = '1';
    btn.addEventListener('click', onSOPSuggestCallClick);
  }
}

// Demo typewriter — type `text` into a textarea char-by-char, firing input events so wired
// listeners (button-gating, state capture) update live. Guarded so it runs once per element and
// never overwrites text the user already has (re-entry reversibility).
function typewriterFill(elTextarea, text, opts = {}) {
  if (!elTextarea || elTextarea.dataset.typed === '1') return;
  if (elTextarea.value.trim()) { elTextarea.dataset.typed = '1'; return; }
  elTextarea.dataset.typed = '1';
  const speed = opts.speed || 26;
  let i = 0;
  const tick = () => {
    i++;
    elTextarea.value = text.slice(0, i);
    elTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    if (i < text.length) setTimeout(tick, speed);
    else if (typeof opts.onComplete === 'function') setTimeout(opts.onComplete, 350);
  };
  tick();
}

// Sensor-data clarifier — after a sparse note auto-types, the Sensor Anomaly Inspector offers to
// attach the exact telemetry behind the call. Accept appends precise readings; Dismiss removes it.
// Shows once per textarea (dataset.clarified guard).
function showSensorClarifier(textarea, cfg) {
  if (!textarea || textarea.dataset.clarified === '1') return;
  const container = textarea.parentElement;
  if (!container) return;
  textarea.dataset.clarified = '1';
  const box = el('div', 'sensor-clarifier');
  box.innerHTML = `
    <div class="scl-row">
      <div class="scl-icon">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 2a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v3h1a2 2 0 0 1 0 4h-1v3a2 2 0 0 1-2 2h-3v-2a2 2 0 0 0-4 0v2H7a2 2 0 0 1-2-2v-3H4a2 2 0 0 1 0-4h1V7a2 2 0 0 1 2-2h3V4a2 2 0 0 1 2-2z"/></svg>
      </div>
      <div class="scl-body">
        <div class="scl-agent">Sensor Anomaly Inspector</div>
        <div class="scl-msg">${cfg.msg}</div>
      </div>
    </div>
    <div class="scl-actions">
      <button class="scl-btn scl-dismiss" type="button">Dismiss</button>
      <button class="scl-btn scl-accept" type="button">Accept</button>
    </div>`;
  container.insertAdjacentElement('afterend', box);
  box.querySelector('.scl-dismiss').addEventListener('click', () => box.remove());
  box.querySelector('.scl-accept').addEventListener('click', () => {
    box.remove();
    typewriterAppend(textarea, cfg.append);
  });
}

// Append precise readings to an existing note char-by-char, firing input events so wired
// listeners (state capture, Confirm/Call gating) update live. Bypasses typewriterFill's once-guard.
function typewriterAppend(textarea, addition) {
  if (!textarea) return;
  const base = textarea.value.replace(/\s+$/, '');
  const sep = base ? (/[.;:!?]$/.test(base) ? ' ' : '. ') : '';
  const full = base + sep + addition;
  let i = (base + sep).length;
  const tick = () => {
    i++;
    textarea.value = full.slice(0, i);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.scrollTop = textarea.scrollHeight;
    if (i < full.length) setTimeout(tick, 22);
  };
  tick();
}

function onSOPSuggestCallClick() {
  const slot = document.getElementById('lim-ctas-slot');
  if (!slot) return;
  const dialogue = slot.querySelector('.sop-suggest-dialogue');
  if (dialogue) dialogue.remove();

  // Log Lim's deviation rationale to the Workflow Agent trace (SOP-adherence / deviation capture).
  if (window.LOG && (state.lim.deviationRationale || '').trim()) {
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: 'workflow',
      text: `Deviation logged by Lim Wei Jie · escalating to offsite expert · rationale: "${state.lim.deviationRationale.trim()}"`,
      dataSource: 'Hyperspace OS',
      nodeChain: ['sop-bfp-vibration-investigation'],
    });
  }

  // Fire SOP Action Agent theater (3s) — shorter than original 6s since the dialogue accounted for pacing.
  slot.insertAdjacentHTML('beforeend', `
    <div class="sop-routing-theater">
      <span class="reveal-dots"><span></span><span></span><span></span></span>
      <span class="reveal-msg">
        <span class="reveal-agent">SOP Action Agent</span> · Connecting to <span class="dyn-name">Dr. A. Ismail</span> via call · routing through escalation playbook
      </span>
    </div>`);

  if (window.LOG) {
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: 'sop-action',
      text: 'SOP Action Agent · Connecting to Dr. A. Ismail via call · routing through escalation playbook',
      dataSource: 'Hyperspace OS',
      nodeChain: ['dr-ismail', 'sop-bfp-vibration-investigation'],
    });
  }
  fireAgentCardLifecycle('sop-action', 3000);

  setTimeout(() => {
    const t = slot.querySelector('.sop-routing-theater');
    if (t) t.remove();
    spawnInCallStrip();
  }, 3000);
}

// W7 — Confirm = alt-path stub (Pulkit won't click in live demo).
function onVerdictConfirm() {
  const ticket = getCanonicalTicket();
  if (ticket.byPersona.onsite.actioned) return;
  ticket.byPersona.onsite.actioned = true;
  setStatePill('DIAGNOSIS_CONFIRMED_WO_SUBMITTED');
  ticket.handoffPending.ops = true;
  ticket.byPersona.ops.seen = false;
  ticket.byPersona.ops.opened = false;

  const slot = document.getElementById('lim-ctas-slot');
  if (slot) slot.innerHTML = '';
  appendConfirmedCaptureFooter();

  if (window.LOG) {
    window.LOG.appendLine({ ts: currentSGTLog(), source: 'workflow', text: 'Hyperspace OS hypothesis confirmed by Lim Wei Jie · WO submitted', dataSource: 'Hyperspace OS', nodeChain: ['sop-bfp-vibration-investigation'] });
    window.LOG.appendLine({ ts: currentSGTLog(), source: 'workflow', text: 'Workflow trace · P2 Onsite → P1 Ops Tower · WO chain enriched · Faye Sit notified', dataSource: 'Hyperspace OS', nodeChain: ['r-kumar'] });
  }
  fireAgentCardLifecycle('workflow', 2000);
  render();
}

function appendConfirmedCaptureFooter() {
  const container = document.getElementById('incident-detail-view');
  if (!container) return;
  if (container.querySelector('.dispatch-capture-footer')) return;
  const footer = el('div', 'dispatch-capture-footer');
  footer.innerHTML = `
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt"><strong>Hyperspace OS</strong> · diagnosis confirmed · WO submitted</span></div>
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt">Workflow trace routed to <strong>A2A Coordination Agent</strong></span></div>
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt"><span class="dyn-name">Faye Sit</span> notified · returned for ops + commercial action</span></div>`;
  container.appendChild(footer);
  const lbl = el('div', 'dispatched-to-label');
  lbl.innerHTML = `WO submitted · returned to <span class="dyn-name">Faye Sit</span> · ${currentSGTLog()}`;
  container.appendChild(lbl);
}

// W7 — spawn in-call strip directly (no top button to morph; replaces W4.1 escalate-cta replacement path)
function spawnInCallStrip() {
  const slot = document.getElementById('lim-ctas-slot');
  if (!slot) return;
  if (slot.querySelector('.in-call-strip')) return;
  const strip = document.createElement('div');
  strip.className = 'in-call-strip';
  strip.innerHTML = buildInCallStripHTML();
  slot.appendChild(strip);
  wireInCallEnd();
  if (state.lim.callEnded) {
    strip.classList.add('call-ended');
    const label = strip.querySelector('.in-call-label');
    if (label) label.textContent = `Call ended · transcript captured · ${state.lim.revisionTimestamp || '02:55 SGT'}`;
    const endBtn = strip.querySelector('.in-call-end-btn');
    if (endBtn) endBtn.remove();
  }
  // short-og-demo — live typewriter transcript removed; call strip shows status only.
}

function buildInCallStripHTML() {
  return `
    <div class="in-call-status">
      <span class="in-call-phone-ic">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1 1 0 0 0-1.02.24l-2.2 2.2a15.05 15.05 0 0 1-6.59-6.58l2.2-2.21a1 1 0 0 0 .25-1.02A11.36 11.36 0 0 1 8.5 4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1c0 9.39 7.61 17 17 17a1 1 0 0 0 1-1v-3.5a1 1 0 0 0-1-1z"/></svg>
      </span>
      <span class="in-call-label">On call · Dr. A. Ismail</span>
      <span class="in-call-audio-wave"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></span>
    </div>
    <button class="in-call-end-btn" type="button">End</button>`;
}

function wireInCallEnd() {
  const endBtn = document.querySelector('.in-call-end-btn');
  if (!endBtn || endBtn.dataset.wired === '1') return;
  endBtn.dataset.wired = '1';
  endBtn.addEventListener('click', onCallEnd);
}

// W44 — live call transcript: real-time typewriter, alternating speakers, "typing" theater between lines.
// Dialogue mirrors the post-call transcript modal (index.html #transcript-modal) so they stay in sync.
const ISMAIL_CALL_SCRIPT = [
  { spk: 'lim',    name: 'L. Lim',     text: `Ismail-sir — NDE bearing housing temp on BFP-3A just spiked to 94°C and it's still climbing. Vibration's well into Zone C. But the checks don't fit bearing spalling — lube oil's clean, no spall pattern on the inspection port. Something else is driving this.` },
  { spk: 'ismail', name: 'Dr. Ismail', text: `Rapid temp rise with that vibration signature — don't fixate on the bearing. Pull up the casing inspection from your station. Look for hairline cracking around the volute weld near the discharge flange.` },
  { spk: 'lim',    name: 'L. Lim',     text: `... I see it. Faint discontinuity at the 4-o'clock position on the casing, about 60mm from the discharge weld. Liquid penetrant would confirm.` },
  { spk: 'ismail', name: 'Dr. Ismail', text: `That's a casing crack — same failure mode I saw on Jurong-CCGT-2 BFP three years ago. Pump casing fatigue under cyclic pressure load. The bearing heat and vibration are secondary — symptoms, not the root cause.` },
  { spk: 'lim',    name: 'L. Lim',     text: `Updating diagnosis: pump casing crack · BFP-3A. Bearing damage and temp rise look like secondary effects from imbalanced loading.` },
  { spk: 'ismail', name: 'Dr. Ismail', text: `Confirmed. Shutdown required — can't run with a propagating casing crack. Escalating back to Faye for ops + commercial impact routing.` },
];

function cancelCallTranscript() {
  (state.lim.callTimers || []).forEach(id => { clearTimeout(id); clearInterval(id); });
  state.lim.callTimers = [];
}

function onCallEnd() {
  if (state.lim.callEnded) return;
  state.lim.callEnded = true;
  cancelCallTranscript();   // W44 — stop any in-progress live typing
  const endBtn = document.querySelector('.in-call-end-btn');
  const strip = document.querySelector('.in-call-strip');
  if (!strip) return;
  strip.classList.add('call-ended');
  const label = strip.querySelector('.in-call-label');
  if (label) label.textContent = `Call ended · transcript captured · ${currentSGTLog()}`;
  if (endBtn) endBtn.remove();

  // Stage 1: generating-transcript (3s · Audio-transcription Agent — W8 A.6)
  spawnPostCallStage('generating-transcript');
  if (window.LOG) {
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: 'audio-transcription',
      text: 'Audio-transcription Agent · Capturing call audio · generating transcript',
      dataSource: 'Hyperspace OS',
      nodeChain: [],
    });
  }
  fireAgentCardLifecycle('audio-transcription', dotsMs(3000));
  setTimeout(() => {
    swapPostCallStage('generating-transcript', 'transcript-attached');
    state.lim.transcriptAttached = true;

    // W8 D.4 — drop call-ended strip when Transcript attached appears.
    if (strip) {
      strip.style.transition = 'opacity 0.3s ease-out';
      strip.style.opacity = '0';
      setTimeout(() => strip.remove(), 320);
    }
    // W44 — fade the live transcript bubbles once it's captured into the attached transcript.
    const liveTx = document.querySelector('.call-transcript');
    if (liveTx) {
      liveTx.style.transition = 'opacity 0.3s ease-out';
      liveTx.style.opacity = '0';
      setTimeout(() => liveTx.remove(), 320);
    }

    if (window.LOG) {
      window.LOG.appendLine({
        ts: currentSGTLog(),
        source: 'audio-transcription',
        text: 'Call transcript generated · 7m 23s · 6 exchanges · auto-attached',
        dataSource: 'Hyperspace OS',
        nodeChain: [],
      });
    }
    spawnPostCallStage('analyzing-transcript');
    // Stage 2: analyzing-transcript (3s · Audio-transcription Agent — W8 A.6)
    fireAgentCardLifecycle('audio-transcription', dotsMs(3000));
    setTimeout(() => {
      // Remove analyzing-transcript loading visual
      const slot = document.getElementById('lim-ctas-slot');
      const analyzingEl = slot && slot.querySelector('.post-call-stage[data-stage="analyzing-transcript"]');
      if (analyzingEl) analyzingEl.remove();

      if (window.LOG) {
        window.LOG.appendLine({
          ts: currentSGTLog(),
          source: 'audio-transcription',
          text: 'Transcript analysis · diarized speakers · revised diagnosis extracted',
          dataSource: 'Hyperspace OS',
          nodeChain: ['pump-casing-crack-pattern'],
        });
      }
      // W8 E.4 — auto-trigger diagnosis morph + Revise diagnosis tile spawn (no user click).
      onDiagnosisConfirmedClick();
    }, dotsMs(3000));
  }, dotsMs(3000));
}

function paintPostCallStagesFromState() {
  // Re-entry mid-flow — show transcript-attached if that stage was reached.
  // W8 E.4 — diagnosis-confirmed-button stage removed; Revise diagnosis tile spawned separately by caller.
  if (state.lim.transcriptAttached) {
    spawnPostCallStage('transcript-attached');
  }
}

function spawnPostCallStage(stage) {
  const slot = document.getElementById('lim-ctas-slot');
  if (!slot) return;
  if (slot.querySelector(`.post-call-stage[data-stage="${stage}"]`)) return;
  const node = document.createElement('div');
  node.className = 'post-call-stage';
  node.dataset.stage = stage;
  node.innerHTML = postCallStageHTML(stage);
  slot.appendChild(node);
  if (stage === 'transcript-attached') wireTranscriptModalLinks();
  // W8 E.4 — diagnosis-confirmed-button stage retired; Revise tile spawned via spawnReviseDiagnosisTile().
}

function swapPostCallStage(fromStage, toStage) {
  const slot = document.getElementById('lim-ctas-slot');
  if (!slot) return;
  const fromEl = slot.querySelector(`.post-call-stage[data-stage="${fromStage}"]`);
  if (fromEl) fromEl.remove();
  spawnPostCallStage(toStage);
}

function postCallStageHTML(stage) {
  // W8 A.6 — generating/analyzing fire Audio-transcription Agent (not workflow).
  switch (stage) {
    case 'generating-transcript':
      return `
        <span class="reveal-dots"><span></span><span></span><span></span></span>
        <span class="post-call-msg">
          <span class="post-call-agent">Audio-transcription Agent</span> · Generating transcript...
        </span>`;
    case 'transcript-attached':
      return `
        <span class="post-call-ok">✓</span>
        <span class="post-call-msg">
          Transcript attached · 7m 23s ·
          <button class="post-call-transcript-link" type="button">View transcript</button>
        </span>`;
    case 'analyzing-transcript':
      return `
        <span class="reveal-dots"><span></span><span></span><span></span></span>
        <span class="post-call-msg">
          <span class="post-call-agent">Audio-transcription Agent</span> · Analyzing transcript...
        </span>`;
    case 'diagnosis-confirmed-button':
      // W8 E.2 — replaced by .revise-diagnosis-tile spawned via spawnReviseDiagnosisTile().
      // This stage no longer renders user-facing content; trigger handled inside onCallEnd timeline.
      return '';
  }
  return '';
}

function onDiagnosisConfirmedClick() {
  if (state.lim.diagnosisRevised) return;
  state.lim.diagnosisRevised = true;
  state.lim.revisionTimestamp = '02:55 SGT';
  // W19 — explicit workflow deviation: onsite findings diverge from the dispatched WO; show + log it.
  spawnDeviationNotice();
  // Replace diagnosis hypothesis tile inline
  morphDiagnosisTile();
  // W8 E.2 — spawn Revise diagnosis TILE w/ inline Confirm button (replaces W7 standalone button)
  spawnReviseDiagnosisTile();
  if (window.LOG) {
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: 'workflow',
      text: `Diagnosis revised at ${state.lim.revisionTimestamp} · pump casing crack confirmed via call + targeted inspection`,
      dataSource: 'Hyperspace OS',
      nodeChain: ['pump-casing-crack-pattern', 'casing-bfp-3a', 'casing-rca-jrg-2023'],
    });
  }
  // W6 — KG growth animation fires 10s later
  setTimeout(triggerKGGrowth, 10000);
}

// W7 — KG growth: nodes already in initial graph; just flash green halo on tacit cluster for 4s.
function triggerKGGrowth() {
  if (state.kgGrowthFired) return;
  state.kgGrowthFired = true;
  if (window.LOG) {
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: 'workflow',
      text: "Tacit knowledge captured from Dr. A. Ismail's expert collaboration · 3 KG nodes refreshed · BFP casing patterns codified",
      dataSource: 'Hyperspace OS',
      nodeChain: ['casing-tacit-knowledge', 'ismail-field-experience-2023', 'bfp-casing-inspection-protocol'],
    });
  }
  fireAgentCardLifecycle('workflow', 2000);
  flashKGGrowthHalo();
}

function flashKGGrowthHalo() {
  if (!KG_STATE.graph) return;
  KG_STATE.newlyAddedNodes = new Set(KG_GROWTH_NODE_IDS);
  refreshKGStyles();
  setTimeout(() => {
    KG_STATE.newlyAddedNodes.clear();
    if (KG_STATE.graph && typeof KG_STATE.graph.refresh === 'function') {
      KG_STATE.graph.refresh();
    }
    refreshKGStyles();
  }, 4000);
}

function morphDiagnosisTile() {
  const slot = document.getElementById('lim-summary-slot');
  if (!slot) return;
  const section = slot.querySelector('.sr-section');
  if (!section) return;
  section.innerHTML = buildRevisedDiagnosisTileHTML();
  wireTranscriptModalLinks();
}

// W7 — dead code path (W4.1 escalate-ready morph removed; kept for re-entry safety, no-op).
function morphConfirmCTAToEscalate() {
  spawnReviseDiagnosisTile();
}

// W19 — explicit workflow-deviation notice (logged by the system) shown above the revise-diagnosis tile.
function spawnDeviationNotice() {
  const slot = document.getElementById('lim-ctas-slot');
  if (!slot || slot.querySelector('.deviation-notice')) return;
  slot.insertAdjacentHTML('beforeend', `
    <div class="deviation-notice">
      <span class="dn-icon">⚠</span>
      <div class="dn-body">
        <div class="dn-heading">Workflow deviation detected</div>
        <div class="dn-text">Onsite findings diverge from <strong>${WORK_ORDER.id}</strong> (bearing fix). Logged by <strong>Hyperspace OS</strong> · re-diagnosis triggered.</div>
      </div>
    </div>`);
  if (window.LOG) {
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: 'workflow',
      text: `Workflow deviation logged · ${WORK_ORDER.id} · onsite findings ≠ planned bearing fix · re-diagnosis triggered`,
      dataSource: 'Hyperspace OS',
      nodeChain: ['sop-bfp-vibration-investigation', 'pump-casing-crack-pattern'],
    });
  }
}

// W8 E.2 — Revise diagnosis TILE w/ heading + body + inline Confirm button (replaces W7 standalone button).
function spawnReviseDiagnosisTile() {
  const slot = document.getElementById('lim-ctas-slot');
  if (!slot) return;
  if (slot.querySelector('.revise-diagnosis-tile')) return;
  slot.insertAdjacentHTML('beforeend', `
    <div class="revise-diagnosis-tile">
      <div class="rdt-icon-block">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3,12 6,9 9,12"/>
          <path d="M6 9 v6 a4 4 0 0 0 4 4 h6"/>
          <polyline points="14,16 17,19 20,16"/>
          <path d="M17 19 v-6 a4 4 0 0 0 -4 -4 h-3"/>
        </svg>
      </div>
      <div class="rdt-body">
        <div class="rdt-heading">REVISED FAULT</div>
        <div class="rdt-text">
          Hyperspace OS detected that in addition to the bearings the main reason for this was actually a <span class="dyn-name">crack in pump casing on BFP-3A</span> based on call with <span class="dyn-name">Dr. A. Ismail</span>.
        </div>
      </div>
      <button class="rdt-confirm-btn" type="button">Add review finding</button>
    </div>`);
  wireReviseDiagnosisTile();
}

function wireReviseDiagnosisTile() {
  const btn = document.querySelector('.rdt-confirm-btn');
  if (!btn || btn.dataset.wired === '1') return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', onConfirmRevisedDiagnosisClick);
}

// W15 — Severity bump (AMBER → CRITICAL) post crack-confirm. Persona-agnostic.
function bumpSeverityToCritical() {
  if (INCIDENT.severity === 'CRITICAL') return;
  INCIDENT.severity = 'CRITICAL';
  document.querySelectorAll('.sev-pill').forEach(el => {
    el.dataset.severity = 'CRITICAL';
    el.innerHTML = '▲ Severity: CRITICAL';
  });
}

function onConfirmRevisedDiagnosisClick() {
  if (state.lim.confirmRevisedClicked) return;
  state.lim.confirmRevisedClicked = true;
  bumpSeverityToCritical();   // W15 — flip severity to CRITICAL red on crack-confirm
  const btn = document.querySelector('.rdt-confirm-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Reviewing...';
  }
  const slot = document.getElementById('lim-ctas-slot');
  if (slot) {
    slot.insertAdjacentHTML('beforeend', `
      <div class="sop-review-theater">
        <span class="reveal-dots"><span></span><span></span><span></span></span>
        <span class="reveal-msg">
          <span class="reveal-agent">SOP Action Agent</span> · Reviewing SOP-BFP-VIBR-001 + cross-checking revised diagnosis against current procedures
        </span>
      </div>`);
  }
  if (window.LOG) {
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: 'sop-action',
      text: 'SOP Action Agent · Reviewing SOP-BFP-VIBR-001 + cross-checking revised diagnosis · routing to Ops',
      dataSource: 'Hyperspace OS',
      nodeChain: ['sop-bfp-vibration-investigation', 'pump-casing-crack-pattern'],
    });
  }
  fireAgentCardLifecycle('sop-action', 3000);

  setTimeout(() => {
    document.querySelector('.sop-review-theater')?.remove();
    document.querySelector('.revise-diagnosis-tile')?.remove();
    document.querySelector('.deviation-notice')?.remove();
    // W19 — the work order is regenerated server-side + surfaced in Faye's escalation report; Lim just routes it back.
    advanceToRoutedRevisedDiagnosis();
  }, 3000);
}

function advanceToRoutedRevisedDiagnosis() {
  const ticket = getCanonicalTicket();
  ticket.byPersona.onsite.actioned = true;
  setStatePill('REVISED_DIAGNOSIS_ROUTED');
  ticket.handoffPending.ops = true;
  ticket.byPersona.ops.seen = false;
  ticket.byPersona.ops.opened = false;
  state.lim.revisionTimestamp = state.lim.revisionTimestamp || '02:55 SGT';

  appendRevisedDiagnosisCaptureFooter();

  if (window.LOG) {
    window.LOG.appendLine({ ts: currentSGTLog(), source: 'workflow', text: 'State advance · REVISED_DIAGNOSIS_ROUTED · routed to Faye Sit for ops + commercial impact', dataSource: 'Hyperspace OS', nodeChain: ['r-kumar'] });
    window.LOG.appendLine({ ts: currentSGTLog(), source: 'wo-prefill', text: `${WORK_ORDER.id} superseded · ${WORK_ORDER_REVISED.id} regenerated · revised diagnosis + updated works · surfaced to Faye Sit`, dataSource: 'Hyperspace OS', nodeChain: ['sop-wo-creation', 'pump-casing-crack-pattern'] });
    window.LOG.appendLine({ ts: currentSGTLog(), source: 'workflow', text: 'KG enriched · revised diagnosis + call transcript attached to incident', dataSource: 'Hyperspace OS', nodeChain: ['pump-casing-crack-pattern'] });
    window.LOG.appendLine({ ts: currentSGTLog(), source: 'learning', text: 'Learning Engine · service report compiled from full incident knowledge (telemetry · diagnoses · override · onsite checks · Dr. Ismail transcript · revised failure mode · remediation) · ready for Lim Wei Jie review', dataSource: 'Hyperspace OS', nodeChain: ['pump-casing-crack-pattern', 'sop-bfp-vibration-investigation'] });
  }
  fireAgentCardLifecycle('workflow', 2000);
  fireAgentCardLifecycle('learning', 2500);
  render();
}

function appendRevisedDiagnosisCaptureFooter() {
  const container = document.getElementById('incident-detail-view');
  if (!container) return;
  if (container.querySelector('.dispatch-capture-footer')) return;
  const footer = el('div', 'dispatch-capture-footer');
  footer.innerHTML = `
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt"><strong>Hyperspace OS</strong> · <span class="dyn-name">Faye Sit</span> notified · revised diagnosis routed</span></div>
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt">Call transcript + revised diagnosis routed to <strong>A2A Coordination Agent</strong> for chain-of-custody</span></div>
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt"><strong>Knowledge-Graph</strong> · revised diagnosis + transcript enriched · routing recorded</span></div>`;
  container.appendChild(footer);
  const lbl = el('div', 'dispatched-to-label');
  lbl.innerHTML = `Routed back to <span class="dyn-name">Faye Sit</span> · ${currentSGTLog()}`;
  container.appendChild(lbl);
}

// Lim's final page (revised-diagnosis path) — two compact cards, each expanding to a full
// document modal: (1) Quantified impact summary, (2) Regenerated work order. Both routed to Faye.
function spawnLimReportCards(slot) {
  if (!slot || slot.querySelector('.lim-report-cards')) return;
  slot.insertAdjacentHTML('beforeend', buildLimReportCardsHTML());
}

function buildLimReportCardsHTML() {
  const stats = IMPACT_SUMMARY.headline.map(s =>
    `<div class="lim-rc-stat"><span class="lim-rc-stat-v">${s.v}</span><span class="lim-rc-stat-k">${s.k}</span><span class="lim-rc-stat-note">${s.note}</span></div>`).join('');
  return `
    <div class="lim-report-cards">
      <div class="lim-rc-eyebrow">◆ Compiled by Learning Engine</div>
      <button class="lim-rc-card lim-impact-card" type="button">
        <div class="lim-rc-head">
          <span class="lim-rc-title">Quantified impact summary</span>
          <span class="lim-rc-expand">expand ▸</span>
        </div>
        <div class="lim-rc-stats">${stats}</div>
        <div class="lim-rc-sub">Block 2 ~50 MW derate · 45 min action window · tap to view full breakdown</div>
      </button>
      <button class="lim-rc-card lim-regenwo-card" type="button">
        <div class="lim-rc-head">
          <span class="lim-rc-title">Regenerated work order <span class="lim-rc-badge">R1</span></span>
          <span class="lim-rc-expand">expand ▸</span>
        </div>
        <div class="lim-rc-woid">${WORK_ORDER_REVISED.id}</div>
        <div class="lim-rc-sub">${WORK_ORDER_REVISED.diagnosis} · tap to view full work order</div>
      </button>
      <div class="lim-rc-foot">Both routed to <span class="dyn-name">Faye Sit</span> for ops + commercial impact · written back to Knowledge-Graph.</div>
    </div>`;
}

// W45 (superseded) — comprehensive Service Report on Lim's final page. No longer rendered;
// kept inert as the Sources path still references serviceReportSections().
function spawnServiceReport(slot) {
  if (!slot || slot.querySelector('.service-report')) return;
  slot.insertAdjacentHTML('beforeend', buildServiceReportHTML());
}

// W45/W46 — single source of truth for the report's 7 sections (label + sourceId + content html).
// Both the plain report (Lim's page) and the highlighted Sources view render from this.
function serviceReportSections() {
  const opts = getDiagnosisOptions();
  const rec = opts.find(o => o.recommended) || opts[0];
  const capId = (state.faye && state.faye.selectedOption) || 'primary';
  const captured = opts.find(o => o.id === capId) || rec;
  const overrideReason = ((state.faye && state.faye.overrideReason) || '').trim();
  const isOverride = captured && !captured.recommended;

  const telemetryRows = INCIDENT.metrics.map(m =>
    `<div class="svr-kv"><span class="svr-k">${m.lbl}</span><span class="svr-v">${m.val} ${m.unit}<span class="svr-note"> · ${m.nom}</span></span></div>`).join('');

  const diagRows = opts.map(o =>
    `<div class="svr-kv"><span class="svr-k">${o.name}${o.recommended ? ' <span class="svr-tag">AI recommended</span>' : ''}</span><span class="svr-v">${o.conf}%</span></div>`).join('');

  const overrideHtml = isOverride
    ? `<p class="svr-p">Ops (<span class="dyn-name">Faye Sit</span>) overrode the AI's top recommendation
         (<strong>${rec.name} · ${rec.conf}%</strong>) and captured <strong>${captured.name} · ${captured.conf}%</strong>.</p>
       <div class="svr-quote">${overrideReason ? '“' + escapeHtml(overrideReason) + '”' : '<em>No rationale recorded.</em>'}</div>`
    : `<p class="svr-p">Ops (<span class="dyn-name">Faye Sit</span>) confirmed the AI recommendation: <strong>${captured.name} · ${captured.conf}%</strong>.</p>`;

  const safetyGrp = LIM_INSPECTION_CHECKLIST.find(g => g.group === 'Safety');
  const rciGrp = LIM_INSPECTION_CHECKLIST.find(g => g.group === 'Root cause isolation');
  const safetyDone = safetyGrp.items.filter(it => state.lim.checked[it.id]).length;
  const rciRows = rciGrp.items.map(it => {
    const done = !!state.lim.checked[it.id];
    const status = done ? '<span class="svr-ok">✓ done</span>' : '<span class="svr-sup">superseded</span>';
    return `<div class="svr-kv"><span class="svr-k">${it.text}</span><span class="svr-v">${status}</span></div>`;
  }).join('');

  const txRows = ISMAIL_CALL_SCRIPT.map(l =>
    `<div class="svr-tx"><span class="svr-tx-spk svr-tx-${l.spk}">${l.name}</span><span class="svr-tx-txt">${l.text}</span></div>`).join('');

  const remediationRows = WORK_ORDER_REVISED.checklist.map(c => `<li>${c}</li>`).join('');

  return [
    { sourceId: 'sr-machine', label: '1 · Initial telemetry readings',
      html: `${telemetryRows}<div class="svr-kv"><span class="svr-k">NDE bearing housing temp (onsite)</span><span class="svr-v">94 °C<span class="svr-note"> · spiking, +16 °C / 4 min</span></span></div>` },
    { sourceId: 'sr-diag', label: '2 · AI-generated diagnoses + confidence', html: diagRows },
    { sourceId: 'sr-human', label: '3 · Ops override rationale', html: overrideHtml },
    { sourceId: 'sr-human', label: '4 · Onsite safety + root-cause checks · <span class="dyn-name">Lim Wei Jie</span>',
      html: `<div class="svr-kv"><span class="svr-k">Safety checks</span><span class="svr-v"><span class="svr-ok">${safetyDone}/${safetyGrp.items.length} complete</span></span></div>${rciRows}<p class="svr-p svr-muted">Temperature spike on NDE bearing housing halted remaining root-cause checks → escalation to offsite expert.</p>` },
    { sourceId: 'sr-call', label: '5 · Escalation exchange · <span class="dyn-name">Dr. A. Ismail</span> (offsite)',
      html: `<div class="svr-transcript">${txRows}</div>` },
    { sourceId: 'sr-call', label: '6 · Revised failure mode',
      html: `<p class="svr-p"><strong>Crack in pump casing on BFP-3A</strong> — 60 mm hairline at the 4-o'clock volute position, near the discharge weld. NDE/DE bearing damage secondary (fatigue from imbalanced loading). Confirmed via Dr. A. Ismail field-experience pattern-match (Jurong-CCGT-2 BFP, 2023).</p>` },
    { sourceId: 'sr-sop', label: '7 · Final remediation steps', html: `<ul class="svr-list">${remediationRows}</ul>` },
  ];
}

function buildServiceReportHTML() {
  const sectionsHtml = serviceReportSections().map(s =>
    `<div class="svr-section"><div class="svr-label">${s.label}</div>${s.html}</div>`).join('');
  const summaryHtml = `
      <div class="svr-summary">
        <div class="svr-summary-eyebrow">Work completed</div>
        <div class="svr-summary-title">Pump casing crack repair · BFP-3A</div>
        <p class="svr-summary-text"><strong>${WORK_ORDER_REVISED.id}</strong> · revised diagnosis confirmed a <strong>crack in the pump casing on BFP-3A</strong> (60 mm hairline at the discharge weld), with secondary NDE/DE bearing damage. BFP-3A was shut down and Block 2 feedwater isolated; casing dye-penetrant NDT and bearing-damage assessment completed, and the work order escalated to the offsite expert for sign-off per SOP-BFP-VIBR-001.</p>
      </div>`;
  return `
    <div class="service-report">
      <div class="svr-head">
        <div>
          <div class="svr-title">Service Report</div>
          <div class="svr-sub">INC-2026-0537 · JRG-CCGT-1 · Block 2 · BFP-3A</div>
        </div>
        <div class="svr-head-right">
          <span class="svr-gen">Compiled by Learning Engine</span>
          <button class="svr-sources-btn" type="button">◆ Sources</button>
        </div>
      </div>
      ${summaryHtml}
      ${sectionsHtml}
      <div class="svr-foot">Severity escalated AMBER → CRITICAL · routed to <span class="dyn-name">Faye Sit</span> for ops + commercial impact · transcript + revised diagnosis written back to Knowledge-Graph.</div>
    </div>`;
}

function onEscalateForApprovalClick() {
  const ticket = getCanonicalTicket();
  if (ticket.byPersona.onsite.actioned) return;
  ticket.byPersona.onsite.actioned = true;
  setStatePill('ESCALATED_TO_OFFSITE');
  ticket.handoffPending.offsite = true;
  state.lim.revisionTimestamp = state.lim.revisionTimestamp || '02:55 SGT';
  fireWorkflowAgentArcEscalate();
  appendEscalationCaptureFooter();
  paintLimEscalationComplete();
  render();
}

function paintLimEscalationComplete() {
  // Remove binary CTAs + post-call stages (post-escalation view)
  const slot = document.getElementById('lim-ctas-slot');
  if (slot) slot.innerHTML = '';
}

function appendEscalationCaptureFooter() {
  const container = document.getElementById('incident-detail-view');
  if (!container) return;
  if (container.querySelector('.dispatch-capture-footer')) return;
  const footer = el('div', 'dispatch-capture-footer');
  footer.innerHTML = `
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt"><strong>Hyperspace OS</strong> confirms revised diagnosis SOP followed</span></div>
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt">Call transcript routed to <strong>A2A Coordination Agent</strong> for review</span></div>
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt"><strong>Knowledge-Graph</strong> · team · incident · revised diagnosis + transcript enriched</span></div>`;
  container.appendChild(footer);
  const lbl = el('div', 'dispatched-to-label');
  lbl.innerHTML = `Escalated to <span class="dyn-name">Dr. A. Ismail</span> · 02:56 SGT`;
  container.appendChild(lbl);
}

function fireWorkflowAgentArcEscalate() {
  // Mini arc — 3 log lines via Workflow Agent capture
  const agentId = 'workflow';
  setAgentActive(agentId, 'Escalation Capture', 3);
  fireAgentCardLifecycle(agentId, 3000);
  const lines = [
    { delay: 200,  line: { ts: '02:56:10', source: 'workflow', text: 'Lim Wei Jie · escalation captured · revised diagnosis pump casing crack', dataSource: 'Hyperspace OS', nodeChain: ['lim-wei-jie', 'pump-casing-crack-pattern', 'casing-bfp-3a'] } },
    { delay: 900,  line: { ts: '02:56:11', source: 'workflow', text: 'handoff sequence recorded · P2 Onsite → P3 Offsite · approval pending', dataSource: 'Hyperspace OS', nodeChain: ['lim-wei-jie', 'dr-ismail'] } },
    { delay: 900,  line: { ts: '02:56:12', source: 'workflow', text: 'SOP-BFP-VIBR-001 · revised diagnosis + call transcript attached to KG', dataSource: 'Hyperspace OS', nodeChain: ['sop-bfp-vibration-investigation', 'pump-casing-crack-pattern'] } },
  ];
  let t = 0;
  lines.forEach((entry, idx) => {
    t += entry.delay;
    scheduleArcStep(t, () => {
      window.LOG.appendLine(entry.line);
      advanceAgentStep(agentId, idx, entry.line);
    });
  });
  t += 400;
  scheduleArcStep(t, () => teardownAgentTree(agentId));
}

// ─────────────────────────────────────────────
// W4 — Dr. A. Ismail (Offsite) curated Screen D
// Banner + summary (single 5s loading theater) + revised diagnosis read-only
// + transcript link + Approve escalation CTA
// ─────────────────────────────────────────────

function renderOffsiteIncidentDetail(root) {
  const content = el('div', 'tablet-content');
  content.id = 'incident-detail-view';

  const hdr = el('div', 'inc-header');
  hdr.innerHTML = `
    <span class="inc-back">
      <svg viewBox="0 0 8 13" fill="none">
        <path d="M7 1L1 6.5L7 12" stroke="rgba(255,255,255,0.85)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Back
    </span>
    <div class="inc-hdr-row">
      <div class="inc-hdr-left">
        <div class="inc-title">${INCIDENT.asset}</div>
        <div class="inc-id">${INCIDENT.id} · routed from Lim Wei Jie</div>
        <div class="inc-ts">${INCIDENT.timestamp}</div>
      </div>
      <span class="sev-pill" data-severity="${INCIDENT.severity}">▲ Severity: ${INCIDENT.severity}</span>
    </div>`;
  content.appendChild(hdr);

  const summarySlot = el('div', 'ismail-summary-slot');
  summarySlot.id = 'ismail-summary-slot';
  content.appendChild(summarySlot);

  const ctaSlot = el('div', 'ismail-cta-slot');
  ctaSlot.id = 'ismail-cta-slot';
  content.appendChild(ctaSlot);

  const backBtn = content.querySelector('.inc-back');
  if (backBtn) {
    backBtn.style.cursor = 'pointer';
    backBtn.addEventListener('click', backToMonitoring);
  }

  root.appendChild(content);

  const personaState = activePersonaTicketState();
  if (personaState.actioned) {
    paintIsmailSummaryComplete();
    paintIsmailCTAApproved();
    setTimeout(appendIsmailApprovalCaptureFooter, 200);
    return;
  }

  if (state.ismail.summaryRevealed) {
    paintIsmailSummaryComplete();
    paintIsmailCTAReady();
  } else {
    startIsmailScreenDReveal();
  }
}

function startIsmailScreenDReveal() {
  state.ismail.revealStarted = true;
  const slot = document.getElementById('ismail-summary-slot');
  if (!slot) return;
  // W6 — Ismail loading reveal alias: Equipment Diagnostic Agent (institutional rotating-machinery knowledge)
  slot.innerHTML = `
    <div class="reveal-pending ismail-loading" data-stage="ismail-summary">
      <span class="reveal-dots"><span></span><span></span><span></span></span>
      <span class="reveal-msg"><span class="reveal-agent">Equipment Diagnostic Agent</span> · Loading institutional rotating-machinery knowledge for Dr. A. Ismail</span>
    </div>`;
  // W6 — CTA deferred: spawn only on reveal complete (Section A)
  // W6 — fire right-pane card lifecycle (triage + power-gen critic in parallel)
  fireAgentCardsParallel(['triage', 'critic-power-gen'], 5000);
  if (window.LOG) {
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: 'triage',
      text: 'Equipment Diagnostic Agent · pulling Ismail\'s 2023 Jurong-2 BFP casing field-experience pattern + prior RCA traversal',
      dataSource: 'Hyperspace OS',
      nodeChain: ['casing-rca-jrg-2023', 'pump-casing-crack-pattern', 'dr-ismail'],
    });
  }
  pushReveal(() => {
    state.ismail.summaryRevealed = true;
    paintIsmailSummaryComplete();
    paintIsmailCTAReady();
  }, 5000);
}

function paintIsmailSummaryComplete() {
  const slot = document.getElementById('ismail-summary-slot');
  if (!slot) return;
  const ts = state.lim.revisionTimestamp || '02:55 SGT';
  slot.innerHTML = `
    <div class="summary-report ismail-summary">
      <div class="sr-heading">Predicted diagnosis</div>
      <div class="ismail-fwd-line">
        <span class="dyn-name">Lim Wei Jie</span> has forwarded this incident · diagnosis revision · escalation for offsite sign-off.
      </div>
      <div class="sr-hypothesis sr-hypothesis-revised ismail-revised">
        <div class="sr-hyp-row sr-hyp-original">
          <span class="sr-hyp-name strikethrough">${capturedDiagnosisName()}</span>
          <span class="sr-hyp-flag">SUPERSEDED</span>
        </div>
        <div class="sr-hyp-row sr-hyp-revised">
          <span class="sr-hyp-revised-label">Revised diagnosis ·</span>
          <span class="sr-hyp-name"><span class="dyn-name">Crack in pump casing on BFP-3A</span></span>
        </div>
        <div class="sr-hyp-revised-detail">
          Confirmed via expert field-experience pattern + targeted inspection (60mm hairline discontinuity, 4-o'clock on volute, near discharge weld).
          Bearing damage secondary, caused by imbalanced loading under casing fatigue.
          <button class="ismail-tx-link" type="button">View call transcript · <span class="dyn-name">${ts}</span></button>
        </div>
      </div>
      <div class="ismail-ask">
        Approval requested: shaft replacement scheduling + capacity impact escalation to Asset Performance.
      </div>
    </div>`;
  wireTranscriptModalLinks();
}

function paintIsmailCTADisabled() {
  const slot = document.getElementById('ismail-cta-slot');
  if (!slot) return;
  slot.innerHTML = `<button class="ismail-approve-cta" type="button" disabled>Approve escalation and route back to <span class="dyn-name-on-green">Faye Sit</span></button>`;
}

function paintIsmailCTAReady() {
  const slot = document.getElementById('ismail-cta-slot');
  if (!slot) return;
  slot.innerHTML = `<button class="ismail-approve-cta" type="button">Approve escalation and route back to <span class="dyn-name-on-green">Faye Sit</span></button>`;
  wireIsmailApproveClick();
}

function paintIsmailCTAApproved() {
  const slot = document.getElementById('ismail-cta-slot');
  if (slot) slot.innerHTML = '';
}

function wireIsmailApproveClick() {
  const cta = document.querySelector('.ismail-approve-cta');
  if (!cta || cta.dataset.wired === '1') return;
  cta.dataset.wired = '1';
  cta.addEventListener('click', onIsmailApproveClick);
}

function onIsmailApproveClick() {
  const ticket = getCanonicalTicket();
  if (ticket.byPersona.offsite.actioned) return;
  ticket.byPersona.offsite.actioned = true;
  // W5 — Ismail routes BACK to Faye (Site Operations Manager), not direct to Priya.
  setStatePill('ROUTED_BACK_TO_OPS');
  ticket.handoffPending.p1 = true;        // legacy key, harmless
  ticket.handoffPending.ops = true;       // Faye re-receives the ticket
  ticket.handoffPending.analyst = false;  // P4 stays locked until Faye notifies trading desk
  // Reset Faye's seen/opened so banner re-fires + dot reappears; actioned preserved (first dispatch).
  ticket.byPersona.ops.seen = false;
  ticket.byPersona.ops.opened = false;
  state.ismail.approvalGiven = true;
  state.ismail.approvalTimestamp = '02:58 SGT';
  fireWorkflowAgentArcApprove();
  appendIsmailApprovalCaptureFooter();
  paintIsmailCTAApproved();
  render();
}

function appendIsmailApprovalCaptureFooter() {
  const container = document.getElementById('incident-detail-view');
  if (!container) return;
  if (container.querySelector('.dispatch-capture-footer')) return;
  const footer = el('div', 'dispatch-capture-footer');
  footer.innerHTML = `
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt"><strong>Hyperspace OS</strong> · escalation approval sign-off recorded</span></div>
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt">Approval + transcript routed to <strong>A2A Coordination Agent</strong> for chain-of-custody</span></div>
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt"><strong>Knowledge-Graph</strong> · sign-off attached to incident · routed back to Site Operations Manager</span></div>`;
  container.appendChild(footer);
  const lbl = el('div', 'dispatched-to-label');
  lbl.innerHTML = `Routed back to <span class="dyn-name">Faye Sit</span> · ${state.ismail.approvalTimestamp || '02:58 SGT'}`;
  container.appendChild(lbl);
}

function fireWorkflowAgentArcApprove() {
  const agentId = 'workflow';
  setAgentActive(agentId, 'Approval Sign-off Capture', 3);
  fireAgentCardLifecycle(agentId, 3000);
  const lines = [
    { delay: 200, line: { ts: '02:58:05', source: 'workflow', text: 'Sign-off recorded · revised diagnosis confirmed · escalation approved', dataSource: 'Hyperspace OS', nodeChain: ['dr-ismail', 'pump-casing-crack-pattern'] } },
    { delay: 900, line: { ts: '02:58:06', source: 'workflow', text: 'Workflow trace · P3 Offsite → P1 Ops Tower · route-back for ops + commercial impact action', dataSource: 'Hyperspace OS', nodeChain: ['dr-ismail', 'r-kumar'] } },
    { delay: 900, line: { ts: '02:58:07', source: 'workflow', text: 'KG enriched · sign-off attached · routed back to Faye Sit · ops manager action queued', dataSource: 'Hyperspace OS', nodeChain: ['sop-bfp-vibration-investigation', 'r-kumar'] } },
  ];
  let t = 0;
  lines.forEach((entry, idx) => {
    t += entry.delay;
    scheduleArcStep(t, () => {
      window.LOG.appendLine(entry.line);
      advanceAgentStep(agentId, idx, entry.line);
    });
  });
  t += 400;
  scheduleArcStep(t, () => teardownAgentTree(agentId));
}

// ─────────────────────────────────────────────
// W5 — Faye Escalation Report (state-driven Screen D variant)
// Routed to when ticket.statePill ∈ {ROUTED_BACK_TO_OPS, ROUTED_TO_TRADING_DESK, HEDGED}.
// 5s loading theater → 4 sections: revised diagnosis · Lim workflow summary · source transcript link · recommendation + impact + Notify CTA.
// ─────────────────────────────────────────────

function renderOpsEscalationReport(root) {
  const content = el('div', 'tablet-content');
  content.id = 'incident-detail-view';

  // Header band — green gradient + back chevron + state pill
  const hdr = el('div', 'inc-header');
  hdr.innerHTML = `
    <span class="inc-back">
      <svg viewBox="0 0 8 13" fill="none">
        <path d="M7 1L1 6.5L7 12" stroke="rgba(255,255,255,0.85)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Back
    </span>
    <div class="inc-hdr-row">
      <div class="inc-hdr-left">
        <div class="inc-title">${INCIDENT.asset}</div>
        <div class="inc-id">${INCIDENT.id} · returned from Dr. A. Ismail</div>
        <div class="inc-ts">${INCIDENT.timestamp}</div>
      </div>
      <span class="sev-pill" data-severity="${INCIDENT.severity}">▲ Severity: ${INCIDENT.severity}</span>
    </div>`;
  content.appendChild(hdr);

  // W6 — only heading + loading initially. 4 sections + CTA spawn after reveal.
  const wrap = el('div', 'ops-escalation-report');
  wrap.innerHTML = `
    <div class="oer-card">
      <div class="oer-heading">Escalation report</div>

      <div class="reveal-pending oer-loading" data-stage="oer-summary">
        <span class="reveal-dots"><span></span><span></span><span></span></span>
        <span class="reveal-msg"><span class="reveal-agent">A2A Coordination Agent</span> · Loading escalation report for <span class="dyn-name">Faye Sit</span></span>
      </div>
    </div>`;
  content.appendChild(wrap);

  const backBtn = content.querySelector('.inc-back');
  if (backBtn) {
    backBtn.style.cursor = 'pointer';
    backBtn.addEventListener('click', backToMonitoring);
  }

  root.appendChild(content);

  const ticket = getCanonicalTicket();
  const pill = ticket.statePill;

  if (pill === 'ROUTED_TO_TRADING_DESK' || pill === 'HEDGED') {
    // Already actioned — paint completed state immediately + capture footer
    revealEscalationReportInstant();
    paintEscalationReportCTAActioned();
    setTimeout(appendNotifyTradingDeskCaptureFooter, 200);
    return;
  }

  // W7 — First open at REVISED_DIAGNOSIS_ROUTED or DIAGNOSIS_CONFIRMED_WO_SUBMITTED — run loading theater
  startEscalationReportReveal();
}

// W6 — spawn 4 sections + CTA on reveal (deferred from initial paint)
function spawnEscalationReportContent() {
  const card = document.querySelector('.ops-escalation-report .oer-card');
  if (!card) return;
  if (card.querySelector('.oer-content')) return;
  const contentHTML = `
    <div class="oer-content reveal-in">
      <div class="oer-section">
        <div class="oer-section-label">Correct diagnosis (revised)</div>
        <div class="oer-diagnosis"><span class="dyn-name">Crack in pump casing on BFP-3A</span></div>
        <div class="oer-diagnosis-detail">
          Confirmed via expert field-experience pattern + targeted inspection (60mm hairline discontinuity, 4-o'clock on volute, near discharge weld). Bearing damage secondary, caused by imbalanced loading under casing fatigue.
        </div>
      </div>

      <div class="oer-section">
        <div class="oer-section-label"><span class="dyn-name">Lim Wei Jie</span>'s completed workflow</div>
        <div class="oer-workflow-list">
          <div class="oer-wl-item">✓ 5/5 Safety checks</div>
          <div class="oer-wl-item">✓ 2/5 Root cause isolation checks · escalated to offsite expert</div>
          <div class="oer-wl-item">✓ Initial bearing-spalling hypothesis rejected</div>
          <div class="oer-wl-item">✓ Call with <span class="dyn-name">Dr. A. Ismail</span> · 7m 23s · transcript captured</div>
          <div class="oer-wl-item">✓ Transcript captured · <span class="dyn-name">Dr. A. Ismail</span> + <span class="dyn-name">Lim Wei Jie</span> discussed and agreed <button class="oer-tx-inline" type="button">(see transcript)</button></div>
        </div>
      </div>

      <div class="oer-section">
        <div class="oer-section-label">Source</div>
        <button class="oer-transcript-link" type="button">View call transcript + summary</button>
      </div>

      <div class="oer-section oer-section-action">
        <div class="oer-recommendation">
          <div class="oer-rec-label">Recommendation</div>
          <div class="oer-rec-body">Shut down BFP-3A immediately · isolate Block 2 feedwater</div>
        </div>
        <div class="oer-impact">
          <div class="oer-imp-label">Impact</div>
          <div class="oer-imp-body">50 MW Block 2 derate · PSO commitment window 09:00–18:00 SGT · 4h peak tariff exposure · ~SGD 2.4M revenue at risk · curtailment / hedge eligible</div>
        </div>
      </div>
      ${buildReassignSectionHTML()}
    </div>
    <button class="oer-cta" type="button" disabled>
      Notify trading desk · route to <span class="dyn-name-on-green">Priya Sundaram</span>
    </button>`;
  card.insertAdjacentHTML('beforeend', contentHTML);
}

// W19 — Reassign work order section: resend regenerated WO-2026-1190-R1 to a new technician for the casing-crack repair.
// After reassignment, a "Fast forward to task complete" button generates the RCA + service report (from both WOs).
function buildReassignSectionHTML() {
  const f = state.faye || {};
  let slotHtml;
  if (f.taskComplete) {
    slotHtml = `<div class="oer-reassign-done">✓ <strong>${WORK_ORDER_REVISED.id}</strong> reassigned to <span class="dyn-name">${f.woReassignedTo}</span> · repair complete</div>`;
  } else if (f.woReassignedTo) {
    slotHtml = `
      <div class="oer-reassign-done">✓ <strong>${WORK_ORDER_REVISED.id}</strong> reassigned to <span class="dyn-name">${f.woReassignedTo}</span> · dispatched for casing crack repair</div>
      <button class="oer-ff-btn" type="button">⏩ Fast forward to task complete</button>`;
  } else {
    slotHtml = `<button class="oer-reassign-btn" type="button">Reassign work order to a technician →</button>`;
  }
  const regenWoCard = buildWorkOrderCardHTML({
    id: WORK_ORDER_REVISED.id,
    title: 'Work order regenerated',
    regenerated: true,
    asset: INCIDENT.asset,
    diagnosisHeading: 'Revised diagnosis',
    diagnosisLabel: WORK_ORDER_REVISED.diagnosis,
    checklist: WORK_ORDER_REVISED.checklist,
  });
  const reassignSection = `
    <div class="oer-section oer-reassign-section">
      <div class="oer-section-label">Reassign work order</div>
      ${regenWoCard}
      <div class="oer-reassign-slot">${slotHtml}</div>
    </div>`;
  return reassignSection + (f.taskComplete ? buildTaskCompleteReportHTML() : '');
}

// W19 — Root cause analysis + service report generated on task completion · draws from BOTH work orders.
function buildTaskCompleteReportHTML() {
  const tech = (state.faye && state.faye.woReassignedTo) || 'assigned technician';
  return `
    <div class="oer-section oer-rca-section">
      <div class="oer-complete-banner">✓ Task complete · BFP-3A casing crack rectified · ready for review</div>

      <div class="oer-section-label">Root cause analysis</div>
      <div class="oer-rca-body">
        <div class="oer-rca-row"><span class="oer-rca-lbl">Root cause</span> Pump casing fatigue crack on BFP-3A — 60mm hairline at 4-o'clock volute, near discharge weld</div>
        <div class="oer-rca-row"><span class="oer-rca-lbl">Contributing</span> Imbalanced loading under casing fatigue → secondary NDE/DE bearing wear</div>
        <div class="oer-rca-row"><span class="oer-rca-lbl">Evidence</span> <strong>${WORK_ORDER.id}</strong> telemetry + bearing inspection · <strong>${WORK_ORDER_REVISED.id}</strong> casing NDT + dial-indicator runout · Dr. A. Ismail call + 3-incident fleet RCA pattern-match</div>
      </div>
      <button class="oer-report-link" data-report="rca" type="button">View RCA report (PDF)</button>

      <div class="oer-section-label" style="margin-top:12px;">Service report</div>
      <div class="oer-svc-body">
        <div class="oer-svc-wo"><span class="oer-svc-id">${WORK_ORDER.id}</span> Initial inspection · bearing-spalling hypothesis · Lim Wei Jie · deviation logged</div>
        <div class="oer-svc-wo"><span class="oer-svc-id">${WORK_ORDER_REVISED.id}</span> Casing crack repair · ${tech} · completed</div>
        <div class="oer-svc-meta">Personnel: Lim Wei Jie · Dr. A. Ismail · ${tech} · Downtime ~6h · Status: ready for review</div>
      </div>
      <button class="oer-report-link" data-report="service" type="button">View service report (PDF)</button>
    </div>`;
}

function wireReassignWOButton() {
  const btn = document.querySelector('.oer-reassign-btn');
  if (!btn || btn.dataset.wired === '1') return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', onReassignWOClick);
}

const REASSIGN_TECHNICIANS = [
  { name: 'S. Ibrahim',     pill: 'ON-CALL',   meta: 'Rotating-equipment repair · casing / weld specialist', recommended: true },
  { name: 'P. Subramaniam', pill: 'AVAILABLE', meta: 'Senior mechanical fitter · Block 2 · on-duty',          recommended: false },
];

function onReassignWOClick() {
  const slot = document.querySelector('.oer-reassign-slot');
  if (!slot) return;
  slot.innerHTML = `
    <div class="oer-reassign-theater">
      <span class="reveal-dots"><span></span><span></span><span></span></span>
      <span class="reveal-msg">
        <span class="reveal-agent">Work Order Pre-fill Agent</span> · finding available technicians for casing crack repair…
      </span>
    </div>`;
  if (window.LOG) {
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: 'wo-prefill',
      text: `${WORK_ORDER_REVISED.id} reassignment · Faye Sit · finding on-call technicians for casing crack repair`,
      dataSource: 'Hyperspace OS',
      nodeChain: ['sop-wo-creation', 'pump-casing-crack-pattern'],
    });
  }
  fireAgentCardLifecycle('wo-prefill', 2000);
  pushReveal(() => {
    const cards = REASSIGN_TECHNICIANS.map(t => `
      <div class="oer-tech-card" data-tech="${t.name}">
        <div class="oer-tech-pill">${t.pill}</div>
        <div class="oer-tech-name">${t.name}${t.recommended ? ` <span class="oer-tech-rec">Recommended</span>` : ''}</div>
        <div class="oer-tech-meta">${t.meta}</div>
        <div class="oer-tech-hint">Click to reassign</div>
      </div>`).join('');
    slot.innerHTML = `<div class="oer-tech-list">${cards}</div>`;
    wireReassignTechCards();
  }, 2000);
}

function wireReassignTechCards() {
  document.querySelectorAll('.oer-tech-card').forEach(card => {
    if (card.dataset.wired === '1') return;
    card.dataset.wired = '1';
    card.addEventListener('click', () => onReassignTechSelect(card.dataset.tech));
  });
}

function onReassignTechSelect(name) {
  if (!name || (state.faye && state.faye.woReassignedTo)) return;
  state.faye.woReassignedTo = name;
  const slot = document.querySelector('.oer-reassign-slot');
  if (slot) {
    slot.innerHTML = `
      <div class="oer-reassign-done">✓ <strong>${WORK_ORDER_REVISED.id}</strong> reassigned to <span class="dyn-name">${name}</span> · dispatched for casing crack repair</div>
      <button class="oer-ff-btn" type="button">⏩ Fast forward to task complete</button>`;
    wireFastForwardButton();
  }
  if (window.LOG) {
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: 'wo-prefill',
      text: `${WORK_ORDER_REVISED.id} reassigned · ${name} dispatched for casing crack repair · routed by Faye Sit`,
      dataSource: 'Hyperspace OS',
      nodeChain: ['sop-wo-creation', 'pump-casing-crack-pattern'],
    });
  }
  fireAgentCardLifecycle('wo-prefill', 1500);
}

// W19 — Fast forward to task complete → generate RCA + service report from both work orders.
function wireFastForwardButton() {
  const btn = document.querySelector('.oer-ff-btn');
  if (!btn || btn.dataset.wired === '1') return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', onFastForwardComplete);
}

function onFastForwardComplete() {
  if (state.faye.taskComplete) return;
  const slot = document.querySelector('.oer-reassign-slot');
  const ffBtn = document.querySelector('.oer-ff-btn');
  if (ffBtn) ffBtn.remove();
  if (slot) {
    slot.insertAdjacentHTML('beforeend', `
      <div class="oer-ff-theater">
        <span class="reveal-dots"><span></span><span></span><span></span></span>
        <span class="reveal-msg">
          <span class="reveal-agent">Learning Engine</span> · ${state.faye.woReassignedTo || 'Technician'} completing repair · generating root cause analysis + service report from ${WORK_ORDER.id} + ${WORK_ORDER_REVISED.id}
        </span>
      </div>`);
  }
  if (window.LOG) {
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: 'workflow',
      text: `Repair complete · BFP-3A casing crack rectified by ${state.faye.woReassignedTo || 'technician'} · ${WORK_ORDER_REVISED.id} closed`,
      dataSource: 'Hyperspace OS',
      nodeChain: ['pump-casing-crack-pattern', 'casing-bfp-3a'],
    });
    window.LOG.appendLine({
      ts: currentSGTLog(),
      source: 'workflow',
      text: `Learning Engine · RCA + service report generated from ${WORK_ORDER.id} + ${WORK_ORDER_REVISED.id} · ready for review`,
      dataSource: 'Hyperspace OS',
      nodeChain: ['casing-rca-jrg-2023', 'pump-casing-crack-pattern'],
    });
  }
  fireAgentCardLifecycle('workflow', 2500);
  pushReveal(() => {
    state.faye.taskComplete = true;
    document.querySelector('.oer-ff-theater')?.remove();
    if (slot) {
      slot.innerHTML = `<div class="oer-reassign-done">✓ <strong>${WORK_ORDER_REVISED.id}</strong> reassigned to <span class="dyn-name">${state.faye.woReassignedTo}</span> · repair complete</div>`;
    }
    const section = document.querySelector('.oer-reassign-section');
    if (section && !document.querySelector('.oer-rca-section')) {
      section.insertAdjacentHTML('afterend', buildTaskCompleteReportHTML());
    }
  }, 2500);
}

function revealEscalationReportInstant() {
  const loading = document.querySelector('.oer-loading');
  if (loading) loading.remove();
  spawnEscalationReportContent();
  wireTranscriptModalLinks();
  wireReassignWOButton();    // W19 — resend WO to a new technician
  wireFastForwardButton();   // W19 — fast-forward to task complete (RCA + service report)
}

function paintEscalationReportCTAActioned() {
  const cta = document.querySelector('.oer-cta');
  if (!cta) return;
  cta.disabled = true;
  cta.classList.add('oer-cta-actioned');
  cta.textContent = '✓ Trading desk notified · routed to Priya Sundaram';
}

function startEscalationReportReveal() {
  // W6 — fire Workflow Agent card synced with Escalation Report Loading
  fireAgentCardLifecycle('workflow', 5000);
  pushReveal(() => {
    revealEscalationReportInstant();
    const cta = document.querySelector('.oer-cta');
    if (cta) cta.disabled = false;
    wireNotifyTradingDeskCTA();
  }, 5000);
}

function wireNotifyTradingDeskCTA() {
  const cta = document.querySelector('.oer-cta');
  if (!cta || cta.dataset.wired === '1') return;
  cta.dataset.wired = '1';
  cta.addEventListener('click', onNotifyTradingDeskClick);
}

function onNotifyTradingDeskClick() {
  const cta = document.querySelector('.oer-cta');
  if (cta && cta.disabled) return;
  const ticket = getCanonicalTicket();
  // W7 — guard against re-fire from the two return states
  if (ticket.statePill !== 'REVISED_DIAGNOSIS_ROUTED' &&
      ticket.statePill !== 'DIAGNOSIS_CONFIRMED_WO_SUBMITTED') return;
  setStatePill('ROUTED_TO_TRADING_DESK');
  ticket.handoffPending.analyst = true;
  ticket.handoffPending.ops = false;
  state.priyaUnlocked = true;
  fireWorkflowAgentArcNotify();
  appendNotifyTradingDeskCaptureFooter();
  paintEscalationReportCTAActioned();
  render();
}

function appendNotifyTradingDeskCaptureFooter() {
  const container = document.getElementById('incident-detail-view');
  if (!container) return;
  if (container.querySelector('.dispatch-capture-footer')) return;
  const footer = el('div', 'dispatch-capture-footer');
  footer.innerHTML = `
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt"><strong>Hyperspace OS</strong> · ops escalation logged · trading desk notification queued</span></div>
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt">Escalation packet routed to <strong>A2A Coordination Agent</strong> for trading-desk chain</span></div>
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt"><strong>Knowledge-Graph</strong> · commercial-impact context attached · routed to Trader</span></div>`;
  container.appendChild(footer);
  const lbl = el('div', 'dispatched-to-label');
  lbl.innerHTML = `Routed to <span class="dyn-name">Priya Sundaram</span> · 02:59 SGT`;
  container.appendChild(lbl);
}

function fireWorkflowAgentArcNotify() {
  const agentId = 'workflow';
  setAgentActive(agentId, 'Trading Desk Notification', 3);
  fireAgentCardLifecycle(agentId, 3000);
  const lines = [
    { delay: 200, line: { ts: '02:59:02', source: 'workflow', text: 'Faye Sit · trading desk notification queued · commercial impact context attached', dataSource: 'Hyperspace OS', nodeChain: ['r-kumar', 'pred-mw-derate'] } },
    { delay: 900, line: { ts: '02:59:03', source: 'workflow', text: 'Handoff sequence recorded · P1 Ops Tower → P4 Asset Perf · trading desk action queued', dataSource: 'Hyperspace OS', nodeChain: ['r-kumar', 'p-sundaram'] } },
    { delay: 900, line: { ts: '02:59:04', source: 'workflow', text: 'KG enriched · ~SGD 2.4M revenue exposure attached · Trader desk routing complete', dataSource: 'Hyperspace OS', nodeChain: ['pred-mw-derate', 'p-sundaram'] } },
  ];
  let t = 0;
  lines.forEach((entry, idx) => {
    t += entry.delay;
    scheduleArcStep(t, () => {
      window.LOG.appendLine(entry.line);
      advanceAgentStep(agentId, idx, entry.line);
    });
  });
  t += 400;
  scheduleArcStep(t, () => teardownAgentTree(agentId));
}

// ─────────────────────────────────────────────
// W5 — Priya (Asset Perf Analyst / Trader) curated Screen D
// Market Intelligence Agent loading theater → operational context · 4 decision options · Lock decision CTA.
// ─────────────────────────────────────────────

function renderAnalystIncidentDetail(root) {
  const content = el('div', 'tablet-content');
  content.id = 'incident-detail-view';

  const hdr = el('div', 'inc-header');
  hdr.innerHTML = `
    <span class="inc-back">
      <svg viewBox="0 0 8 13" fill="none">
        <path d="M7 1L1 6.5L7 12" stroke="rgba(255,255,255,0.85)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Back
    </span>
    <div class="inc-hdr-row">
      <div class="inc-hdr-left">
        <div class="inc-title">${INCIDENT.asset}</div>
        <div class="inc-id">${INCIDENT.id} · routed from Faye Sit</div>
        <div class="inc-ts">${INCIDENT.timestamp}</div>
      </div>
      <span class="sev-pill" data-severity="${INCIDENT.severity}">▲ Severity: ${INCIDENT.severity}</span>
    </div>`;
  content.appendChild(hdr);

  // W6 — only heading + loading initially. Operational context + decision options + Lock CTA spawn at reveal.
  const wrap = el('div', 'analyst-screen-d');
  wrap.innerHTML = `
    <div class="analyst-card">
      <div class="ac-heading">Trading desk report</div>

      <div class="reveal-pending ac-loading" data-stage="analyst-summary">
        <span class="reveal-dots"><span></span><span></span><span></span></span>
        <span class="reveal-msg"><span class="reveal-agent">Market Intelligence Agent</span> · Loading market position + hedge eligibility for INC-2026-0537</span>
      </div>
    </div>`;
  content.appendChild(wrap);

  const backBtn = content.querySelector('.inc-back');
  if (backBtn) {
    backBtn.style.cursor = 'pointer';
    backBtn.addEventListener('click', backToMonitoring);
  }

  root.appendChild(content);

  if (state.priya.decisionLocked) {
    revealAnalystScreenInstant();
    restoreSelectedOptionUI();
    paintAnalystLockedCTA();
    setTimeout(appendLockDecisionCaptureFooter, 200);
    return;
  }

  if (state.priya.escalationSummaryRevealed) {
    revealAnalystScreenInstant();
    wireDecisionOptions();
    restoreSelectedOptionUI();
    wireLockDecisionCTA();
    if (state.priya.selectedOption) {
      const cta = document.querySelector('.ac-lock-cta');
      if (cta) cta.disabled = false;
    }
    return;
  }

  startAnalystScreenDReveal();
}

// W6 — spawn operational context + decision options + Lock CTA at reveal (deferred)
function spawnAnalystScreenContent() {
  const card = document.querySelector('.analyst-screen-d .analyst-card');
  if (!card) return;
  if (card.querySelector('.ac-content')) return;
  const contentHTML = `
    <div class="ac-content reveal-in">
      <div class="ac-section ac-section-context">
        <div class="ac-context-row ac-context-exposure">
          <div class="ac-ctx-label">EXPOSURE</div>
          <div class="ac-ctx-content">
            <div class="ac-ctx-primary">50 MW derate · SGD 2.4M revenue at risk</div>
            <div class="ac-ctx-secondary">4× 30-min settlement periods · HH18 (09:00 SGT) → HH21 (10:30 SGT) · PSO commitment window</div>
          </div>
        </div>
        <button class="ac-transcript-link" type="button">View source transcript</button>
      </div>

      <div class="ac-section">
        <div class="ac-section-label">Decision options · select one</div>
        <div class="ac-decision-list">
          <button class="ac-option-card" data-option="hedge" type="button">
            <div class="ac-opt-header">
              <span class="ac-opt-bullet">○</span>
              <div class="ac-opt-body">
                <span class="ac-opt-title">Hedge forward · 4×HH PSO window</span>
                <span class="ac-opt-detail">Lock SGD 120/MWh forward · 50 MW × 4 settlement periods</span>
              </div>
            </div>
            <div class="ac-opt-viz">
              <svg class="ac-opt-spark" viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 0 30 L 20 28 L 40 24 L 60 18 L 80 12 L 100 8 L 120 5 L 120 36 L 0 36 Z" fill="#00A651" opacity="0.15"/>
                <path d="M 0 30 L 20 28 L 40 24 L 60 18 L 80 12 L 100 8 L 120 5" stroke="#00A651" stroke-width="2" fill="none"/>
              </svg>
              <div class="ac-opt-stats">
                <div class="ac-opt-amt-chip ac-opt-amt-positive">+SGD 2.4M</div>
                <div class="ac-opt-delta-chip ac-opt-delta-positive">+5.7% toward May target</div>
              </div>
            </div>
          </button>
          <button class="ac-option-card" data-option="cross-site" type="button">
            <div class="ac-opt-header">
              <span class="ac-opt-bullet">○</span>
              <div class="ac-opt-body">
                <span class="ac-opt-title">Cross-site balance · Sakra-CCGT-1 standby</span>
                <span class="ac-opt-detail">Dispatch Sakra standby capacity · cover BFP-3A derate</span>
              </div>
            </div>
            <div class="ac-opt-viz">
              <svg class="ac-opt-spark" viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 0 32 L 30 32 L 30 16 L 70 16 L 70 8 L 120 8 L 120 36 L 0 36 Z" fill="#00A651" opacity="0.15"/>
                <path d="M 0 32 L 30 32 L 30 16 L 70 16 L 70 8 L 120 8" stroke="#00A651" stroke-width="2" fill="none"/>
              </svg>
              <div class="ac-opt-stats">
                <div class="ac-opt-amt-chip ac-opt-amt-positive">+SGD 1.98M</div>
                <div class="ac-opt-delta-chip ac-opt-delta-positive">+4.7% toward May target</div>
              </div>
            </div>
          </button>
          <button class="ac-option-card" data-option="spot" type="button">
            <div class="ac-opt-header">
              <span class="ac-opt-bullet">○</span>
              <div class="ac-opt-body">
                <span class="ac-opt-title">Sell-back to spot · USEP arbitrage</span>
                <span class="ac-opt-detail">Sell uncommitted MW into spot market · capture forecast +20% USEP spike</span>
              </div>
            </div>
            <div class="ac-opt-viz">
              <svg class="ac-opt-spark" viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 0 24 L 30 22 L 50 26 L 70 10 L 90 4 L 100 6 L 120 8 L 120 36 L 0 36 Z" fill="#00A651" opacity="0.15"/>
                <path d="M 0 24 L 30 22 L 50 26 L 70 10 L 90 4 L 100 6 L 120 8" stroke="#00A651" stroke-width="2" fill="none"/>
              </svg>
              <div class="ac-opt-stats">
                <div class="ac-opt-amt-chip ac-opt-amt-positive">+SGD 1.56M</div>
                <div class="ac-opt-delta-chip ac-opt-delta-positive">+3.7% toward May target</div>
              </div>
            </div>
          </button>
          <button class="ac-option-card" data-option="curtailment" type="button">
            <div class="ac-opt-header">
              <span class="ac-opt-bullet">○</span>
              <div class="ac-opt-body">
                <span class="ac-opt-title">Curtail · accept PSO penalty</span>
                <span class="ac-opt-detail">Accept 4×HH curtailment penalty · preserve BFP for full inspection</span>
              </div>
            </div>
            <div class="ac-opt-viz">
              <svg class="ac-opt-spark" viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 0 14 L 60 14 L 70 32 L 120 32 L 120 36 L 0 36 Z" fill="#DC2626" opacity="0.12"/>
                <path d="M 0 14 L 60 14 L 70 32 L 120 32" stroke="#DC2626" stroke-width="2" fill="none"/>
              </svg>
              <div class="ac-opt-stats">
                <div class="ac-opt-amt-chip ac-opt-amt-negative">-SGD 0.88M</div>
                <div class="ac-opt-delta-chip ac-opt-delta-negative">-2.1% toward May target</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
    <button class="ac-lock-cta" type="button" disabled>
      Lock decision · Hyperspace OS confirms revenue exposure neutralized
    </button>`;
  card.insertAdjacentHTML('beforeend', contentHTML);
}

function revealAnalystScreenInstant() {
  const loading = document.querySelector('.ac-loading');
  if (loading) loading.remove();
  spawnAnalystScreenContent();
  wireTranscriptModalLinks();
}

function startAnalystScreenDReveal() {
  state.priya.escalationRevealStarted = true;
  // W6 — fire Market Intelligence Agent card synced with Priya Loading
  fireAgentCardLifecycle('market-intelligence', 5000);
  pushReveal(() => {
    state.priya.escalationSummaryRevealed = true;
    revealAnalystScreenInstant();
    wireDecisionOptions();
    wireLockDecisionCTA();
  }, 5000);
}

function wireDecisionOptions() {
  document.querySelectorAll('.ac-option-card').forEach(card => {
    if (card.dataset.wired === '1') return;
    card.dataset.wired = '1';
    card.addEventListener('click', () => {
      if (state.priya.decisionLocked) return;
      document.querySelectorAll('.ac-option-card').forEach(c => {
        c.dataset.selected = 'false';
        const b = c.querySelector('.ac-opt-bullet');
        if (b) b.textContent = '○';
      });
      card.dataset.selected = 'true';
      const bullet = card.querySelector('.ac-opt-bullet');
      if (bullet) bullet.textContent = '✓';
      state.priya.selectedOption = card.dataset.option;
      const cta = document.querySelector('.ac-lock-cta');
      if (cta) cta.disabled = false;
    });
  });
}

function restoreSelectedOptionUI() {
  if (!state.priya.selectedOption) return;
  const card = document.querySelector(`.ac-option-card[data-option="${state.priya.selectedOption}"]`);
  if (!card) return;
  card.dataset.selected = 'true';
  const bullet = card.querySelector('.ac-opt-bullet');
  if (bullet) bullet.textContent = '✓';
}

function wireLockDecisionCTA() {
  const cta = document.querySelector('.ac-lock-cta');
  if (!cta || cta.dataset.wired === '1') return;
  cta.dataset.wired = '1';
  cta.addEventListener('click', onLockDecisionClick);
}

function onLockDecisionClick() {
  const cta = document.querySelector('.ac-lock-cta');
  if (!cta || cta.disabled) return;
  if (state.priya.decisionLocked) return;
  if (!state.priya.selectedOption) return;
  const ticket = getCanonicalTicket();
  ticket.byPersona.analyst.actioned = true;
  setStatePill('HEDGED');
  ticket.handoffPending.analyst = false;
  state.priya.decisionLocked = true;
  state.priya.decisionTimestamp = '03:01 SGT';
  state.priya.demoEndBannerShown = true;
  fireWorkflowAgentArcLock();
  appendLockDecisionCaptureFooter();
  paintAnalystLockedCTA();
  // Lock all option cards
  document.querySelectorAll('.ac-option-card').forEach(c => { c.style.pointerEvents = 'none'; });
  // W8 G.8 — for the laptop modal path, hold the locked CTA visible briefly before closing.
  if (state.activePersona === 'analyst') {
    setTimeout(() => {
      // statePill already HEDGED so syncLaptopModalState() will tear the modal down on render().
      render();
    }, 900);
  } else {
    render();
  }
}

function paintAnalystLockedCTA() {
  const cta = document.querySelector('.ac-lock-cta');
  if (!cta) return;
  cta.disabled = true;
  cta.classList.add('ac-lock-cta-actioned');
  const label = state.priya.selectedOption ? PRIYA_OPTION_LABEL[state.priya.selectedOption] : 'Decision';
  cta.innerHTML = `✓ Decision locked · ${label}`;
}

function appendLockDecisionCaptureFooter() {
  const container = document.getElementById('incident-detail-view');
  if (!container) return;
  if (container.querySelector('.dispatch-capture-footer')) return;
  const footer = el('div', 'dispatch-capture-footer');
  footer.innerHTML = `
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt"><strong>Hyperspace OS</strong> · trading decision locked · commercial close</span></div>
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt">Decision audit + lineage routed to <strong>A2A Coordination Agent</strong></span></div>
    <div class="dcf-line"><span class="dcf-ic">✓</span><span class="dcf-txt"><strong>Knowledge-Graph</strong> · trading outcome attached · cycle complete</span></div>`;
  container.appendChild(footer);
  const lbl = el('div', 'dispatched-to-label');
  const optionLabel = state.priya.selectedOption ? PRIYA_OPTION_LABEL[state.priya.selectedOption] : '—';
  lbl.innerHTML = `Decision locked · <span class="dyn-name">${optionLabel}</span> · ${state.priya.decisionTimestamp || '03:01 SGT'}`;
  container.appendChild(lbl);
}

function fireWorkflowAgentArcLock() {
  const agentId = 'workflow';
  setAgentActive(agentId, 'Trading Decision Capture', 3);
  fireAgentCardLifecycle(agentId, 3000);
  const optionLabel = state.priya.selectedOption ? PRIYA_OPTION_LABEL[state.priya.selectedOption] : '—';
  const lines = [
    { delay: 200, line: { ts: '03:01:11', source: 'workflow', text: `Priya Sundaram · trading decision locked · ${optionLabel}`, dataSource: 'Hyperspace OS', nodeChain: ['p-sundaram', 'pred-mw-derate'] } },
    { delay: 900, line: { ts: '03:01:12', source: 'workflow', text: 'Decision audit + market position lineage recorded · cycle close', dataSource: 'Hyperspace OS', nodeChain: ['p-sundaram'] } },
    { delay: 900, line: { ts: '03:01:13', source: 'workflow', text: 'KG · trading outcome attached to INC-2026-0537 · revenue exposure neutralized', dataSource: 'Hyperspace OS', nodeChain: ['pred-mw-derate', 'sop-bfp-vibration-investigation'] } },
  ];
  let t = 0;
  lines.forEach((entry, idx) => {
    t += entry.delay;
    scheduleArcStep(t, () => {
      window.LOG.appendLine(entry.line);
      advanceAgentStep(agentId, idx, entry.line);
    });
  });
  t += 400;
  scheduleArcStep(t, () => teardownAgentTree(agentId));
}

// ─────────────────────────────────────────────
// W4 — Transcript modal (multi-entry-point handlers)
// ─────────────────────────────────────────────

function openTranscriptModal() {
  const m = document.getElementById('transcript-modal');
  if (m) { m.dataset.open = 'true'; m.setAttribute('aria-hidden', 'false'); }
}
function closeTranscriptModal() {
  const m = document.getElementById('transcript-modal');
  if (m) { m.dataset.open = 'false'; m.setAttribute('aria-hidden', 'true'); }
}
function wireTranscriptModalLinks() {
  document.querySelectorAll('.post-call-transcript-link, .sr-hyp-transcript-link, .ismail-tx-link, .oer-transcript-link, .ac-transcript-link, .oer-tx-inline').forEach(btn => {
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', openTranscriptModal);
  });
}
function initTranscriptModal() {
  const modal = document.getElementById('transcript-modal');
  if (!modal || modal.dataset.wired === '1') return;
  modal.dataset.wired = '1';
  modal.addEventListener('click', e => {
    if (e.target.closest('.transcript-modal-close')) { closeTranscriptModal(); return; }
    if (e.target.classList.contains('transcript-modal-backdrop')) { closeTranscriptModal(); return; }
    // port (short-og-demo) — "Knowledge bytes captured" surfaces the 3D KG window on demand.
    if (e.target.closest('.transcript-modal-kg-btn')) { if (!state.graphWinOpen) toggleGraphWindow(); return; }
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (modal.dataset.open === 'true') closeTranscriptModal();
  });
}

// ── Monitoring dashboard (Screens A / B / C) — W2.6 ──
function currentSGTTime() {
  // Hardcoded for demo — 02:47 SGT matches INC-2026-0537 timestamp
  return '02:47 SGT';
}

function buildLandedIncidentRow() {
  let stateText, stateClass, dynamicTagText;
  switch (state.incidentPhase) {
    case 'DISPATCHED_TO_ONSITE':
      stateText = STATE_PILL_LABEL.DISPATCHED_TO_ONSITE;
      stateClass = 'dispatched';
      dynamicTagText = { label: 'dispatched to Lim Wei Jie ·', value: '02:47 SGT', from: null };
      break;
    case 'REVISED_DIAGNOSIS_ROUTED':
      stateText = STATE_PILL_LABEL.REVISED_DIAGNOSIS_ROUTED;
      stateClass = 'revised-diagnosis-routed';
      dynamicTagText = { label: 'returned by Lim Wei Jie ·', value: '02:58 SGT', from: null };
      break;
    case 'DIAGNOSIS_CONFIRMED_WO_SUBMITTED':
      stateText = STATE_PILL_LABEL.DIAGNOSIS_CONFIRMED_WO_SUBMITTED;
      stateClass = 'revised-diagnosis-routed';
      dynamicTagText = { label: 'WO submitted by Lim Wei Jie ·', value: '02:58 SGT', from: null };
      break;
    case 'ROUTED_TO_TRADING_DESK':
      stateText = STATE_PILL_LABEL.ROUTED_TO_TRADING_DESK;
      stateClass = 'routed-to-trading-desk';
      dynamicTagText = { label: 'routed to Priya Sundaram ·', value: '02:59 SGT', from: null };
      break;
    case 'HEDGED':
      stateText = STATE_PILL_LABEL.HEDGED;
      stateClass = 'hedged';
      dynamicTagText = { label: 'cycle closed ·', value: '03:01 SGT', from: null };
      break;
    case 'TRIAGE_READY':
    default:
      stateText = STATE_PILL_LABEL.TRIAGE_READY;
      stateClass = 'triage-ready';
      dynamicTagText = { label: 'onsite verification ·', value: 'pending', from: null };
      break;
  }
  const ticket = getCanonicalTicket();
  const pState = ticket.byPersona[state.activePersona] || { seen: false, opened: false, actioned: false };
  // W5 — unread red dot: tracks handoffPending (incoming unread); cleared on banner consume.
  const showUnreadDot = ticket.handoffPending[state.activePersona] === true || (pState.seen === true && pState.opened === false);
  const ownerInfo = ROW_OWNER_BY_PERSONA[state.activePersona] || ROW_OWNER_BY_PERSONA.ops;
  return {
    id: INCIDENT.id,
    asset: INCIDENT.asset,
    body: 'BFP-3A NDE bearing housing vibration RMS exceeds ISO 10816-7 Zone C threshold. Hyperspace OS hypothesis: NDE bearing race spalling (early-stage). Pending onsite verification.',
    severity: INCIDENT.severity,
    state: stateText,
    stateClass: stateClass,
    age: 'Just now',
    owner: ownerInfo.name,
    ownerInitials: ownerInfo.initials,
    clickable: true,
    highlighted: true,
    isUnread: showUnreadDot,
    dynamicTagText,
  };
}

function renderMonitoringView(root) {
  const content = el('div', 'tablet-content');

  // (A) Header band — Sembcorp-teal, click target. W3.9: clickable per active persona handoff
  const hdr = el('div', 'mon-header');
  const persona = PERSONA_INITIALS[state.activePersona] || PERSONA_INITIALS.ops;
  hdr.innerHTML = `
    <div class="mon-hdr-left">
      <div class="mon-hdr-brand">Hyperspace OS</div>
      ${persona.workspace ? `<div class="mon-hdr-workspace">${persona.workspace}</div>` : ''}
    </div>
    <div class="mon-hdr-right">
      <div class="mon-hdr-time">${currentSGTTime()}</div>
      <div class="mon-hdr-engineer">
        <span class="mon-hdr-engineer-pill" title="${persona.name}"><span class="mon-hdr-engineer-initials">${persona.initials}</span>My view</span>
        <span class="mon-hdr-engineer-all">Team view</span>
      </div>
    </div>
  `;
  const ticket = getCanonicalTicket();
  const hdrClickable = (state.screen === 'monitoring' || state.screen === 'monitoring-landed') &&
                       ticket && ticket.handoffPending[state.activePersona] === true;
  if (hdrClickable) {
    hdr.classList.add('mon-header-clickable');
    hdr.style.cursor = 'pointer';
    hdr.addEventListener('click', onHeaderClick);
  }
  content.appendChild(hdr);

  // (B) Stat row — 3-up · W5: row gate seen OR opened OR actioned (banner consumes flip seen=true)
  const personaTasks = buildPersonaOwnTasks(state.activePersona);
  const ticketForCounts = getCanonicalTicket();
  const pStateGate = ticketForCounts && ticketForCounts.byPersona[state.activePersona];
  const incShown = !!(pStateGate && (pStateGate.seen || pStateGate.opened || pStateGate.actioned));
  const activeCount     = personaTasks.length + (incShown ? 1 : 0);
  const monitoringCount = 2;
  const archivedCount   = 12;
  const stats = el('div', 'mon-stat-row');
  stats.innerHTML = `
    <div class="mon-stat">
      <div class="mon-stat-val mon-stat-val-active">${activeCount}</div>
      <div class="mon-stat-lbl">Active Tasks</div>
    </div>
    <div class="mon-stat">
      <div class="mon-stat-val mon-stat-val-monitor">${monitoringCount}</div>
      <div class="mon-stat-lbl">Monitoring</div>
    </div>
    <div class="mon-stat">
      <div class="mon-stat-val mon-stat-val-arch">${archivedCount}</div>
      <div class="mon-stat-lbl">Archived</div>
    </div>
  `;
  content.appendChild(stats);

  // (C) Incidents list — W3.6: My Priorities · My tasks for today · n
  const list = el('div', 'mon-incidents');
  const listHdr = el('div', 'mon-incidents-hdr');
  listHdr.innerHTML = `
    <div class="mon-list-title">My Priorities</div>
    <div class="mon-list-sub">My tasks for today · ${activeCount}</div>
  `;
  list.appendChild(listHdr);

  // W5 — Ismail post-approval banner (only on offsite monitoring after approve fired)
  if (state.activePersona === 'offsite' && state.ismail && state.ismail.approvalGiven) {
    const wpab = el('div', 'ismail-post-approval-banner');
    wpab.innerHTML = `
      <span class="wpab-ic">✓</span>
      <span class="wpab-txt">
        Approval given · returned to <span class="dyn-name">Faye Sit</span> · <span class="wpab-ts">${state.ismail.approvalTimestamp || '02:58 SGT'}</span>
      </span>`;
    list.appendChild(wpab);
  }

  // W5 — Priya demo-end banner (only on analyst monitoring after decision locked)
  if (state.activePersona === 'analyst' && state.priya && state.priya.demoEndBannerShown) {
    const deb = el('div', 'demo-end-banner');
    const optionLabel = state.priya.selectedOption ? PRIYA_OPTION_LABEL[state.priya.selectedOption] : '—';
    deb.innerHTML = `
      <span class="deb-ic">✓</span>
      <span class="deb-txt">
        Cycle complete · <span class="dyn-name">${optionLabel}</span> locked · revenue exposure neutralized · INC-2026-0537 closed · <span class="deb-ts">${state.priya.decisionTimestamp || '03:01 SGT'}</span>
      </span>`;
    list.appendChild(deb);
  }

  // W3.10 — canonical incident only renders if active persona has seen banner.
  // Prepends to persona's own-task list.
  const orderedRows = incShown
    ? [buildLandedIncidentRow(), ...personaTasks]
    : [...personaTasks];

  orderedRows.forEach(row => {
    const card = el('div', 'mon-incident-card');
    if (row.highlighted) card.classList.add('mon-incident-card-highlighted');
    if (row.clickable) {
      card.classList.add('mon-incident-card-clickable');
      card.addEventListener('click', openIncidentDetail);
    }
    const sevPrefix = (row.severity === 'AMBER' || row.severity === 'RED') ? '▲ ' : '';
    const stateClass = row.stateClass || row.state.toLowerCase();
    // W3.6 — inline dynamic content next to state pill
    const dyn = row.dynamicTagText;
    const dynInline = dyn
      ? `<span class="mon-pill-dyn"> · ${dyn.label} <span class="mon-pill-dyn-val">${dyn.value}</span>${dyn.from ? ` from <span class="mon-pill-dyn-from">${dyn.from}</span>` : ''}</span>`
      : '';
    const unreadDot = row.isUnread ? '<span class="mon-unread-dot" aria-label="unread"></span>' : '';
    card.innerHTML = `
      ${unreadDot}
      <div class="mon-card-row mon-card-row-top">
        <span class="mon-card-id">${row.id}</span>
        <div class="mon-card-pills">
          <span class="mon-pill mon-pill-sev mon-pill-sev-${row.severity.toLowerCase()}">${sevPrefix}${row.severity}</span>
          <span class="mon-pill mon-pill-state mon-pill-state-${stateClass}">${row.state}${dynInline}</span>
        </div>
      </div>
      <div class="mon-card-asset">${row.asset}</div>
      <div class="mon-card-body">${row.body}</div>
      <div class="mon-card-row mon-card-row-btm">
        <span class="mon-card-owner"><span class="mon-card-owner-initials">${row.ownerInitials}</span>${row.owner}</span>
        <span class="mon-card-age">${row.age}</span>
      </div>
    `;
    list.appendChild(card);
  });
  content.appendChild(list);

  // (D) Notification banner — rendered when state.bannerVisible. W3.9: copy varies per state.bannerKey
  if (state.bannerVisible) {
    const banner = el('div', 'mon-banner');
    const copy = BANNER_COPY[state.bannerKey] || BANNER_COPY.ops;
    banner.innerHTML = `
      <div class="mon-banner-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"/>
          <polyline points="12,7 12,12 15,15"/>
        </svg>
      </div>
      <div class="mon-banner-body">
        <div class="mon-banner-lbl">${copy.label}</div>
        <div class="mon-banner-title">${copy.body}</div>
      </div>
      <div class="mon-banner-time">now</div>
    `;
    banner.addEventListener('click', skipBanner);
    content.appendChild(banner);
  }

  root.appendChild(content);
}

// ── W3.9 / W5 — Header click: per-persona banner + arc clone, consumes handoffPending ──
function onHeaderClick() {
  const personaKey = state.activePersona;
  const ticket = getCanonicalTicket();
  if (!ticket.handoffPending[personaKey]) return;

  ticket.handoffPending[personaKey] = false;
  ticket.byPersona[personaKey].seen = true;

  state.bannerVisible = true;
  // W7 — pick return-banner copy when Faye re-receives via Lim (revised or confirmed paths)
  if (personaKey === 'ops' && ticket.statePill === 'REVISED_DIAGNOSIS_ROUTED') {
    state.bannerKey = 'opsRouteBack';
  } else if (personaKey === 'ops' && ticket.statePill === 'DIAGNOSIS_CONFIRMED_WO_SUBMITTED') {
    state.bannerKey = 'opsConfirmedReturn';
  } else {
    state.bannerKey = personaKey;
  }

  if (personaKey === 'ops' && !state.incidentLanded) {
    // P1's first header click — original W3.7 path: 3s notify → land row
    state.history.push('monitoring');
    state.screen = 'monitoring-notify';
    render();
    state.notifyTimer = setTimeout(fadeBannerThenLand, 3000);
  } else {
    // Handoff click — banner only, no screen-state change (row already landed)
    render();
    state.notifyTimer = setTimeout(fadeBannerOnly, 3000);
  }

  fireArc(personaKey);
}

function fadeBannerThenLand() {
  const banner = document.querySelector('.mon-banner');
  if (banner) banner.classList.add('mon-banner-out');
  setTimeout(() => {
    state.bannerVisible = false;
    state.screen = 'monitoring-landed';
    state.incidentLanded = true;
    state.notifyTimer = null;
    render();
  }, 500);
}

function fadeBannerOnly() {
  const banner = document.querySelector('.mon-banner');
  if (banner) banner.classList.add('mon-banner-out');
  setTimeout(() => {
    state.bannerVisible = false;
    state.notifyTimer = null;
    render();
  }, 500);
}

function skipBanner() {
  if (state.notifyTimer) {
    clearTimeout(state.notifyTimer);
    state.notifyTimer = null;
  }
  if (state.activePersona === 'ops' && !state.incidentLanded) {
    fadeBannerThenLand();
  } else {
    fadeBannerOnly();
  }
}

function openIncidentDetail() {
  const personaKey = state.activePersona;
  const ticket = getCanonicalTicket();
  const personaState = ticket.byPersona[personaKey];
  cancelInProgressReveal();
  // Race fix — cancel any pending banner-land timer so it can't fire later and
  // bounce us back to monitoring while we're in the incident detail view.
  if (state.notifyTimer) { clearTimeout(state.notifyTimer); state.notifyTimer = null; }
  state.bannerVisible = false;
  state.incidentLanded = true;
  // Push the stable landed screen (not the transient notify screen) so Back returns cleanly.
  state.history.push(state.screen === 'monitoring-notify' ? 'monitoring-landed' : state.screen);
  state.screen = 'incident-detail';
  // W3.9 — first-open per persona: reset action steps so reveal re-fires per persona
  if (!personaState.opened && !personaState.actioned) {
    state.actionSteps = {
      step1: { status: 'idle' },
      step2: { status: 'locked', selectedEngineer: null },
      ctaEnabled: false,
    };
  }
  personaState.opened = true;
  render();
}

function backToMonitoring() {
  if (state.history.length === 0) return;
  state.screen = state.history.pop();
  render();
}

// ── Tablet root renderer ──
// W8 Section 0 Part 3 — wipe-guard via tabletCacheKey().
// Skip innerHTML wipe + repaint when no state in the cache key has changed.
// Preserves in-flight reveal-slide animations + imperative DOM mutations done
// outside render() (checklist progression, banner fades, capture footers).
function tabletCacheKey() {
  const ticket = getCanonicalTicket();
  const p = state.activePersona;
  const bp = ticket && ticket.byPersona && ticket.byPersona[p];
  const hp = ticket && ticket.handoffPending;
  return [
    p,
    state.part3 ? 1 : 0,
    state.screen,
    state.bannerVisible ? 1 : 0,
    state.bannerKey || '',
    state.incidentLanded ? 1 : 0,
    state.priyaUnlocked ? 1 : 0,
    ticket ? ticket.statePill : '',
    hp ? `${hp.ops?1:0}${hp.onsite?1:0}${hp.analyst?1:0}${hp.offsite?1:0}` : '',
    bp ? `${bp.seen?1:0}${bp.opened?1:0}${bp.actioned?1:0}` : '',
  ].join('|');
}

function renderTablet() {
  const root = document.getElementById('tablet-root');
  if (!root) return;
  // port (short-og-demo) — persona hook for per-persona color scheme (onsite = blue).
  root.dataset.persona = state.activePersona;
  const key = tabletCacheKey();
  if (root.dataset.cacheKey === key && root.innerHTML !== '') {
    // No state change relevant to tablet structure — skip wipe.
    return;
  }
  root.innerHTML = '';
  switch (state.screen) {
    case 'monitoring':
    case 'monitoring-notify':
    case 'monitoring-landed':
      renderMonitoringView(root);
      break;
    case 'incident-detail':
      // W5 — Screen D dispatched per persona, including Priya
      renderIncidentDetailView(root);
      break;
  }
  root.dataset.cacheKey = key;
}

// ── render() = pure paint ──
// W8 G — left pane swaps tablet ↔ laptop frame depending on active persona.
function render() {
  renderPersonasPanel();
  renderLeftPane();
  renderRightPane();
}

function renderLeftPane() {
  const tablet = document.getElementById('tablet');
  const laptop = document.getElementById('laptop-frame');
  if (state.activePersona === 'analyst') {
    if (tablet) tablet.style.display = 'none';
    if (laptop) laptop.style.display = '';
    renderLaptopContent();
  } else {
    if (laptop) laptop.style.display = 'none';
    if (tablet) tablet.style.display = '';
    // Tear down any open trader modal on persona switch away.
    const modal = document.getElementById('trader-modal-backdrop');
    if (modal) modal.remove();
    renderTablet();
  }
}

// ─────────────────────────────────────────────
// W8 G — Priya laptop view (MacBook chrome + trading dashboard + 60% modal)
// ─────────────────────────────────────────────

function renderLaptopContent() {
  const content = document.getElementById('laptop-content');
  if (!content) return;
  if (!content.dataset.built) {
    paintLaptopDashboard(content);
    content.dataset.built = '1';
  }
  updateLaptopActiveTasks();
  updateLaptopDemoEndBanner();
  syncLaptopModalState();
}

function paintLaptopDashboard(content) {
  content.innerHTML = `
    <div class="trader-dash">
      <div class="td-topbar">
        <div class="td-brand">
          <img class="td-brand-logo" src="vendor/sembcorp-logo.png" alt="Sembcorp"/>
          <div class="td-brand-text-block">
            <span class="td-brand-text">Sembcorp</span>
            <span class="td-brand-text-sub">Energy Trading · Singapore</span>
          </div>
        </div>
        <div class="td-persona">
          <span class="td-persona-name">Priya Sundaram</span>
          <span class="td-persona-role">Senior Power Trader · Singapore</span>
        </div>
      </div>

      <div class="td-kpi-strip">
        <div class="td-kpi-card td-kpi-headline">
          <div class="td-kpi-label">
            <svg class="td-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3 2"/>
            </svg>
            <span>Next settlement period · HH18 · 09:00–09:30 SGT</span>
          </div>
          <div class="td-kpi-rows">
            <div class="td-kpi-row">
              <span class="td-kpi-row-label">PSO commitment</span>
              <span class="td-kpi-row-value">50 MW @ SGD 120/MWh</span>
            </div>
            <div class="td-kpi-row">
              <span class="td-kpi-row-label">Settlement value</span>
              <span class="td-kpi-row-value">SGD 6,000</span>
            </div>
            <div class="td-kpi-row">
              <span class="td-kpi-row-label">At risk if no action</span>
              <span class="td-kpi-row-value td-kpi-amber">SGD 6,000 · 4 periods (HH18–HH21)</span>
            </div>
          </div>
          <div class="td-kpi-status">
            <span class="td-kpi-status-pill td-kpi-status-at-risk">AT RISK · awaiting decision</span>
          </div>
        </div>

        <div class="td-kpi-card td-kpi-secondary">
          <div class="td-kpi-label">
            <svg class="td-kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/>
              <circle cx="12" cy="12" r="5"/>
              <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            </svg>
            <span>May 2026 target · revenue at risk hedged</span>
          </div>
          <div class="td-kpi-target-bar">
            <div class="td-kpi-target-fill" style="width: 74%"></div>
          </div>
          <div class="td-kpi-target-stats">
            <span class="td-kpi-target-mtd"><strong>SGD 30.1M</strong> MTD <span class="td-kpi-target-pct">(74%)</span></span>
            <span class="td-kpi-target-goal">Target SGD 40.2M</span>
          </div>
          <div class="td-kpi-target-delta">
            INC-2026-0537 unlock: <strong class="td-kpi-target-delta-amt">+SGD 2.4M</strong> · <span class="td-kpi-target-delta-pct">+5.7% toward target</span>
          </div>
        </div>
      </div>

      <div class="td-body-grid">
        <div class="td-body-left">
          <div class="td-zone">
            <div class="td-zone-header">
              <span class="td-zone-num">1</span>
              <span class="td-zone-title">Portfolio Overview · Singapore Market</span>
            </div>
            <div class="td-portfolio">
              <div class="td-pf-card"><div class="td-pf-label">Jurong Island CCGT</div><div class="td-pf-value">1,600 MW</div><span class="td-pf-status online">ONLINE</span></div>
              <div class="td-pf-card"><div class="td-pf-label">Tuas Cogen Plant</div><div class="td-pf-value">860 MW</div><span class="td-pf-status online">ONLINE</span></div>
              <div class="td-pf-card"><div class="td-pf-label">Senoko Power Station</div><div class="td-pf-value">560 MW</div><span class="td-pf-status online">ONLINE</span></div>
              <div class="td-pf-card"><div class="td-pf-label">Solar Portfolio (SG)</div><div class="td-pf-value">200 MWp</div><span class="td-pf-status forecast">FORECAST</span></div>
              <div class="td-pf-card"><div class="td-pf-label">Battery Storage (SG)</div><div class="td-pf-value">100 MW / 200 MWh</div><span class="td-pf-status standby">STANDBY</span></div>
            </div>
          </div>

      <div class="td-zone">
        <div class="td-zone-header"><span class="td-zone-num">2</span><span class="td-zone-title">Market Snapshot</span></div>
        <div class="td-market">
          <div class="td-market-card">
            <div class="td-mk-label">Market Regime</div>
            <div class="td-mk-value normal">▶ NORMAL</div>
            <div class="td-mk-trend">Stable conditions · Adequate supply</div>
          </div>
        </div>
      </div>

      <div class="td-zone td-zone-trend">
        <div class="td-zone-header">
          <span class="td-zone-num">3</span>
          <span class="td-zone-title">USEP Forward Curve · Q3-2026</span>
        </div>
        <div class="td-zone-trend-body">
          <svg class="td-usep-trend" viewBox="0 0 320 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="td-usep-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#00A651" stop-opacity="0.5"/>
                <stop offset="100%" stop-color="#00A651" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <path d="M0 80 L40 75 L80 65 L120 68 L160 55 L200 50 L240 45 L280 38 L320 42 L320 100 L0 100 Z"
                  fill="url(#td-usep-grad)"/>
            <path d="M0 80 L40 75 L80 65 L120 68 L160 55 L200 50 L240 45 L280 38 L320 42"
                  stroke="#00A651" stroke-width="2" fill="none"/>
            <line x1="0" y1="100" x2="320" y2="100" stroke="#E5E7EB"/>
          </svg>
          <div class="td-position-summary">
            <div class="td-ps-row"><span>Long position</span><strong>+150 MW</strong></div>
            <div class="td-ps-row"><span>Hedged</span><strong>120 MW (80%)</strong></div>
            <div class="td-ps-row"><span>Exposure</span><strong>30 MW</strong></div>
          </div>
        </div>
      </div>

        </div>
        <div class="td-body-right">
          <div class="td-zone td-zone-tasks">
            <div class="td-zone-header">
              <span class="td-zone-num">★</span>
              <span class="td-zone-title">Active Tasks</span>
            </div>
            <div class="td-tasks" id="td-tasks-list"></div>
          </div>

          <div class="td-zone td-zone-margin-gauge">
            <div class="td-zone-header">
              <span class="td-zone-num">◐</span>
              <span class="td-zone-title">Reserve Margin · Singapore</span>
            </div>
            <div class="td-zone-margin-body">
              <svg class="td-margin-donut" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="60" cy="60" r="50" stroke="#E5E7EB" stroke-width="12" fill="none"/>
                <circle cx="60" cy="60" r="50" stroke="#00A651" stroke-width="12" fill="none"
                        stroke-dasharray="88 314" stroke-linecap="round"
                        transform="rotate(-90 60 60)"/>
                <text x="60" y="64" text-anchor="middle" font-size="22" font-weight="800" fill="#0F1B3D">28%</text>
                <text x="60" y="80" text-anchor="middle" font-size="9" font-weight="600" fill="#64748B" letter-spacing="0.5">COMFORTABLE</text>
              </svg>
              <div class="td-margin-forecast">Forecast 22–30% · Next 6h</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// W11 Section H — render Active Tasks list with URGENT tile gated by state.
const PRIYA_LOCKED_OPTION_TILE = {
  hedge:        { what: 'Hedge locked · Forward Q3 capacity hedge',     why: 'Revenue exposure neutralized via Q3 forward hedge instrument.' },
  'cross-site': { what: 'Hedge locked · Cross-site Sakra balancing',    why: 'Sakra-CCGT-1 standby capacity nominated for HH18–HH21 cover.' },
  spot:         { what: 'Hedge locked · Spot market purchase',          why: 'Spot purchase covers PSO commitment shortfall.' },
  curtailment:  { what: 'Curtailment notice locked · PSO',              why: 'PSO commitment curtailed under force-majeure clause.' },
};

function updateLaptopActiveTasks() {
  const list = document.getElementById('td-tasks-list');
  if (!list) return;
  const ticket = getCanonicalTicket();
  const pill = ticket && ticket.statePill;
  const isRouted = (pill === 'ROUTED_TO_TRADING_DESK');
  const locked = state.priya.decisionLocked;

  const baselineTiles = `
    <div class="td-task-tile" data-tile="trd-0218">
      <div class="td-task-what">Cover Sakra-CCGT-1 standby balancing position</div>
      <div class="td-task-why">Cross-site availability window · 14:00–22:00 SGT</div>
      <div class="td-task-meta">
        <span class="td-task-money">~SGD 0.85M spread potential</span>
        <span class="td-task-timer">⏱ 45 min</span>
      </div>
    </div>
    <div class="td-task-tile" data-tile="trd-0224">
      <div class="td-task-what">USEP forward curve · Q3 hedge eligibility review</div>
      <div class="td-task-why">Position review before settlement window close</div>
      <div class="td-task-meta">
        <span class="td-task-money">~SGD 1.2M hedge exposure</span>
        <span class="td-task-timer">⏱ 2h</span>
      </div>
    </div>
    <div class="td-task-tile" data-tile="trd-0231">
      <div class="td-task-what">PSO dispatch reconciliation · variance check</div>
      <div class="td-task-why">Yesterday's actual vs scheduled · settle by EOD</div>
      <div class="td-task-meta">
        <span class="td-task-money">~SGD 0.4M variance impact</span>
        <span class="td-task-timer">⏱ 4h</span>
      </div>
    </div>`;

  let topTile = '';
  if (locked) {
    const opt = PRIYA_LOCKED_OPTION_TILE[state.priya.selectedOption] || { what: 'Hedge locked', why: 'Revenue exposure neutralized.' };
    topTile = `
      <div class="td-task-tile td-task-completed" data-tile="inc-completed">
        <div class="td-task-completed-badge">✓ Locked</div>
        <div class="td-task-what">${opt.what}</div>
        <div class="td-task-why">${opt.why}</div>
      </div>`;
  } else if (isRouted) {
    topTile = `
      <div class="td-task-tile td-task-urgent" data-tile="inc">
        <div class="td-task-urgent-badge">URGENT</div>
        <div class="td-task-what">Buy USEP forward · Jul-26 · 50 MW · Q3 peak window</div>
        <div class="td-task-why">JRG-CCGT-1 BFP-3A unplanned shutdown · 4hrs · ~200 MWh at risk · PSO 09:00–18:00 SGT</div>
        <div class="td-task-meta">
          <span class="td-task-money">~SGD 2.4M at risk</span>
          <span class="td-task-timer">⏱ 28 min</span>
        </div>
        <button class="td-task-action" type="button">Open</button>
      </div>`;
  }

  list.innerHTML = topTile + baselineTiles;
  wireUrgentTaskTile();
}

function wireUrgentTaskTile() {
  const btn = document.querySelector('.td-task-tile[data-tile="inc"] .td-task-action');
  if (!btn || btn.dataset.wired === '1') return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', () => {
    if (state.priya.decisionLocked) return;
    if (state.screen !== 'incident-detail') {
      state.history.push(state.screen);
      state.screen = 'incident-detail';
    }
    render();
  });
}

const PRIYA_LAPTOP_OPTION_LABEL = {
  hedge:       'Forward Q3 capacity hedge',
  'cross-site':'Cross-site balance',
  spot:        'Spot market purchase',
  curtailment: 'PSO curtailment notice',
};

function updateLaptopDemoEndBanner() {
  const dash = document.querySelector('.trader-dash');
  if (!dash) return;
  const existing = dash.querySelector('.td-demo-end-banner');
  if (state.priya.decisionLocked) {
    if (existing) return;
    const opt = state.priya.selectedOption;
    const optLabel = PRIYA_LAPTOP_OPTION_LABEL[opt] || 'Decision';
    const banner = el('div', 'td-demo-end-banner');
    banner.innerHTML = `
      <span>✓</span>
      <span>Cycle complete · <strong>${optLabel}</strong> locked · revenue exposure neutralized · INC-2026-0537 closed · ${state.priya.decisionTimestamp || '03:01 SGT'}</span>`;
    const topbar = dash.querySelector('.td-topbar');
    if (topbar && topbar.nextSibling) {
      dash.insertBefore(banner, topbar.nextSibling);
    } else {
      dash.appendChild(banner);
    }
  } else if (existing) {
    existing.remove();
  }
}

function syncLaptopModalState() {
  const shouldOpen = state.activePersona === 'analyst'
                  && state.screen === 'incident-detail'
                  && !state.priya.decisionLocked;
  const existing = document.getElementById('trader-modal-backdrop');
  if (shouldOpen && !existing) {
    openTraderModal();
  } else if (!shouldOpen && existing) {
    existing.remove();
  }
}

function openTraderModal() {
  if (document.getElementById('trader-modal-backdrop')) return;
  const backdrop = el('div', 'trader-modal-backdrop');
  backdrop.id = 'trader-modal-backdrop';
  backdrop.innerHTML = `
    <div class="trader-modal" role="dialog" aria-modal="true">
      <div class="trader-modal-header">
        <div class="tm-heading">INC-2026-0537 · Trading Desk Action Required</div>
        <button class="tm-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="trader-modal-body" id="trader-modal-body"></div>
    </div>`;
  backdrop.querySelector('.tm-close').addEventListener('click', closeTraderModal);
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeTraderModal();
  });
  document.body.appendChild(backdrop);

  const body = backdrop.querySelector('#trader-modal-body');
  paintAnalystContentIntoModal(body);
}

function paintAnalystContentIntoModal(container) {
  const wrap = el('div', 'analyst-screen-d');
  wrap.id = 'incident-detail-view';  // re-use ID so existing helpers find this container
  wrap.innerHTML = `
    <div class="analyst-card">
      <div class="reveal-pending ac-loading" data-stage="analyst-summary">
        <span class="reveal-dots"><span></span><span></span><span></span></span>
        <span class="reveal-msg"><span class="reveal-agent">Market Intelligence Agent</span> · Loading market position + hedge eligibility for INC-2026-0537</span>
      </div>
    </div>`;
  container.appendChild(wrap);

  if (state.priya.escalationSummaryRevealed) {
    revealAnalystScreenInstant();
    wireDecisionOptions();
    restoreSelectedOptionUI();
    wireLockDecisionCTA();
    if (state.priya.selectedOption) {
      const cta = document.querySelector('.ac-lock-cta');
      if (cta) cta.disabled = false;
    }
  } else if (!state.priya.escalationRevealStarted) {
    startAnalystScreenDReveal();
  } else {
    // Reveal already in flight from earlier modal open — just rewire when content arrives.
    // The pushReveal timer will paint into the new modal via revealAnalystScreenInstant on completion.
  }
}

function closeTraderModal() {
  const existing = document.getElementById('trader-modal-backdrop');
  if (existing) existing.remove();
  if (state.activePersona === 'analyst' && state.screen === 'incident-detail' && !state.priya.decisionLocked) {
    state.screen = state.history.length ? state.history.pop() : 'monitoring';
    render();
  }
}

// ── W10 — Right pane: all personas route through standard pane.
// W7 P2 inline KG mechanic REVERTED — KG lives permanently in floating window.
// paintRightPaneInlineKG retained as dead code per WA #5 (throwaway).
function renderRightPane() {
  const rightPane = document.getElementById('right-pane');
  if (!rightPane) return;
  paintRightPaneStandard();
  paintPersonaNarrative();
}

// W10 Section B — per-persona narrative dispatch
function paintPersonaNarrative() {
  const host = document.getElementById('persona-narrative-host');
  if (!host) return;
  const personaKey = state.activePersona;
  // Clear host if active persona changed since last paint
  if (host.dataset.personaBuilt && host.dataset.personaBuilt !== personaKey) {
    host.innerHTML = '';
    delete host.dataset.personaBuilt;
  }
  if (personaKey === 'ops')          renderRightPaneFaye();
  else if (personaKey === 'onsite')  renderRightPaneLim();
  else if (personaKey === 'analyst') renderRightPanePriya();
}

// ═══════════════════════════════════════════════════════════════
// W10 Section J — P3 Priya right-pane narrative (single Commercial card)
// ═══════════════════════════════════════════════════════════════

function renderRightPanePriya() {
  const host = document.getElementById('persona-narrative-host');
  if (!host) return;
  if (host.dataset.personaBuilt === 'analyst') return;
  host.innerHTML = '';
  host.dataset.personaBuilt = 'analyst';

  const wrap = document.createElement('div');
  wrap.className = 'persona-narrative';
  wrap.dataset.persona = 'analyst';

  wrap.innerHTML = `
    <div class="pn-header">
      <div class="pn-h-title">Knowledge Graph · beyond single site</div>
      <div class="pn-h-sub">For the trader, the KG extends into merchant markets, contracts, and cross-site availability.</div>
    </div>
    <div class="pn-section" data-section="P3-KG">
      <div class="pn-s-num">★</div>
      <div class="pn-s-body">
        <div class="pn-s-title">Commercial intelligence cluster</div>
        <div class="pn-s-sub">23 new nodes across Markets · Contracts · Cross-site Network layers: merchant prices · power purchase agreements · supply/demand curves · cross-site availability.</div>
      </div>
      <button class="pn-s-play" type="button" data-section="P3-KG" data-action="open-kg">
        <svg class="pn-s-play-icon" viewBox="0 0 12 12"><path d="M2 1 L10 6 L2 11 Z" fill="currentColor"/></svg>
        <span>Open KG</span>
      </button>
    </div>
  `;
  host.appendChild(wrap);
  wirePriyaRightPaneButtons();
}

function wirePriyaRightPaneButtons() {
  document.querySelectorAll('.persona-narrative[data-persona="analyst"] .pn-s-play').forEach(btn => {
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      if (!state.graphWinOpen) toggleGraphWindow();
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// W10 Section H — P2 Lim right-pane narrative (Safety · Tacit · KG promotion)
// ═══════════════════════════════════════════════════════════════

// W13 R1 Item #10 — P2 Lim right pane collapsed to Section C only (KG promotion).
// Sections A (safety stage-gate theater) + B (tacit Singlish theater) dropped from markup;
// their defs (P2_SECTION_A / P2_SECTION_B) + the openP2NarrativeModal path stay as dead code per WA #5.
// Section C label retained ('C') for traceability against W12 selectors — not renumbered to '1'.
const P2_NARRATIVE_SECTIONS = [
  {
    num: 'C',
    title: 'Tacit knowledge → Knowledge Graph promotion',
    sub: 'Triage · review · only validated insights promote.',
    action: 'open-kg',
    buttonLabel: 'Open KG',
  },
];

function renderRightPaneLim() {
  const host = document.getElementById('persona-narrative-host');
  if (!host) return;
  if (host.dataset.personaBuilt === 'onsite') return;
  host.innerHTML = '';
  host.dataset.personaBuilt = 'onsite';

  const wrap = document.createElement('div');
  wrap.className = 'persona-narrative';
  wrap.dataset.persona = 'onsite';

  wrap.innerHTML = `
    <div class="pn-header">
      <div class="pn-h-title">On-site agents at work · 1 capability</div>
      <div class="pn-h-sub">Tacit knowledge → Knowledge Graph promotion.</div>
    </div>
    ${P2_NARRATIVE_SECTIONS.map(s => {
      const isKG = s.action === 'open-kg';
      const played = state.w10.playedSections.p2[s.num];
      const btnLabel = isKG ? 'Open KG' : (played ? '✓ Replay' : 'Play');
      return `
      <div class="pn-section ${!isKG && played ? 'pn-section-played' : ''}" data-section="${s.num}">
        <div class="pn-s-num">${s.num}</div>
        <div class="pn-s-body">
          <div class="pn-s-title">${s.title}</div>
          <div class="pn-s-sub">${s.sub}</div>
        </div>
        <button class="pn-s-play ${!isKG && played ? 'pn-s-played' : ''}" type="button" data-section="${s.num}" data-action="${s.action}">
          <svg class="pn-s-play-icon" viewBox="0 0 12 12"><path d="M2 1 L10 6 L2 11 Z" fill="currentColor"/></svg>
          <span>${btnLabel}</span>
        </button>
      </div>`;
    }).join('')}
  `;
  host.appendChild(wrap);
  wireLimRightPaneButtons();
}

function wireLimRightPaneButtons() {
  document.querySelectorAll('.persona-narrative[data-persona="onsite"] .pn-s-play').forEach(btn => {
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      const num = btn.dataset.section;
      const action = btn.dataset.action;
      if (action === 'open-kg') {
        // Section C → open floating KG window (toolbar Display Graph handler)
        if (!state.graphWinOpen) toggleGraphWindow();
      } else {
        openP2NarrativeModal(num);
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// W10 — P2 modal content defs
// ═══════════════════════════════════════════════════════════════

// W12 Section G.2 — P2 Section A: Safety stage-gate theater.
// Workflow bar w/ 5 stages plays · alert flashes · safety gate slides in · 3 checks resolve · gate clears · workflow resumes.
const P2_SECTION_A = {
  num: 'A', title: 'Safety protocol enforcement · workflow stage gate',
  template: 'safety-gate',
};

// W12 Section G.3 — P2 Section B: Tacit Singlish-detection theater.
// Audio waveform · language detection pulse · 5 Singlish bubbles · 5 bytes coalesced.
const P2_SECTION_B = {
  num: 'B', title: 'Tacit knowledge capture · Singlish-aware transcription',
  template: 'tacit-singlish',
};

// W13 R1 — P2 modal targets dropped; no Section C modal def (C opens floating KG directly via toggleGraphWindow).
// Prompt's `{ 'C': P2_SECTION_C }` shape not applicable — `P2_SECTION_C` never existed. Reduce to {}.
// P2_SECTION_A + P2_SECTION_B defs above retained as dead code per WA #5.
const P2_SECTION_BY_NUM = {};

function openP2NarrativeModal(num) {
  const sectionDef = P2_SECTION_BY_NUM[String(num)];
  if (!sectionDef) return;
  openNarrativeModal('p2', sectionDef);
}

// ═══════════════════════════════════════════════════════════════
// W10 Section C — P1 Faye right-pane narrative (3 sections + Play)
// ═══════════════════════════════════════════════════════════════

const P1_NARRATIVE_SECTIONS = [
  {
    num: '1',
    title: 'Criticality · Diagnosis · Summary',
    sub: 'Agents pull the right Hyperspace OS metrics + run pattern-match against prior incidents to land a single criticality + diagnosis summary card.',
    meta: '4 domain experts · 2 critics · sources: Hyperspace · Netscope · Org Knowledge',
  },
  {
    num: '2',
    title: 'SOP-driven telemetry confirmation',
    sub: 'SOP says operator must confirm metrics. Agents fetch the snapshot and bundle it for Faye.',
    meta: '3 domain experts · 2 critics · sources: Hyperspace · SOP store',
  },
  {
    num: '3',
    title: 'Scheduling · Expertise match · Dispatch',
    sub: 'Agents check duty roster + expertise DB · pick Lim Wei Jie · auto-bundle dispatch payload.',
    meta: '4 domain experts · 1 critic · source: Org Knowledge (roster · expertise DB · cert records)',
  },
];

// W10 — persisted across renders so replay state survives back-nav / persona switch
state.w10 = state.w10 || {
  playedSections: { p1: {}, p2: {} },
  modalOpen: false,
  modalTimers: [],
};

// W13 R3 — P1 right pane collapsed to single section.
// 3-section iteration over P1_NARRATIVE_SECTIONS dropped from live dispatch.
// Old defs (P1_NARRATIVE_SECTIONS, P1_SECTION_1/2/3, P1_SECTION_BY_NUM, openP1NarrativeModal)
// retained as dead code per WA #5.
function renderRightPaneFaye() {
  const host = document.getElementById('persona-narrative-host');
  if (!host) return;
  if (host.dataset.personaBuilt === 'ops') return;
  host.innerHTML = '';
  host.dataset.personaBuilt = 'ops';

  const wrap = document.createElement('div');
  wrap.className = 'persona-narrative';
  wrap.dataset.persona = 'ops';

  const played = !!(state.w10.playedSections.p1 && state.w10.playedSections.p1['workflows']);

  wrap.innerHTML = `
    <div class="pn-header">
      <div class="pn-h-title">Agents at work · 1 capability</div>
      <div class="pn-h-sub">Stage-gated agentic workflows — triage · action planner · scheduling.</div>
    </div>
    <div class="pn-section ${played ? 'pn-section-played' : ''}" data-section="workflows">
      <div class="pn-s-num">▸</div>
      <div class="pn-s-body">
        <div class="pn-s-title">Agentic workflows for Faye</div>
        <div class="pn-s-sub">3 stage-gated workflows behind the scenes · click to walk through.</div>
      </div>
      <button class="pn-s-play ${played ? 'pn-s-played' : ''}" type="button" data-section="workflows">
        <svg class="pn-s-play-icon" viewBox="0 0 12 12"><path d="M2 1 L10 6 L2 11 Z" fill="currentColor"/></svg>
        <span>${played ? '✓ Replay' : 'Play'}</span>
      </button>
    </div>
  `;

  host.appendChild(wrap);
  wireFayeRightPanePlayButtons();
}

function wireFayeRightPanePlayButtons() {
  document.querySelectorAll('.persona-narrative[data-persona="ops"] .pn-s-play').forEach(btn => {
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      openP1WorkflowsModal();
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// W10 Sections E-G — P1 modal content definitions
// ═══════════════════════════════════════════════════════════════

const P1_SECTION_1 = {
  num: 1, title: 'Criticality · Diagnosis · Summary',
  domain: [
    { name: 'Sensor Anomaly Inspector',      persistent: 'inspection', dataSource: 'Hyperspace' },
    { name: 'Equipment Diagnostic Agent',      persistent: 'triage',     dataSource: 'Org Knowledge' },
    { name: 'Criticality Scoring Agent',     persistent: null,         dataSource: 'Netscope' },
    { name: 'Incident Summary Synthesizer',  persistent: null,         dataSource: 'Hyperspace' },
  ],
  orch: [
    { name: 'Orchestrator',           persistent: 'orchestrator' },
    { name: 'A2A Coordination Agent', persistent: 'workflow' },
  ],
  critique: [
    { name: 'Critic · Power Gen',           persistent: 'critic-power-gen' },
    { name: 'Criticality Standards Critic', persistent: null },
  ],
  sources: ['Hyperspace · telemetry', 'Netscope · analytics', 'Org Knowledge · SOPs + RCA'],
  narration: [
    'Domain experts pull vibration RMS from Hyperspace and pattern-match against prior BFP failures.',
    'Criticality Scoring Agent uses Netscope analytics to confirm severity classification.',
    'Incident Summary Synthesizer hands Faye a single Hyperspace-OS-sourced summary card.',
  ],
};

// W11 Section E — Anticipation theater (4-step storyboard)
const P1_SECTION_2 = {
  num: 2, title: 'SOP-driven telemetry confirmation',
  template: 'anticipation',
  steps: [
    { idx: 1, visual: 'sop-doc',         agent: 'SOP Retrieval Agent',         persistent: null,         caption: 'Pulls SOP-BFP-VIBR-001 from Org Knowledge' },
    { idx: 2, visual: 'sop-highlight',   agent: 'SOP Adherence Critic',        persistent: null,         caption: 'Flags Step 7: operator must verify telemetry' },
    { idx: 3, visual: 'chart-draw',      agent: 'Sensor Anomaly Inspector',    persistent: 'inspection', caption: 'Pulls last 15-min vibration RMS · NDE bearing housing' },
    { idx: 4, visual: 'snapshot-staged', agent: 'Telemetry Snapshot Compiler', persistent: null,         caption: 'Bundles snapshot, places it in Faye Sit\'s queue' },
  ],
  footer: 'The agents anticipated. Faye never asked. The snapshot was already waiting.',
};

// W11 Section F — Parallel-match theater (4×4 matrix)
const P1_SECTION_3 = {
  num: 3, title: 'Scheduling · Expertise match · Dispatch',
  template: 'parallel-match',
  criteria: ['Roster Check', 'Expertise Match', 'Availability Window', 'Certs Validator'],
  candidates: [
    { id: 'lim',       name: 'Lim Wei Jie', results: ['pass', 'pass', 'pass', 'pass'], winner: true  },
    { id: 'j-tan',     name: 'J. Tan',      results: ['pass', 'fail', 'na',   'na'  ], winner: false },
    { id: 's-ibrahim', name: 'S. Ibrahim',  results: ['pass', 'pass', 'fail', 'na'  ], winner: false },
    { id: 'm-lim',     name: 'M. Lim',      results: ['pass', 'pass', 'pass', 'fail'], winner: false },
  ],
  counterLabel: '4 criteria × 4 candidates · evaluated in parallel',
  counterTime: '20-minute phone tag → ',
  counterTimeBold: '2.4 seconds',
  dispatchHTML: '→ <strong>A2A Coordination Agent</strong> · dispatching to <span class="dyn-name">Lim Wei Jie</span> · payload pre-attached',
};

const P1_SECTION_BY_NUM = { '1': P1_SECTION_1, '2': P1_SECTION_2, '3': P1_SECTION_3 };

// ═══════════════════════════════════════════════════════════════
// W13 R3 — Single-section 3-workflow stage-gated modal (P1)
// Replaces the 3-section W10/W11 P1 narrative pattern.
// ═══════════════════════════════════════════════════════════════

const P1_WORKFLOWS = {
  title: 'Agentic workflows for Faye',
  steps: [
    {
      num: 1,
      label: 'Agentic triage',
      tagline: 'Sensor anomaly · severity scoring · KG path-trace',
      durationMs: 24000,   // W14 R1 — 4x slower (was 6000)
      buckets: [
        { name: 'Domain Experts',   agents: ['Sensor Anomaly Inspector', 'Historical Incidents Agent', 'Equipment History Agent', 'Criticality Scoring Agent', 'Incident Summary Synthesizer'], persistent: ['inspection', null, null, null, null] },
        { name: 'Critic',           agents: ['Critic · Power Gen', 'Criticality Standards Critic'],         persistent: ['critic-power-gen', null] },
        { name: 'Orchestrator',     agents: ['Equipment Diagnostic Agent', 'Confidence Score Agent', 'A2A Coordination Agent'], persistent: ['triage', null, 'workflow'] },
      ],
      outputCaption: '',   // green confidence bar removed — confidence now carried by the Confidence Score Agent
    },
    {
      num: 2,
      label: 'Action planner',
      tagline: 'SOP retrieval · adherence check · telemetry pre-fetch',
      durationMs: 28000,   // W14 R1 — 4x slower (was 7000)
      buckets: [
        { name: 'Domain Experts',   agents: ['SOP Retrieval Agent', 'Sensor Anomaly Inspector', 'Telemetry Snapshot Compiler', 'SOP Compliance Agent'], persistent: [null, 'inspection', null, 'sop-action'] },
        { name: 'Critic',           agents: ['SOP Adherence Critic'],                                       persistent: [null] },
        { name: 'Orchestrator',     agents: ['A2A Coordination Agent'],                                     persistent: ['workflow'] },
      ],
      outputCaption: 'Action planner · SOP-BFP-VIBR-001 selected · telemetry pre-fetched · awaiting Faye Review',
      hitlNote: 'Human-in-the-loop · Faye must confirm telemetry (Step 1 Review)',
    },
    {
      num: 3,
      label: 'Scheduling',
      tagline: 'Roster · planned-outage calendar · schedule-optimized dispatch',
      durationMs: 20000,   // W14 R1 — 4x slower (was 5000)
      buckets: [
        // W42 — Schedule Integration Agent consumes existing crew roster + planned maint/outage calendar to optimize dispatch timing.
        { name: 'Domain Experts',   agents: ['Roster Lookup Agent', 'Expertise Match Agent', 'Schedule Integration Agent', 'Criticality Scoring Agent'], persistent: [null, null, null, null] },
        { name: 'Critic',           agents: ['Certs Validator'],                                            persistent: [null] },
        { name: 'Orchestrator',     agents: ['Schedule Optimizer Agent', 'A2A Coordination Agent'],         persistent: [null, 'workflow'] },
      ],
      outputCaption: 'Schedule Integration Agent · BFP-3A fix co-scheduled into next planned maintenance window · crew roster aligned · dispatching to Lim Wei Jie',
    },
  ],
};

function openP1WorkflowsModal() {
  closeNarrativeModal();
  state.w10.modalOpen = true;
  state.w10.modalScope = 'p1-workflows';
  state.w10.modalSectionNum = 'workflows';
  state.w10.workflowStep = 1;

  // Pulse the single P1 RHS card while modal is open
  const card = document.querySelector('.persona-narrative[data-persona="ops"] .pn-section[data-section="workflows"]');
  if (card) card.classList.add('pn-section-pulse');

  const backdrop = document.createElement('div');
  backdrop.className = 'narrative-modal-backdrop';
  backdrop.id = 'narrative-modal-backdrop';
  backdrop.innerHTML = `
    <div class="narrative-modal narrative-modal-workflows" role="dialog" aria-modal="true">
      <div class="narrative-modal-header">
        <div class="nm-section-num">FAYE</div>
        <div class="nm-section-title">${P1_WORKFLOWS.title}</div>
        <button class="nm-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="narrative-modal-body" id="narrative-modal-body">
        ${buildWorkflowsModalCanvas()}
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  backdrop.querySelector('.nm-close').addEventListener('click', () => closeNarrativeModal());
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeNarrativeModal();
  });
  state.w10.modalEscHandler = e => {
    if (e.key === 'Escape') closeNarrativeModal();
  };
  document.addEventListener('keydown', state.w10.modalEscHandler);

  // W14 R1 — wire clickable stepper pills (replay-on-click · no auto-advance)
  document.querySelectorAll('.wf-stepper-pill').forEach(btn => {
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      const num = parseInt(btn.dataset.step, 10);
      if (num) playWorkflowStep(num);
    });
  });

  startWorkflowSequencer();
}

function buildWorkflowsModalCanvas() {
  // W14 R1 — pills are <button> for click-to-play (was <div>)
  const pillsHtml = P1_WORKFLOWS.steps.map((s, i) => {
    const arrow = i < P1_WORKFLOWS.steps.length - 1 ? '<span class="wf-stepper-conn"></span>' : '';
    return `<button class="wf-stepper-pill" type="button" data-step="${s.num}" data-state="${s.num === 1 ? 'active' : 'pending'}">
      <span class="wf-stepper-num">${s.num}</span>
      <span class="wf-stepper-label">${s.label}</span>
    </button>${arrow}`;
  }).join('');

  const firstStep = P1_WORKFLOWS.steps[0];
  return `
    <div class="wf-canvas">
      <div class="wf-stepper">${pillsHtml}</div>
      <div class="wf-active-canvas" id="wf-active-canvas">
        ${buildWorkflowStepCanvas(firstStep)}
      </div>
      <div class="wf-advance-hint" id="wf-advance-hint">
        Click any step to play its workflow ▸
      </div>
    </div>
  `;
}

function buildWorkflowStepCanvas(stepDef) {
  const bucketsHtml = stepDef.buckets.map((b, bi) => {
    const agentsHtml = b.agents.map((a, ai) => `
      <div class="wf-agent-dot" data-agent="${a}" data-bucket-idx="${bi}" data-agent-idx="${ai}">
        <span class="wf-agent-pulse"></span>
        <span class="wf-agent-name">${a}</span>
      </div>`).join('');
    const arrow = bi < stepDef.buckets.length - 1 ? '<div class="wf-bucket-arrow">→</div>' : '';
    return `
      <div class="wf-bucket" data-bucket="${b.name.toLowerCase().replace(/[^a-z]+/g, '-')}">
        <div class="wf-bucket-label">${b.name}</div>
        <div class="wf-bucket-agents">${agentsHtml}</div>
      </div>${arrow}`;
  }).join('');

  const hitlHtml = stepDef.hitlNote
    ? `<div class="wf-hitl-note"><span class="wf-hitl-badge">HITL</span><span>${stepDef.hitlNote}</span></div>`
    : '';

  const outputHtml = stepDef.outputCaption
    ? `<div class="wf-step-output">
        <span class="wf-step-output-check">✓</span>
        <span class="wf-step-output-caption">${stepDef.outputCaption}</span>
      </div>`
    : '';

  return `
    <div class="wf-step-card" data-step="${stepDef.num}">
      <div class="wf-step-tagline">${stepDef.tagline}</div>
      <div class="wf-buckets">${bucketsHtml}</div>
      ${outputHtml}
      ${hitlHtml}
    </div>
  `;
}

function startWorkflowSequencer() {
  state.w10.modalTimers = state.w10.modalTimers || [];
  playWorkflowStep(1);
}

function playWorkflowStep(stepNum) {
  // W14 R1 — defensive: clear any in-flight reveal timers from previous play
  if (state.w10.modalTimers && state.w10.modalTimers.length) {
    state.w10.modalTimers.forEach(t => clearTimeout(t));
    state.w10.modalTimers = [];
  }

  state.w10.workflowStep = stepNum;
  const stepDef = P1_WORKFLOWS.steps[stepNum - 1];
  if (!stepDef) return;

  state.w10.workflowsPlayed = state.w10.workflowsPlayed || {};

  // W14 R1 — semantics: active = currently playing · done = previously played · pending = never played
  document.querySelectorAll('.wf-stepper-pill').forEach(pill => {
    const n = parseInt(pill.dataset.step, 10);
    if (n === stepNum) {
      pill.dataset.state = 'active';
    } else if (state.w10.workflowsPlayed[n]) {
      pill.dataset.state = 'done';
    } else {
      pill.dataset.state = 'pending';
    }
  });

  // W14 R1 — always swap canvas (replay-on-click re-builds step content)
  const canvas = document.getElementById('wf-active-canvas');
  if (canvas) canvas.innerHTML = buildWorkflowStepCanvas(stepDef);

  // Reset hint while step plays
  const hint = document.getElementById('wf-advance-hint');
  if (hint) {
    hint.textContent = `Playing workflow ${stepNum}… ▸`;
    hint.dataset.state = '';
  }

  // Flatten agents w/ their persistent mappings (preserve bucket+agent order)
  const flatAgents = [];
  stepDef.buckets.forEach(b => {
    b.agents.forEach((name, idx) => {
      flatAgents.push({ name, persistent: (b.persistent || [])[idx] || null });
    });
  });

  const reveals = Math.max(1, flatAgents.length);
  // W14 R1 — floor bumped 400 → 1200 (3x) to keep proportional cadence at 4x durationMs
  const stagger = Math.max(1200, Math.floor((stepDef.durationMs - 6000) / reveals));
  const dots = document.querySelectorAll('#wf-active-canvas .wf-agent-dot');

  dots.forEach((el, i) => {
    const meta = flatAgents[i];
    const t = setTimeout(() => {
      el.classList.add('wf-agent-revealed');
      if (meta && meta.persistent) {
        const remaining = Math.max(1500, stepDef.durationMs - i * stagger);
        fireAgentCardLifecycle(meta.persistent, remaining);
      }
    }, i * stagger);
    state.w10.modalTimers.push(t);
  });

  // W14 R1 — output caption reveal near end of step (scaled w/ 4x duration)
  const outputDelay = Math.max(1000, stepDef.durationMs - 3000);
  const tOutput = setTimeout(() => {
    const out = document.querySelector('#wf-active-canvas .wf-step-output');
    if (out) out.classList.add('wf-step-output-revealed');
  }, outputDelay);
  state.w10.modalTimers.push(tOutput);

  // W14 R1 — step-end: mark played + update hint · NO auto-advance to next step
  const tEnd = setTimeout(() => {
    state.w10.workflowsPlayed[stepNum] = true;
    // Update stepper to reflect now-done active pill (only if user hasn't clicked another)
    const pill = document.querySelector(`.wf-stepper-pill[data-step="${stepNum}"]`);
    if (pill && pill.dataset.state === 'active') pill.dataset.state = 'done';

    const hint2 = document.getElementById('wf-advance-hint');
    const allPlayed = P1_WORKFLOWS.steps.every(s => state.w10.workflowsPlayed[s.num]);
    if (allPlayed) {
      onWorkflowsComplete();
    } else if (hint2) {
      hint2.textContent = `Workflow ${stepNum} complete · click another step ▸`;
      hint2.dataset.state = 'done-step';
    }
  }, stepDef.durationMs);
  state.w10.modalTimers.push(tEnd);
}

function onWorkflowsComplete() {
  // Mark final pill done
  document.querySelectorAll('.wf-stepper-pill').forEach(pill => { pill.dataset.state = 'done'; });
  const hint = document.getElementById('wf-advance-hint');
  if (hint) {
    hint.textContent = 'All workflows complete ✓';
    hint.dataset.state = 'done';
  }
  state.w10.playedSections.p1 = state.w10.playedSections.p1 || {};
  state.w10.playedSections.p1['workflows'] = true;

  // Flip the RHS card label so closing the modal shows ✓ Replay
  const playBtn = document.querySelector('.persona-narrative[data-persona="ops"] .pn-s-play[data-section="workflows"]');
  if (playBtn) {
    playBtn.classList.add('pn-s-played');
    const sp = playBtn.querySelector('span');
    if (sp) sp.textContent = '✓ Replay';
    const sectionEl = playBtn.closest('.pn-section');
    if (sectionEl) sectionEl.classList.add('pn-section-played');
  }
}

// ═══════════════════════════════════════════════════════════════
// W10 Section D — pop-out narrative modal mechanic
// ═══════════════════════════════════════════════════════════════

function openP1NarrativeModal(num) {
  const sectionDef = P1_SECTION_BY_NUM[String(num)];
  if (!sectionDef) return;
  openNarrativeModal('p1', sectionDef);
}

function openNarrativeModal(scope, sectionDef) {
  closeNarrativeModal(); // tear down any in-flight modal
  state.w10.modalOpen = true;
  state.w10.modalScope = scope;
  state.w10.modalSectionNum = String(sectionDef.num);

  // Pulse the persistent card on the right pane while modal is open
  const personaKey = scope === 'p1' ? 'ops' : scope === 'p2' ? 'onsite' : 'analyst';
  const card = document.querySelector(`.persona-narrative[data-persona="${personaKey}"] .pn-section[data-section="${sectionDef.num}"]`);
  if (card) card.classList.add('pn-section-pulse');

  const backdrop = document.createElement('div');
  backdrop.className = 'narrative-modal-backdrop';
  backdrop.id = 'narrative-modal-backdrop';
  backdrop.innerHTML = `
    <div class="narrative-modal" role="dialog" aria-modal="true">
      <div class="narrative-modal-header">
        <div class="nm-section-num">SECTION ${sectionDef.num}</div>
        <div class="nm-section-title">${sectionDef.title}</div>
        <button class="nm-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="narrative-modal-body" id="narrative-modal-body">
        ${buildNarrativeModalCanvas(sectionDef)}
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  // Wire close × + backdrop click
  backdrop.querySelector('.nm-close').addEventListener('click', () => closeNarrativeModalAndMarkPlayed());
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeNarrativeModalAndMarkPlayed();
  });
  // ESC key handled via document listener (one-shot per modal)
  state.w10.modalEscHandler = e => {
    if (e.key === 'Escape') closeNarrativeModalAndMarkPlayed();
  };
  document.addEventListener('keydown', state.w10.modalEscHandler);

  // Mark played + flip button label to ✓ Replay
  state.w10.playedSections[scope === 'p1' ? 'p1' : 'p2'][sectionDef.num] = true;
  const playBtn = document.querySelector(
    `.persona-narrative[data-persona="${personaKey}"] .pn-s-play[data-section="${sectionDef.num}"]`
  );
  if (playBtn) {
    playBtn.classList.add('pn-s-played');
    const sp = playBtn.querySelector('span');
    if (sp) sp.textContent = '✓ Replay';
    const sectionEl = playBtn.closest('.pn-section');
    if (sectionEl) sectionEl.classList.add('pn-section-played');
  }

  // Kick off animation sequence
  playNarrativeModalAnimation(sectionDef);
}

function closeNarrativeModalAndMarkPlayed() {
  // Played state already set on open; this just tears down.
  closeNarrativeModal();
}

function closeNarrativeModal() {
  const backdrop = document.getElementById('narrative-modal-backdrop');
  if (backdrop) backdrop.remove();
  if (state.w10.modalEscHandler) {
    document.removeEventListener('keydown', state.w10.modalEscHandler);
    state.w10.modalEscHandler = null;
  }
  // Clear pulse on the persistent card
  document.querySelectorAll('.pn-section-pulse').forEach(el => el.classList.remove('pn-section-pulse'));
  // Cancel any pending animation timers
  (state.w10.modalTimers || []).forEach(t => clearTimeout(t));
  state.w10.modalTimers = [];
  state.w10.modalOpen = false;
  state.w10.modalScope = null;
  state.w10.modalSectionNum = null;
}

// ═══════════════════════════════════════════════════════════════
// W10 Section D.5 — modal animation sequencer
// ═══════════════════════════════════════════════════════════════

function playNarrativeModalAnimation(sectionDef) {
  // W11/W12 — dispatch by template
  const tmpl = sectionDef.template;
  if (tmpl === 'anticipation')    return playAnticipationAnimation(sectionDef);
  if (tmpl === 'parallel-match')  return playParallelMatchAnimation(sectionDef);
  if (tmpl === 'split-canvas')    return playSplitCanvasAnimation(sectionDef);
  if (tmpl === 'safety-gate')     return playSafetyGateAnimation(sectionDef);
  if (tmpl === 'tacit-singlish')  return playTacitSinglishAnimation(sectionDef);

  const seq = [];
  // Phase 1 — domain agents
  (sectionDef.domain || []).forEach((agent, idx) => {
    seq.push({ at: idx * 700,        action: 'reveal-agent', bucket: 'domain', idx });
    seq.push({ at: idx * 700 + 300,  action: 'pulse-agent',  bucket: 'domain', idx });
    seq.push({ at: idx * 700 + 1200, action: 'check-agent',  bucket: 'domain', idx });
    if (agent.dataSource) {
      seq.push({ at: idx * 700 + 200, action: 'flash-source', source: agent.dataSource });
    }
    if (agent.persistent) {
      seq.push({ at: idx * 700 + 300, action: 'pulse-persistent', agentId: agent.persistent });
    }
  });

  const phase2Start = (sectionDef.domain || []).length * 700 + 300;
  (sectionDef.orch || []).forEach((agent, idx) => {
    seq.push({ at: phase2Start + idx * 500,       action: 'reveal-agent', bucket: 'orch', idx });
    seq.push({ at: phase2Start + idx * 500 + 300, action: 'pulse-agent',  bucket: 'orch', idx });
    if (agent.persistent) {
      seq.push({ at: phase2Start + idx * 500 + 300, action: 'pulse-persistent', agentId: agent.persistent });
    }
  });

  const phase3Start = phase2Start + (sectionDef.orch || []).length * 500 + 500;
  (sectionDef.critique || []).forEach((agent, idx) => {
    seq.push({ at: phase3Start + idx * 500,        action: 'reveal-agent', bucket: 'critique', idx });
    seq.push({ at: phase3Start + idx * 500 + 300,  action: 'pulse-agent',  bucket: 'critique', idx });
    seq.push({ at: phase3Start + idx * 500 + 1200, action: 'check-agent',  bucket: 'critique', idx });
    if (agent.persistent) {
      seq.push({ at: phase3Start + idx * 500 + 300, action: 'pulse-persistent', agentId: agent.persistent });
    }
  });

  // faye.orchSpeed scales the orchestration-narrative cascade (see TIMING at top).
  state.w10.modalTimers = seq.map(step => setTimeout(() => applyNarrativeAction(step), Math.round(step.at * TIMING.faye.orchSpeed)));
}

// ═══════════════════════════════════════════════════════════════
// W11 — Narrative modal: per-template canvas builders + sequencers
// ═══════════════════════════════════════════════════════════════

function buildNarrativeModalCanvas(sectionDef) {
  const tmpl = sectionDef.template;
  if (tmpl === 'anticipation')    return buildAnticipationCanvas(sectionDef);
  if (tmpl === 'parallel-match')  return buildParallelMatchCanvas(sectionDef);
  if (tmpl === 'split-canvas')    return buildSplitCanvas(sectionDef);
  if (tmpl === 'safety-gate')     return buildSafetyGateCanvas(sectionDef);
  if (tmpl === 'tacit-singlish')  return buildTacitSinglishCanvas(sectionDef);
  return buildDefaultBucketCanvas(sectionDef);
}

function buildDefaultBucketCanvas(sectionDef) {
  return `
    <div class="nv-canvas">
      <div class="nv-bucket" data-bucket-type="domain">
        <div class="nv-bucket-label">Domain experts · transient</div>
        <div class="nv-agents">
          ${(sectionDef.domain || []).map((a, i) => `<span class="nv-agent" data-bucket="domain" data-idx="${i}">${a.name}</span>`).join('')}
        </div>
      </div>
      <div class="nv-arrow" data-direction="down">
        <svg viewBox="0 0 16 20"><path d="M8 0 V18 M2 12 L8 18 L14 12"/></svg>
        <span>orchestrated by</span>
      </div>
      <div class="nv-bucket" data-bucket-type="orch">
        <div class="nv-bucket-label">Orchestration</div>
        <div class="nv-agents">
          ${(sectionDef.orch || []).map((a, i) => `<span class="nv-agent" data-bucket="orch" data-idx="${i}">${a.name}</span>`).join('')}
        </div>
      </div>
      <div class="nv-arrow" data-direction="down">
        <svg viewBox="0 0 16 20"><path d="M8 0 V18 M2 12 L8 18 L14 12"/></svg>
        <span>validated by</span>
      </div>
      <div class="nv-bucket" data-bucket-type="critique">
        <div class="nv-bucket-label">Critique</div>
        <div class="nv-agents">
          ${(sectionDef.critique || []).map((a, i) => `<span class="nv-agent" data-bucket="critique" data-idx="${i}">${a.name}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

// ── Anticipation theater (P1 Section 2 · W11) ─────────────────
const ANTICIPATION_VISUALS = {
  'sop-doc': `
    <svg class="nv-sop-doc" viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="4" width="62" height="92" rx="3" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1.5"/>
      <rect x="6" y="4" width="62" height="14" fill="#E0F2FE" stroke="none"/>
      <text x="12" y="14" font-family="ui-monospace, monospace" font-size="6" font-weight="800" fill="#0369A1">SOP-BFP-VIBR-001</text>
      <line x1="12" y1="26" x2="62" y2="26" stroke="#CBD5E1" stroke-width="1"/>
      <line x1="12" y1="34" x2="62" y2="34" stroke="#CBD5E1" stroke-width="1"/>
      <line x1="12" y1="42" x2="55" y2="42" stroke="#CBD5E1" stroke-width="1"/>
      <line x1="12" y1="50" x2="62" y2="50" stroke="#CBD5E1" stroke-width="1"/>
      <line x1="12" y1="58" x2="50" y2="58" stroke="#CBD5E1" stroke-width="1"/>
      <line x1="12" y1="66" x2="62" y2="66" stroke="#CBD5E1" stroke-width="1"/>
      <line x1="12" y1="74" x2="58" y2="74" stroke="#CBD5E1" stroke-width="1"/>
      <line x1="12" y1="82" x2="48" y2="82" stroke="#CBD5E1" stroke-width="1"/>
    </svg>`,
  'sop-highlight': `
    <svg class="nv-sop-doc-zoomed" viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="4" width="62" height="92" rx="3" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1.5"/>
      <text x="10" y="16" font-family="ui-monospace, monospace" font-size="5" fill="#64748B">Step 5 · Inspect bearing housing</text>
      <text x="10" y="26" font-family="ui-monospace, monospace" font-size="5" fill="#64748B">Step 6 · Check bearing temp</text>
      <rect x="6" y="32" width="62" height="20" fill="#FEF3C7" stroke="#F59E0B" stroke-width="1.5"/>
      <text x="10" y="42" font-family="ui-monospace, monospace" font-size="5" font-weight="800" fill="#92400E">Step 7 · Verify telemetry vs</text>
      <text x="10" y="48" font-family="ui-monospace, monospace" font-size="5" font-weight="800" fill="#92400E">baseline (last 15 min RMS)</text>
      <text x="10" y="62" font-family="ui-monospace, monospace" font-size="5" fill="#64748B">Step 8 · Pull RCA history</text>
      <text x="10" y="72" font-family="ui-monospace, monospace" font-size="5" fill="#64748B">Step 9 · Dispatch onsite eng</text>
      <text x="10" y="82" font-family="ui-monospace, monospace" font-size="5" fill="#64748B">Step 10 · Log to incident DB</text>
    </svg>`,
  'chart-draw': `
    <svg class="nv-vibration-chart" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
      <line x1="12" y1="68" x2="116" y2="68" stroke="#94A3B8" stroke-width="0.8"/>
      <line x1="12" y1="68" x2="12" y2="8" stroke="#94A3B8" stroke-width="0.8"/>
      <text x="6" y="14" font-family="ui-monospace, monospace" font-size="4" fill="#64748B" text-anchor="end">10</text>
      <text x="6" y="38" font-family="ui-monospace, monospace" font-size="4" fill="#64748B" text-anchor="end">5</text>
      <text x="6" y="68" font-family="ui-monospace, monospace" font-size="4" fill="#64748B" text-anchor="end">0</text>
      <line x1="12" y1="32" x2="116" y2="32" stroke="#F59E0B" stroke-width="0.5" stroke-dasharray="2 2"/>
      <text x="116" y="30" font-family="ui-monospace, monospace" font-size="3.5" fill="#F59E0B" text-anchor="end">7.1 alarm</text>
      <path class="nv-chart-line" d="M 12 60 L 22 56 L 32 54 L 42 50 L 52 46 L 62 42 L 72 38 L 82 32 L 92 26 L 102 22 L 112 18"
            fill="none" stroke="#DC2626" stroke-width="1.8" stroke-linecap="round"
            stroke-dasharray="180" stroke-dashoffset="180"/>
    </svg>`,
  'snapshot-staged': `
    <svg class="nv-tablet-with-chart" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="8" width="92" height="60" rx="4" fill="#1F2937" stroke="none"/>
      <rect x="19" y="13" width="82" height="50" rx="2" fill="#FFFFFF" stroke="none"/>
      <line x1="24" y1="56" x2="96" y2="56" stroke="#94A3B8" stroke-width="0.6"/>
      <path d="M 24 50 L 32 47 L 40 44 L 48 40 L 56 35 L 64 30 L 72 25 L 80 20 L 88 17 L 96 14" fill="none" stroke="#DC2626" stroke-width="1.5"/>
      <text x="60" y="22" font-family="ui-monospace, monospace" font-size="3.5" font-weight="800" fill="#0F1B3D" text-anchor="middle">vibration RMS · last 15 min</text>
    </svg>`,
};

function buildAnticipationCanvas(sectionDef) {
  const stepsHTML = sectionDef.steps.map((s, i) => `
    <div class="nv-step" data-step="${s.idx}" data-revealed="false">
      <div class="nv-step-num">${s.idx}</div>
      <div class="nv-step-visual" data-visual="${s.visual}">
        ${ANTICIPATION_VISUALS[s.visual] || ''}
        ${s.visual === 'snapshot-staged' ? '<div class="nv-anticipated-badge">✓ Anticipated · staged for Faye Sit</div>' : ''}
      </div>
      <div class="nv-step-agent">${s.agent}</div>
      <div class="nv-step-caption">${s.caption}</div>
    </div>
    ${i < sectionDef.steps.length - 1 ? '<div class="nv-step-arrow" data-arrow="' + (i + 1) + '">→</div>' : ''}
  `).join('');
  return `
    <div class="nv-anticipation-canvas">${stepsHTML}</div>
  `;
}

function playAnticipationAnimation(sectionDef) {
  const timers = [];
  const reveal = stepIdx => {
    const body = document.getElementById('narrative-modal-body');
    if (!body) return;
    const el = body.querySelector(`.nv-step[data-step="${stepIdx}"]`);
    if (el) el.dataset.revealed = 'true';
  };
  const activateArrow = arrowIdx => {
    const body = document.getElementById('narrative-modal-body');
    if (!body) return;
    const el = body.querySelector(`.nv-step-arrow[data-arrow="${arrowIdx}"]`);
    if (el) el.dataset.active = 'true';
  };
  const drawChart = () => {
    const body = document.getElementById('narrative-modal-body');
    if (!body) return;
    const el = body.querySelector('.nv-chart-line');
    if (el) el.style.strokeDashoffset = '0';
  };
  const pulsePersistent = step => {
    if (step.persistent && typeof fireAgentCardLifecycle === 'function') {
      try { fireAgentCardLifecycle(step.persistent, 1500); } catch (_) {}
    }
  };

  const steps = sectionDef.steps;
  // Step 1 reveal · arrow 1→2 · Step 2 · arrow 2→3 · Step 3 + chart · arrow 3→4 · Step 4
  timers.push(setTimeout(() => { reveal(1); pulsePersistent(steps[0]); }, 200));
  timers.push(setTimeout(() => activateArrow(1), 2000));
  timers.push(setTimeout(() => { reveal(2); pulsePersistent(steps[1]); }, 2500));
  timers.push(setTimeout(() => activateArrow(2), 4500));
  timers.push(setTimeout(() => { reveal(3); pulsePersistent(steps[2]); drawChart(); }, 5000));
  timers.push(setTimeout(() => activateArrow(3), 7500));
  timers.push(setTimeout(() => { reveal(4); pulsePersistent(steps[3]); }, 8000));

  state.w10.modalTimers = timers;
}

// ── Parallel-match theater (P1 Section 3 · W11) ───────────────
function buildParallelMatchCanvas(sectionDef) {
  const colTH = sectionDef.criteria.map(c => {
    const parts = c.split(' ');
    const top = parts[0];
    const bot = parts.slice(1).join(' ');
    return `<th><div class="nv-pm-col-title">${top}<br><span>${bot}</span></div></th>`;
  }).join('');
  const rowsHTML = sectionDef.candidates.map(c => `
    <tr class="nv-pm-row" data-candidate="${c.id}">
      <td class="nv-pm-name">${c.name}</td>
      ${c.results.map((_, i) => `<td class="nv-pm-cell" data-result="pending" data-cell-idx="${i}"></td>`).join('')}
      <td class="nv-pm-result-badge"></td>
    </tr>
  `).join('');
  return `
    <div class="nv-parallel-match-canvas">
      <table class="nv-pm-grid">
        <thead>
          <tr><th></th>${colTH}<th></th></tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
      <div class="nv-pm-counter">
        <span class="nv-pm-counter-label">${sectionDef.counterLabel}</span>
        <span class="nv-pm-counter-time">${sectionDef.counterTime}<strong>${sectionDef.counterTimeBold}</strong></span>
      </div>
      <div class="nv-pm-dispatch-fire">${sectionDef.dispatchHTML}</div>
    </div>
  `;
}

function playParallelMatchAnimation(sectionDef) {
  const timers = [];
  const body = () => document.getElementById('narrative-modal-body');

  // t=2.5s–4s · cells resolve in mixed order
  // Stagger results: per-candidate-per-cell timing varied so resolution feels parallel-but-not-uniform
  sectionDef.candidates.forEach((c, rIdx) => {
    c.results.forEach((res, cIdx) => {
      const offset = 2500 + rIdx * 120 + cIdx * 380 + Math.floor(Math.random() * 400);
      timers.push(setTimeout(() => {
        const root = body();
        if (!root) return;
        const cell = root.querySelector(`.nv-pm-row[data-candidate="${c.id}"] .nv-pm-cell[data-cell-idx="${cIdx}"]`);
        if (cell) cell.dataset.result = res;
      }, offset));
    });
    if (c.winner) {
      // Highlight winner row + GO badge at t=4.5s
      timers.push(setTimeout(() => {
        const root = body();
        if (!root) return;
        const row = root.querySelector(`.nv-pm-row[data-candidate="${c.id}"]`);
        if (row) {
          row.dataset.winner = 'true';
          const badge = row.querySelector('.nv-pm-result-badge');
          if (badge) badge.dataset.winner = 'true';
        }
      }, 4500));
    }
  });

  // t=6s · dispatch-fire activates
  timers.push(setTimeout(() => {
    const root = body();
    if (!root) return;
    const fire = root.querySelector('.nv-pm-dispatch-fire');
    if (fire) fire.dataset.active = 'true';
    if (typeof fireAgentCardLifecycle === 'function') {
      try { fireAgentCardLifecycle('workflow', 2000); } catch (_) {}
    }
  }, 6000));

  state.w10.modalTimers = timers;
}

// ── Split-canvas (P2 combined Section A · W11) ────────────────
function buildSplitCanvas(sectionDef) {
  const colHTML = (col, key) => `
    <div class="nv-split-col" data-col="${key}">
      <div class="nv-split-col-title">${col.colTitle}</div>
      <div class="nv-split-agents">
        ${col.agents.map((a, i) => `
          <div class="nv-split-agent" data-col="${key}" data-idx="${i}">
            <span class="nv-split-check">✓</span>
            <span class="nv-split-agent-name">${a.name}</span>
          </div>
        `).join('')}
      </div>
      <div class="nv-split-critic" data-col="${key}">${col.critic}</div>
      <div class="nv-split-outcome" data-col="${key}">${col.outcome}</div>
    </div>`;
  return `
    <div class="nv-split-canvas">
      <div class="nv-split-banner">${sectionDef.banner}</div>
      <div class="nv-split-cols">
        ${colHTML(sectionDef.safety, 'safety')}
        ${colHTML(sectionDef.tacit,  'tacit')}
      </div>
      <div class="nv-split-footer">${sectionDef.footer}</div>
    </div>
  `;
}

function playSplitCanvasAnimation(sectionDef) {
  const timers = [];
  const body = () => document.getElementById('narrative-modal-body');

  const revealAgent = (col, idx) => {
    const root = body();
    if (!root) return;
    const el = root.querySelector(`.nv-split-agent[data-col="${col}"][data-idx="${idx}"]`);
    if (el) el.dataset.revealed = 'true';
  };
  const revealCritic = col => {
    const root = body();
    if (!root) return;
    const el = root.querySelector(`.nv-split-critic[data-col="${col}"]`);
    if (el) el.dataset.revealed = 'true';
  };
  const revealOutcome = col => {
    const root = body();
    if (!root) return;
    const el = root.querySelector(`.nv-split-outcome[data-col="${col}"]`);
    if (el) el.dataset.revealed = 'true';
  };
  const revealFooter = () => {
    const root = body();
    if (!root) return;
    const el = root.querySelector('.nv-split-footer');
    if (el) el.dataset.revealed = 'true';
  };
  const pulseCol = col => {
    col.agents.forEach(a => {
      if (a.persistent && typeof fireAgentCardLifecycle === 'function') {
        try { fireAgentCardLifecycle(a.persistent, 1500); } catch (_) {}
      }
    });
  };

  // Left col agents reveal 1-by-1 starting at t=500ms (gap 900ms)
  sectionDef.safety.agents.forEach((_, i) => {
    timers.push(setTimeout(() => revealAgent('safety', i), 500 + i * 900));
  });
  sectionDef.tacit.agents.forEach((_, i) => {
    timers.push(setTimeout(() => revealAgent('tacit', i), 500 + i * 900));
  });
  timers.push(setTimeout(() => pulseCol(sectionDef.safety), 700));
  timers.push(setTimeout(() => pulseCol(sectionDef.tacit), 700));
  // Critics at t=3.5s
  timers.push(setTimeout(() => { revealCritic('safety'); revealCritic('tacit'); }, 3500));
  // Outcomes at t=4.5s
  timers.push(setTimeout(() => { revealOutcome('safety'); revealOutcome('tacit'); }, 4500));
  // Footer at t=6s
  timers.push(setTimeout(revealFooter, 6000));

  state.w10.modalTimers = timers;
}

// ── W12 Section G.2 — Safety stage-gate theater ──────────────
function buildSafetyGateCanvas(sectionDef) {
  return `
    <div class="nv-safety-gate-canvas">
      <div class="nv-sg-workflow-bar">
        <div class="nv-sg-stage" data-stage="1" data-state="done">Dispatch</div>
        <div class="nv-sg-arrow"></div>
        <div class="nv-sg-stage" data-stage="2" data-state="done">Site arrival</div>
        <div class="nv-sg-arrow"></div>
        <div class="nv-sg-stage" data-stage="3" data-state="active">Verify state</div>
        <div class="nv-sg-arrow"></div>
        <div class="nv-sg-stage" data-stage="4" data-state="pending">Inspection</div>
        <div class="nv-sg-arrow"></div>
        <div class="nv-sg-stage" data-stage="5" data-state="pending">Begin work</div>
      </div>
      <div class="nv-sg-alert" data-revealed="false">
        <div class="nv-sg-alert-icon">⚠</div>
        <div class="nv-sg-alert-text">
          <strong>HSE Field Compliance Agent</strong> · self-alert · stage gate required
        </div>
      </div>
      <div class="nv-sg-gate" data-revealed="false">
        <div class="nv-sg-gate-title">SAFETY GATE · auto-inserted</div>
        <div class="nv-sg-gate-checks">
          <div class="nv-sg-check" data-check="hse" data-result="pending">HSE Compliance Agent · checking site safety status</div>
          <div class="nv-sg-check" data-check="cert" data-result="pending">Safety Cert Validator · checking <span class="dyn-name">Lim Wei Jie</span> certs</div>
          <div class="nv-sg-check" data-check="ppe" data-result="pending">PPE/LOTO Check Agent · verifying LOTO state</div>
        </div>
        <div class="nv-sg-gate-outcome" data-revealed="false">→ Gate cleared · work UNBLOCKED</div>
      </div>
    </div>
  `;
}

function playSafetyGateAnimation(sectionDef) {
  const timers = [];
  const body = () => document.getElementById('narrative-modal-body');
  const setStage = (stage, st) => {
    const root = body(); if (!root) return;
    const el = root.querySelector(`.nv-sg-stage[data-stage="${stage}"]`);
    if (el) el.dataset.state = st;
  };
  const reveal = sel => {
    const root = body(); if (!root) return;
    const el = root.querySelector(sel);
    if (el) el.dataset.revealed = 'true';
  };
  const setCheck = (key, res) => {
    const root = body(); if (!root) return;
    const el = root.querySelector(`.nv-sg-check[data-check="${key}"]`);
    if (el) el.dataset.result = res;
  };

  // t=0-2s · stage 3 active; stage 4 about to activate
  timers.push(setTimeout(() => { setStage(3, 'done'); setStage(4, 'active'); }, 2000));
  // t=2s · alert flashes
  timers.push(setTimeout(() => reveal('.nv-sg-alert'), 2000));
  // t=2.5s · gate slides in
  timers.push(setTimeout(() => reveal('.nv-sg-gate'), 2500));
  // t=3/4.5/6s · checks resolve
  timers.push(setTimeout(() => setCheck('hse',  'pass'), 3000));
  timers.push(setTimeout(() => setCheck('cert', 'pass'), 4500));
  timers.push(setTimeout(() => setCheck('ppe',  'pass'), 6000));
  // Persistent agent pulses
  timers.push(setTimeout(() => { try { fireAgentCardLifecycle('hse', 1400); } catch (_) {} }, 3000));
  // t=6.5s · outcome reveals
  timers.push(setTimeout(() => reveal('.nv-sg-gate-outcome'), 6500));
  // t=7s · workflow resumes — stage 4 done, stage 5 active
  timers.push(setTimeout(() => { setStage(4, 'done'); setStage(5, 'active'); }, 7000));

  state.w10.modalTimers = timers;
}

// ── W12 Section G.3 — Tacit Singlish-detection theater ───────
function buildTacitSinglishCanvas(sectionDef) {
  const bubbles = [
    '"the pump tio jam already"',
    '"casing got crack lah"',
    '"same as Jurong 2 case"',
    '"4 o\'clock side, near the discharge"',
    '"Sulzer fail like this also can"',
  ];
  const bytes = [
    { txt: 'Byte · casing weld pattern matches Jurong 2023',  unpromoted: false },
    { txt: 'Byte · always check 4-o\'clock volute first',      unpromoted: false },
    { txt: 'Byte · Sulzer-specific failure mode',              unpromoted: false },
    { txt: 'Byte · vendor service rep visit (casual)',         unpromoted: true  },
    { txt: 'Byte · Ismail mentioned Banyan case',              unpromoted: true  },
  ];
  return `
    <div class="nv-tacit-singlish-canvas">
      <div class="nv-ts-audio-strip">
        <svg class="nv-ts-waveform" viewBox="0 0 320 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M0 20 Q10 8 20 20 T40 20 T60 12 T80 20 T100 6 T120 20 T140 14 T160 20 T180 4 T200 20 T220 16 T240 20 T260 10 T280 20 T300 14 T320 20"
                stroke="#3B82F6" stroke-width="1.5" fill="none"/>
        </svg>
        <div class="nv-ts-audio-meta">Call audio · Lim Wei Jie ↔ <span class="dyn-name">Dr. A. Ismail</span> · 7m 23s</div>
      </div>
      <div class="nv-ts-detection" data-revealed="false">
        🎤 <strong>Detected:</strong> English-Singapore (Singlish) · regional engineering vocabulary
        <div class="nv-ts-agent">Audio-transcription Agent · language model adapted</div>
      </div>
      <div class="nv-ts-bubbles" data-revealed="false">
        ${bubbles.map((b, i) => `<div class="nv-ts-bubble" data-idx="${i}" data-revealed="false">${b}</div>`).join('')}
      </div>
      <div class="nv-ts-extraction" data-revealed="false">
        <div class="nv-ts-arrow-down">↓</div>
        <div class="nv-ts-extraction-label">Tacit Knowledge Extractor · 5 bytes coalesced</div>
        <div class="nv-ts-bytes">
          ${bytes.map((b, i) => `<div class="nv-ts-byte" data-idx="${i}"${b.unpromoted ? ' data-unpromoted="true"' : ''} data-revealed="false">${b.txt}</div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function playTacitSinglishAnimation(sectionDef) {
  const timers = [];
  const body = () => document.getElementById('narrative-modal-body');
  const reveal = sel => {
    const root = body(); if (!root) return;
    const el = root.querySelector(sel);
    if (el) el.dataset.revealed = 'true';
  };

  // t=2s · detection pulse
  timers.push(setTimeout(() => reveal('.nv-ts-detection'), 2000));
  timers.push(setTimeout(() => { try { fireAgentCardLifecycle('audio-transcription', 1500); } catch (_) {} }, 2000));
  // t=2.5s · bubbles container; bubbles 1-by-1 from t=3s
  timers.push(setTimeout(() => reveal('.nv-ts-bubbles'), 2500));
  for (let i = 0; i < 5; i++) {
    timers.push(setTimeout(() => reveal(`.nv-ts-bubble[data-idx="${i}"]`), 3000 + i * 400));
  }
  // t=5.5s · extraction reveals (arrow + label)
  timers.push(setTimeout(() => reveal('.nv-ts-extraction'), 5500));
  // t=6-9s · 5 bytes reveal sequentially
  for (let i = 0; i < 5; i++) {
    timers.push(setTimeout(() => reveal(`.nv-ts-byte[data-idx="${i}"]`), 6000 + i * 600));
  }

  state.w10.modalTimers = timers;
}

function applyNarrativeAction(step) {
  const body = document.getElementById('narrative-modal-body');
  if (!body) return;
  switch (step.action) {
    case 'reveal-agent': {
      const el = body.querySelector(`.nv-agent[data-bucket="${step.bucket}"][data-idx="${step.idx}"]`);
      if (el) el.classList.add('nv-agent-visible');
      break;
    }
    case 'pulse-agent': {
      const el = body.querySelector(`.nv-agent[data-bucket="${step.bucket}"][data-idx="${step.idx}"]`);
      if (el) el.classList.add('nv-agent-active');
      break;
    }
    case 'check-agent': {
      const el = body.querySelector(`.nv-agent[data-bucket="${step.bucket}"][data-idx="${step.idx}"]`);
      if (el) {
        el.classList.remove('nv-agent-active');
        el.classList.add('nv-agent-done');
      }
      break;
    }
    case 'flash-source': {
      const pill = body.querySelector(`.nv-source-pill[data-source="${step.source}"]`);
      if (pill) {
        pill.classList.add('nv-source-pill-active');
        setTimeout(() => pill.classList.remove('nv-source-pill-active'), 1400);
      }
      break;
    }
    case 'pulse-persistent': {
      // Layered theater: pulse the same agent's card in the persistent roster (zone-agents).
      // fireAgentCardLifecycle existing W3.3 helper handles the engage-pulse animation.
      if (typeof fireAgentCardLifecycle === 'function') {
        try { fireAgentCardLifecycle(step.agentId, 1400); } catch (_) { /* defensive */ }
      }
      break;
    }
  }
}

function paintRightPaneInlineKG() {
  const rightPane = document.getElementById('right-pane');
  if (!rightPane) return;
  // Hide standard children
  Array.from(rightPane.children).forEach(c => {
    if (c.id === 'right-pane-kg-inline') return;
    c.dataset.rpHidden = '1';
    c.style.display = 'none';
  });
  // Auto-close floating KG window if it's open (mount about to move)
  if (state.graphWinOpen) toggleGraphWindow();
  // Ensure inline container exists
  let inline = document.getElementById('right-pane-kg-inline');
  if (!inline) {
    inline = document.createElement('div');
    inline.id = 'right-pane-kg-inline';
    inline.className = 'right-pane-kg-inline';
    rightPane.appendChild(inline);
  }
  inline.style.display = '';
  // Reparent #kg-3d-mount into the inline container
  const mount = document.getElementById('kg-3d-mount');
  if (mount && mount.parentElement !== inline) {
    inline.appendChild(mount);
  }
  // W8 Section 0 Part 2 — resize cache. Only call three.js .width/.height when dimensions change.
  // Repeated resize on same w/h caused micro canvas-blank flashes on every render().
  if (KG_STATE.graph && inline.clientWidth) {
    const w = inline.clientWidth;
    const h = inline.clientHeight || 600;
    if (KG_STATE._lastInlineW !== w || KG_STATE._lastInlineH !== h) {
      KG_STATE.graph.width(w).height(h);
      KG_STATE._lastInlineW = w;
      KG_STATE._lastInlineH = h;
    }
  }
}

function paintRightPaneStandard() {
  const rightPane = document.getElementById('right-pane');
  if (!rightPane) return;
  // Restore standard children
  Array.from(rightPane.children).forEach(c => {
    if (c.id === 'right-pane-kg-inline') {
      c.style.display = 'none';
      return;
    }
    if (c.dataset.rpHidden === '1') {
      c.style.display = '';
      delete c.dataset.rpHidden;
    }
  });
  // Move #kg-3d-mount back into the floating window body
  // W8 Section 0 Part 2 — only resize on actual reparent (already guarded by mount.parentElement check).
  const mount = document.getElementById('kg-3d-mount');
  const floatingBody = document.querySelector('#kg-floating-window .kg-fw-body');
  if (mount && floatingBody && mount.parentElement !== floatingBody) {
    floatingBody.appendChild(mount);
    if (KG_STATE.graph) {
      const w = floatingBody.clientWidth || 460;
      const h = floatingBody.clientHeight || 320;
      KG_STATE.graph.width(w).height(h);
      KG_STATE._lastInlineW = null; // invalidate inline cache — next inline mount must re-apply
      KG_STATE._lastInlineH = null;
    }
  }
}

// ─────────────────────────────────────────────
// KG 3D rendering module — Wave 2.5
// three.js + 3d-force-graph stratified force-graph.
// Y-axis pinned per layer via fy. Per-node state API for W3+.
// Try/catch fallback to CSS scaffold on failure.
// ─────────────────────────────────────────────

const KG_NODES = [
  // L1 People & Process (green) — y = 90
  { id: 'r-kumar',         label: 'Faye Sit · Ops',           layer: 'L1', x:  20, y: 90, z:  20 },
  { id: 'lim-wei-jie',     label: 'Lim Wei Jie · Onsite',     layer: 'L1', x: -20, y: 90, z: -20 },
  { id: 'dr-ismail',         label: 'Dr. A. Ismail · Offsite',    layer: 'L1', x: -60, y: 90, z:  20 },
  { id: 'p-sundaram',      label: 'P. Sundaram · Asset Perf', layer: 'L1', x:  60, y: 90, z: -20 },
  { id: 'bu-power-gen',    label: 'BU · Power Gen',           layer: 'L1', x:   0, y: 90, z:  60 },
  { id: 'raci-derate',     label: 'RACI · derate ≥40MW',      layer: 'L1', x: -40, y: 90, z:  60 },
  { id: 'esc-pso',         label: 'Escalation · PSO window',  layer: 'L1', x:  40, y: 90, z:  60 },
  { id: 'sop-bfp-vibration-investigation', label: 'SOP · BFP vibration investigation', layer: 'L1', x: 0, y: 90, z: -60 },

  // L2 Plant & Equipment (blue) — y = 30
  { id: 'gt-3',                label: 'GT-3',                  layer: 'L2', x: -60, y: 30, z:   0 },
  { id: 'hrsg-3',              label: 'HRSG-3',                layer: 'L2', x:   0, y: 30, z:   0 },
  { id: 'bfp-3a',              label: 'BFP-3A · Sulzer',       layer: 'L2', x:  30, y: 30, z:  20 },
  { id: 'bfp-3b',              label: 'BFP-3B',                layer: 'L2', x:  60, y: 30, z:   0 },
  { id: 'st-3',                label: 'ST-3 (steam turbine)',  layer: 'L2', x: -30, y: 30, z: -20 },
  { id: 'condenser-3',         label: 'Condenser-3',           layer: 'L2', x: -45, y: 30, z: -40 },
  { id: 'generator-3',         label: 'Generator-3',           layer: 'L2', x: -15, y: 30, z: -40 },
  { id: 'transformer-3',       label: 'Transformer-3',         layer: 'L2', x:  15, y: 30, z: -40 },
  { id: 'switchyard-a',        label: 'Switchyard-A',          layer: 'L2', x:  45, y: 30, z: -40 },
  { id: 'vt-bfp-3a-nde-x',     label: 'Vib transducer · NDE X', layer: 'L2', x: 50, y: 30, z:  40 },
  { id: 'vt-bfp-3a-nde-y',     label: 'Vib transducer · NDE Y', layer: 'L2', x: 65, y: 30, z:  40 },
  { id: 'vt-bfp-3a-de-x',      label: 'Vib transducer · DE X',  layer: 'L2', x: 20, y: 30, z:  60 },
  { id: 'vt-bfp-3a-de-y',      label: 'Vib transducer · DE Y',  layer: 'L2', x: 35, y: 30, z:  60 },
  { id: 'bearing-bfp-3a-nde',  label: 'Bearing · NDE (SKF)',    layer: 'L2', x: 75, y: 30, z:  20 },
  { id: 'coupling-bfp-3a',     label: 'BFP-3A coupling',        layer: 'L2', x: 10, y: 30, z:  40 },
  { id: 'shaft-bfp-3a',        label: 'BFP-3A drive shaft',     layer: 'L2', x: 45, y: 30, z:  10 },
  { id: 'casing-bfp-3a',       label: 'BFP-3A pump casing',     layer: 'L2', x: 55, y: 30, z:  30 },
  { id: 'sulzer-bfp-manual',   label: 'OEM · Sulzer BFP manual', layer: 'L2', x: 80, y: 30, z:  -10 },

  // L3 Historical State (amber) — y = -30
  { id: 'vib-rms-90d',         label: 'BFP-3A · 90d vib RMS',           layer: 'L3', x: -60, y: -30, z:   0 },
  { id: 'bearing-temp-30d',    label: 'NDE bearing · 30d temp',         layer: 'L3', x: -45, y: -30, z:  20 },
  { id: 'rca-bfp-jrg-2025',    label: 'RCA · Jurong-2 BFP · 2025-08',   layer: 'L3', x: -15, y: -30, z:  10 },
  { id: 'rca-bfp-skr-2024',    label: 'RCA · Sakra-1 BFP · 2024-11',    layer: 'L3', x:  15, y: -30, z:  10 },
  { id: 'rca-bfp-banyan-2024', label: 'RCA · Banyan BFP · 2024-05',     layer: 'L3', x:  45, y: -30, z:  10 },
  { id: 'casing-rca-jrg-2023', label: 'RCA · Jurong-2 BFP casing · 2023-08', layer: 'L3', x:  30, y: -30, z:  -10 },
  { id: 'wo-log-47',           label: 'WO log · 47 prior',              layer: 'L3', x:  60, y: -30, z:   0 },
  { id: 'pi-18mo',             label: 'PI · 18mo telemetry',            layer: 'L3', x: -15, y: -30, z: -30 },
  { id: 'audit-iso50001',      label: 'Audit · ISO 50001',              layer: 'L3', x:  15, y: -30, z: -30 },

  // L4 Predictive Intelligence (pink) — y = -90
  { id: 'bearing-spalling-pattern',  label: 'Pattern · NDE bearing race spalling', layer: 'L4', x: -45, y: -90, z:   0 },
  { id: 'pump-casing-crack-pattern', label: 'Pattern · pump casing crack',         layer: 'L4', x: -15, y: -90, z:  20 },
  { id: 'iso-10816-7-spec',          label: 'Spec · ISO 10816-7 alarm zones',      layer: 'L4', x:  15, y: -90, z:   0 },
  { id: 'bfp-derate-cascade-model',  label: 'Model · BFP→HRSG→ST derate cascade',  layer: 'L4', x:  45, y: -90, z:  20 },
  { id: 'pred-mw-derate',            label: 'Predictor · MW derate',               layer: 'L4', x:  60, y: -90, z: -10 },
  { id: 'rec-oem-playbook',          label: 'Recommender · OEM playbook',          layer: 'L4', x: -30, y: -90, z: -30 },
];

// W14 R3 — 8-layer palette · 8 distinct hues. People+Process split → L1 Org / L2 SOPs.
const KG_LAYER_COLORS = {
  L1: '#10B981',  // emerald     — Org Structure (people)
  L2: '#3B82F6',  // royal blue  — SOPs
  L3: '#F59E0B',  // amber       — Plant & Equipment
  L4: '#DC2626',  // red         — Historical State
  L5: '#8B5CF6',  // purple      — Predictive Intelligence
  L6: '#06B6D4',  // cyan        — Markets
  L7: '#EC4899',  // pink        — Contracts
  L8: '#F97316',  // orange      — Cross-site Network
};

const KG_EDGES = [
  // L2 asset cascade (BFP-3A → HRSG-3 → ST-3 → Generator-3 → Transformer-3 → Switchyard-A)
  { source: 'bfp-3a', target: 'hrsg-3' },
  { source: 'gt-3', target: 'hrsg-3' },
  { source: 'hrsg-3', target: 'st-3' },
  { source: 'st-3', target: 'generator-3' },
  { source: 'generator-3', target: 'transformer-3' },
  { source: 'transformer-3', target: 'switchyard-a' },
  { source: 'hrsg-3', target: 'condenser-3' },
  { source: 'hrsg-3', target: 'bfp-3b' },

  // L2 sub-assembly + sensors on BFP-3A
  { source: 'vt-bfp-3a-nde-x', target: 'bfp-3a' },
  { source: 'vt-bfp-3a-nde-y', target: 'bfp-3a' },
  { source: 'vt-bfp-3a-de-x',  target: 'bfp-3a' },
  { source: 'vt-bfp-3a-de-y',  target: 'bfp-3a' },
  { source: 'bearing-bfp-3a-nde', target: 'bfp-3a' },
  { source: 'coupling-bfp-3a',    target: 'bfp-3a' },
  { source: 'shaft-bfp-3a',       target: 'bfp-3a' },
  { source: 'bfp-3a',             target: 'sulzer-bfp-manual' },

  // L2 → L3 history
  { source: 'bfp-3a', target: 'wo-log-47' },
  { source: 'bfp-3a', target: 'pi-18mo' },
  { source: 'vib-rms-90d', target: 'bfp-3a' },
  { source: 'bearing-temp-30d', target: 'bearing-bfp-3a-nde' },
  { source: 'audit-iso50001', target: 'bfp-3a' },

  // L3 RCA → L4 pattern
  { source: 'rca-bfp-jrg-2025',    target: 'bearing-spalling-pattern' },
  { source: 'rca-bfp-skr-2024',    target: 'bearing-spalling-pattern' },
  { source: 'rca-bfp-banyan-2024', target: 'bearing-spalling-pattern' },
  { source: 'vib-rms-90d',         target: 'bearing-spalling-pattern' },

  // L4 patterns → models / SOP
  { source: 'bearing-spalling-pattern', target: 'bfp-derate-cascade-model' },
  { source: 'bearing-spalling-pattern', target: 'sop-bfp-vibration-investigation' },
  { source: 'bfp-derate-cascade-model', target: 'pred-mw-derate' },
  { source: 'bearing-spalling-pattern', target: 'rec-oem-playbook' },
  { source: 'pump-casing-crack-pattern',       target: 'shaft-bfp-3a' },
  // W4.1 — pump casing crack narrative
  { source: 'casing-bfp-3a',            target: 'bfp-3a' },
  { source: 'casing-rca-jrg-2023',      target: 'pump-casing-crack-pattern' },
  { source: 'pump-casing-crack-pattern', target: 'sop-bfp-vibration-investigation' },

  // L4 standard → L2 sensors (ISO 10816-7 governs sensor alarm thresholds)
  { source: 'iso-10816-7-spec', target: 'vt-bfp-3a-nde-x' },
  { source: 'iso-10816-7-spec', target: 'vt-bfp-3a-nde-y' },
  { source: 'iso-10816-7-spec', target: 'vt-bfp-3a-de-x' },
  { source: 'iso-10816-7-spec', target: 'vt-bfp-3a-de-y' },

  // L1 persona → L2 asset + L4
  { source: 'r-kumar',         target: 'bfp-3a' },
  { source: 'lim-wei-jie',     target: 'bearing-bfp-3a-nde' },
  { source: 'dr-ismail',         target: 'pump-casing-crack-pattern' },
  { source: 'p-sundaram',      target: 'pred-mw-derate' },
  { source: 'bu-power-gen',    target: 'bfp-3a' },
  { source: 'raci-derate',     target: 'bfp-derate-cascade-model' },
  { source: 'esc-pso',         target: 'r-kumar' },
  { source: 'sop-bfp-vibration-investigation', target: 'bfp-3a' },
];

// ── Wave 3.4: tag canonical 30 nodes + 30 edges, append theater density ──
KG_NODES.forEach(n => { n.canonical = true; });
KG_EDGES.forEach(e => { e.canonical = true; });

// W14 R3 — 8-layer Y-band restripe. Top-down monotonic spacing 60 units per band.
// L1 Org Structure (people) top · L8 Cross-site Network bottom.
const LAYER_Y = {
  L1: 180,    // Org Structure (people)
  L2: 120,    // SOPs
  L3: 60,     // Plant & Equipment (assets · failure modes · manuals · telemetry)
  L4: 0,      // Historical State (work orders · RCA · history)
  L5: -60,    // Predictive Intelligence (patterns · models · tacit)
  L6: -120,   // Markets
  L7: -180,   // Contracts
  L8: -240,   // Cross-site Network
};

const KG_THEATER_NODES = [
  // L1 People & Process (additional roles)
  { id: 't-supervisor-onsite', label: 'Maint. Supervisor',  layer: 'L1', canonical: false },
  { id: 't-supervisor-shift',  label: 'Shift Supervisor',   layer: 'L1', canonical: false },
  { id: 't-trading-desk',      label: 'Trading Desk',       layer: 'L1', canonical: false },
  { id: 't-compliance',        label: 'Compliance Officer', layer: 'L1', canonical: false },
  { id: 't-vendor-liaison',    label: 'OEM Liaison',        layer: 'L1', canonical: false },
  { id: 't-procurement',       label: 'Procurement',        layer: 'L1', canonical: false },
  { id: 't-bu-renewables',     label: 'BU · Renewables',    layer: 'L1', canonical: false },
  { id: 't-bu-networks',       label: 'BU · Networks',      layer: 'L1', canonical: false },

  // L2 Plant & Equipment (sister blocks + sub-assemblies)
  { id: 't-gt-1',           label: 'GT-1',           layer: 'L2', canonical: false },
  { id: 't-gt-2',           label: 'GT-2',           layer: 'L2', canonical: false },
  { id: 't-hrsg-1',         label: 'HRSG-1',         layer: 'L2', canonical: false },
  { id: 't-hrsg-2',         label: 'HRSG-2',         layer: 'L2', canonical: false },
  { id: 't-bfp-1a',         label: 'BFP-1A',         layer: 'L2', canonical: false },
  { id: 't-bfp-1b',         label: 'BFP-1B',         layer: 'L2', canonical: false },
  { id: 't-bfp-2a',         label: 'BFP-2A',         layer: 'L2', canonical: false },
  { id: 't-bfp-2b',         label: 'BFP-2B',         layer: 'L2', canonical: false },
  { id: 't-condenser-1',    label: 'Condenser-1',    layer: 'L2', canonical: false },
  { id: 't-condenser-2',    label: 'Condenser-2',    layer: 'L2', canonical: false },
  { id: 't-gas-vlv-1',      label: 'Fuel Gas Valve', layer: 'L2', canonical: false },
  { id: 't-cooling-tower',  label: 'Cooling Tower',  layer: 'L2', canonical: false },
  { id: 't-stack',          label: 'Exhaust Stack',  layer: 'L2', canonical: false },
  { id: 't-instr-pi-tags',  label: 'PI Tag Cluster', layer: 'L2', canonical: false },

  // L3 Historical State
  { id: 't-outage-2025-q3', label: 'Outage · 2025 Q3',            layer: 'L3', canonical: false },
  { id: 't-outage-2024-q2', label: 'Outage · 2024 Q2',            layer: 'L3', canonical: false },
  { id: 't-sb-ge-001',      label: 'GE Service Bulletin 9HA-001', layer: 'L3', canonical: false },
  { id: 't-sb-ge-014',      label: 'GE Service Bulletin 9HA-014', layer: 'L3', canonical: false },
  { id: 't-calib-log',      label: 'Calibration log',             layer: 'L3', canonical: false },
  { id: 't-hse-incidents',  label: 'HSE incident log',            layer: 'L3', canonical: false },
  { id: 't-ops-shift-notes',label: 'Ops shift notes',             layer: 'L3', canonical: false },
  { id: 't-wo-2025',        label: 'WO archive · 2025',           layer: 'L3', canonical: false },
  { id: 't-emissions-cert', label: 'NEA emissions cert',          layer: 'L3', canonical: false },
  { id: 't-iec-61850',      label: 'IEC 61850 audit',             layer: 'L3', canonical: false },

  // L4 Predictive Intelligence
  { id: 't-mdl-plant-mw',   label: 'Plant-wide MW model',              layer: 'L4', canonical: false },
  { id: 't-mdl-demand',     label: 'Singapore demand curve',           layer: 'L4', canonical: false },
  { id: 't-mdl-retail',     label: 'Retail price model',               layer: 'L4', canonical: false },
  { id: 't-mdl-heat-rate',  label: 'Heat rate degradation model',      layer: 'L4', canonical: false },
  { id: 't-mdl-emissions',  label: 'Emissions prediction',             layer: 'L4', canonical: false },
  { id: 't-mdl-startup',    label: 'Cold start ROI model',             layer: 'L4', canonical: false },
  { id: 't-rec-spares',     label: 'Spares replenishment recommender', layer: 'L4', canonical: false },
  { id: 't-pred-trip-prob', label: 'Forced trip probability',          layer: 'L4', canonical: false },
  { id: 't-rec-shutdown',   label: 'Planned shutdown optimizer',       layer: 'L4', canonical: false },
  // W3.9 — moved from canonical to theater (GT-side OEM ref + wash ROI)
  { id: 'oem-ge-9ha-manual',label: 'OEM · GE 9HA manual',              layer: 'L2', canonical: false },
  { id: 'roi-wash',         label: 'ROI · wash-cycle',                 layer: 'L4', canonical: false },
];

// Pin Y per layer for theater nodes (free X/Z)
KG_THEATER_NODES.forEach(n => { n.y = LAYER_Y[n.layer]; });

KG_NODES.push(...KG_THEATER_NODES);

const KG_THEATER_EDGES = [
  // L1 intra
  { source: 't-supervisor-onsite', target: 'lim-wei-jie',       canonical: false },
  { source: 't-supervisor-shift',  target: 'r-kumar',           canonical: false },
  { source: 't-trading-desk',      target: 'p-sundaram',        canonical: false },
  { source: 't-compliance',        target: 't-bu-renewables',   canonical: false },
  { source: 't-vendor-liaison',    target: 'oem-ge-9ha-manual', canonical: false },
  { source: 't-procurement',       target: 't-vendor-liaison',  canonical: false },
  { source: 't-bu-renewables',     target: 'bu-power-gen',      canonical: false },
  { source: 't-bu-networks',       target: 't-bu-renewables',   canonical: false },

  // L2 intra (sister-block asset chains)
  { source: 't-gt-1',       target: 't-hrsg-1',      canonical: false },
  { source: 't-hrsg-1',     target: 't-bfp-1a',      canonical: false },
  { source: 't-hrsg-1',     target: 't-bfp-1b',      canonical: false },
  { source: 't-hrsg-1',     target: 't-condenser-1', canonical: false },
  { source: 't-gt-2',       target: 't-hrsg-2',      canonical: false },
  { source: 't-hrsg-2',     target: 't-bfp-2a',      canonical: false },
  { source: 't-hrsg-2',     target: 't-bfp-2b',      canonical: false },
  { source: 't-hrsg-2',     target: 't-condenser-2', canonical: false },
  { source: 'gt-3',         target: 't-gas-vlv-1',   canonical: false },
  { source: 'gt-3',         target: 't-stack',       canonical: false },
  { source: 'gt-3',         target: 't-instr-pi-tags', canonical: false },
  { source: 'condenser-3',  target: 't-cooling-tower', canonical: false },
  { source: 't-condenser-1',target: 't-cooling-tower', canonical: false },
  { source: 't-condenser-2',target: 't-cooling-tower', canonical: false },

  // L2 cross-block sibling links
  { source: 'gt-3',   target: 't-gt-1', canonical: false },
  { source: 'gt-3',   target: 't-gt-2', canonical: false },
  { source: 't-gt-1', target: 't-gt-2', canonical: false },

  // L3 intra
  { source: 't-outage-2025-q3', target: 't-outage-2024-q2',   canonical: false },
  { source: 't-sb-ge-001',      target: 'oem-ge-9ha-manual',  canonical: false },
  { source: 't-sb-ge-014',      target: 'oem-ge-9ha-manual',  canonical: false },
  { source: 't-sb-ge-014',      target: 'pump-casing-crack-pattern', canonical: false },
  { source: 't-calib-log',      target: 't-instr-pi-tags',    canonical: false },
  { source: 't-hse-incidents',  target: 'audit-iso50001',     canonical: false },
  { source: 't-ops-shift-notes',target: 'r-kumar',            canonical: false },
  { source: 't-wo-2025',        target: 'wo-log-47',          canonical: false },
  { source: 't-emissions-cert', target: 'audit-iso50001',     canonical: false },
  { source: 't-iec-61850',      target: 'switchyard-a',       canonical: false },

  // L4 intra + cross-links
  { source: 't-mdl-plant-mw',   target: 'pred-mw-derate',   canonical: false },
  { source: 't-mdl-demand',     target: 't-mdl-plant-mw',   canonical: false },
  { source: 't-mdl-retail',     target: 't-trading-desk',   canonical: false },
  { source: 't-mdl-heat-rate',  target: 'bfp-derate-cascade-model', canonical: false },
  { source: 't-mdl-emissions',  target: 't-emissions-cert', canonical: false },
  { source: 't-mdl-startup',    target: 't-rec-shutdown',   canonical: false },
  { source: 't-rec-spares',     target: 't-procurement',    canonical: false },
  { source: 't-pred-trip-prob', target: 'bearing-spalling-pattern', canonical: false },
  { source: 't-pred-trip-prob', target: 'pump-casing-crack-pattern',       canonical: false },
  { source: 't-rec-shutdown',   target: 'roi-wash',         canonical: false },

  // Cross-layer L1 → L2
  { source: 't-supervisor-onsite', target: 'gt-3',            canonical: false },
  { source: 't-supervisor-shift',  target: 't-instr-pi-tags', canonical: false },
  { source: 't-vendor-liaison',    target: 'gt-3',            canonical: false },
  { source: 't-procurement',       target: 't-bfp-2a',        canonical: false },

  // Cross-layer L2 → L3
  { source: 't-gt-1',   target: 't-outage-2025-q3', canonical: false },
  { source: 't-gt-2',   target: 't-outage-2024-q2', canonical: false },
  { source: 't-hrsg-1', target: 't-wo-2025',        canonical: false },

  // Cross-layer L3 → L4
  { source: 't-outage-2025-q3', target: 't-mdl-plant-mw',   canonical: false },
  { source: 't-sb-ge-014',      target: 't-pred-trip-prob', canonical: false },

  // Cross-layer L4 → L1
  { source: 't-rec-spares',     target: 'p-sundaram',     canonical: false },
  { source: 'rec-oem-playbook', target: 't-vendor-liaison', canonical: false },
];

KG_EDGES.push(...KG_THEATER_EDGES);

const KG_STATE = {
  graph: null,
  activeChain: new Set(),
  pinnedChain: new Set(),
  autoRotateTimer: null,
  layerTitles: [],
  newlyAddedNodes: new Set(),   // W6 — green halo on freshly-grown nodes
};

// ── W7 — Bigger KG: Tacit Knowledge cluster + KG Auditor/Updater cluster ──
// 3-tier visual separation along X: main KG (-100..+100) → Auditor cluster (180..260) → Tacit Knowledge cluster (340..420)
// Nodes present from cold load; triggerKGGrowth flashes green halo on tacit cluster 10s post-click.
const KG_TACIT_NODES = [
  { id: 'casing-tacit-knowledge',         label: 'Tacit knowledge · BFP casing fatigue pattern', layer: 'L4', x: 360, y: -90, z:  30, canonical: false, isNew: true, cluster: 'tacit' },
  { id: 'ismail-field-experience-2023',     label: 'Field experience · Ismail · Jurong BFP 2023',    layer: 'L3', x: 380, y: -30, z:  10, canonical: false, isNew: true, cluster: 'tacit' },
  { id: 'bfp-casing-inspection-protocol', label: 'Updated SOP · BFP casing weld inspection',     layer: 'L1', x: 400, y:  90, z: -20, canonical: false, isNew: true, cluster: 'tacit' },
];
const KG_AUDITOR_NODES = [
  { id: 'kg-auditor-agent',      label: 'KG Auditor Agent · validates new nodes',    layer: 'L1', x: 200, y:  90, z:   0, canonical: false, cluster: 'auditor' },
  { id: 'kg-updater-agent',      label: 'KG Updater Agent · re-wires graph',         layer: 'L4', x: 230, y: -90, z:   0, canonical: false, cluster: 'auditor' },
  { id: 'workflow-rewire-agent', label: 'Workflow Re-wire Agent · SOP updates',      layer: 'L1', x: 240, y:  90, z: -40, canonical: false, cluster: 'auditor' },
];
KG_NODES.push(...KG_TACIT_NODES, ...KG_AUDITOR_NODES);

// W7 cluster-flow edges: tacit → auditor (3) · auditor → main KG (3) · auditor internal cohesion (1)
const KG_CLUSTER_FLOW_EDGES = [
  { source: 'casing-tacit-knowledge',         target: 'kg-auditor-agent',      canonical: false, cluster: 'tk-to-auditor' },
  { source: 'ismail-field-experience-2023',     target: 'kg-auditor-agent',      canonical: false, cluster: 'tk-to-auditor' },
  { source: 'bfp-casing-inspection-protocol', target: 'workflow-rewire-agent', canonical: false, cluster: 'tk-to-auditor' },
  { source: 'kg-auditor-agent',               target: 'pump-casing-crack-pattern',          canonical: false, cluster: 'auditor-to-main' },
  { source: 'kg-updater-agent',               target: 'casing-rca-jrg-2023',                canonical: false, cluster: 'auditor-to-main' },
  { source: 'workflow-rewire-agent',          target: 'sop-bfp-vibration-investigation',    canonical: false, cluster: 'auditor-to-main' },
  { source: 'kg-auditor-agent',               target: 'kg-updater-agent',                   canonical: false, cluster: 'auditor-internal' },
];
KG_EDGES.push(...KG_CLUSTER_FLOW_EDGES);

// Tacit cluster node IDs flashed (green halo) 10s after Lim diagnosis-confirmed click — W6 behavior preserved.
const KG_GROWTH_NODE_IDS = KG_TACIT_NODES.map(n => n.id);

// ── W10 Section I — Tacit-KG Staging cluster (4-tier flow) ──
// Tacit bytes (raw from Lim ↔ Ismail call) → Knowledge Triage Agent → Process Engineering Review Agent
// → promoted bytes route up to W7 tacit cluster (knowledge stratum).
// 4-tier visual: main KG (-100..+100) → Auditor (180..260) → W7 Tacit (340..420) → Staging (500..600).
const KG_STAGING_NODES = [
  // 5 tacit bytes — diamond glyph, 3 promoted green / 2 unpromoted amber
  { id: 'tacit-byte-1', label: 'Byte · "casing weld pattern matches Jurong 2023"', layer: 'L4', x: 520, y:  60, z:  10, canonical: false, cluster: 'staging', isStaging: true, isPromoted: true },
  { id: 'tacit-byte-2', label: 'Byte · "always check 4-o\'clock volute first"',     layer: 'L4', x: 540, y:  30, z: -20, canonical: false, cluster: 'staging', isStaging: true, isPromoted: true },
  { id: 'tacit-byte-3', label: 'Byte · "Sulzer-specific failure mode"',              layer: 'L4', x: 560, y:   0, z:  20, canonical: false, cluster: 'staging', isStaging: true, isPromoted: true },
  { id: 'tacit-byte-4', label: 'Byte · "Ismail mentioned similar case in Banyan"',     layer: 'L4', x: 520, y: -30, z: -10, canonical: false, cluster: 'staging', isStaging: true, isPromoted: false },
  { id: 'tacit-byte-5', label: 'Byte · "casual aside · vendor service rep visit"',   layer: 'L4', x: 540, y: -60, z:  30, canonical: false, cluster: 'staging', isStaging: true, isPromoted: false },
  // 2 staging agents — gateway + promoter (blue halo, mirroring auditor cluster)
  { id: 'knowledge-triage-agent',           label: 'Knowledge Triage Agent',           layer: 'L1', x: 580, y:  20, z: 0, canonical: false, cluster: 'staging', isStagingAgent: true },
  { id: 'process-engineering-review-agent', label: 'Process Engineering Review Agent', layer: 'L1', x: 600, y: -20, z: 0, canonical: false, cluster: 'staging', isStagingAgent: true },
];
KG_NODES.push(...KG_STAGING_NODES);

// W10 staging-cluster edges: bytes → triage → review → promoted bytes → W7 tacit cluster
const KG_STAGING_EDGES = [
  // All 5 bytes feed into triage agent
  { source: 'tacit-byte-1', target: 'knowledge-triage-agent', canonical: false, cluster: 'staging-byte-to-triage' },
  { source: 'tacit-byte-2', target: 'knowledge-triage-agent', canonical: false, cluster: 'staging-byte-to-triage' },
  { source: 'tacit-byte-3', target: 'knowledge-triage-agent', canonical: false, cluster: 'staging-byte-to-triage' },
  { source: 'tacit-byte-4', target: 'knowledge-triage-agent', canonical: false, cluster: 'staging-byte-to-triage' },
  { source: 'tacit-byte-5', target: 'knowledge-triage-agent', canonical: false, cluster: 'staging-byte-to-triage' },
  // Triage hands curated bytes to review agent
  { source: 'knowledge-triage-agent', target: 'process-engineering-review-agent', canonical: false, cluster: 'staging-internal' },
  // Review promotes 3 of 5 — promotion edges (thicker green + flow particles)
  { source: 'process-engineering-review-agent', target: 'tacit-byte-1', canonical: false, cluster: 'staging-promotion', isPromotionEdge: true },
  { source: 'process-engineering-review-agent', target: 'tacit-byte-2', canonical: false, cluster: 'staging-promotion', isPromotionEdge: true },
  { source: 'process-engineering-review-agent', target: 'tacit-byte-3', canonical: false, cluster: 'staging-promotion', isPromotionEdge: true },
  // Promoted bytes link UP to W7 tacit cluster nodes (knowledge stratum)
  { source: 'tacit-byte-1', target: 'casing-tacit-knowledge',     canonical: false, cluster: 'staging-to-tacit', isPromotionEdge: true },
  { source: 'tacit-byte-2', target: 'casing-tacit-knowledge',     canonical: false, cluster: 'staging-to-tacit', isPromotionEdge: true },
  { source: 'tacit-byte-3', target: 'ismail-field-experience-2023', canonical: false, cluster: 'staging-to-tacit', isPromotionEdge: true },
];
KG_EDGES.push(...KG_STAGING_EDGES);

// Promoted byte IDs — green halo flash on P2 KG open
const KG_STAGING_PROMOTED_IDS = KG_STAGING_NODES.filter(n => n.isPromoted).map(n => n.id);

// ── W10 Section K — Commercial intelligence cluster (P3 Priya · trader-domain KG extension) ──
// 5-tier visual: + Commercial (x ∈ [700, 820]). Connects via bfp-3a → merchant-market-sg bridge.
// W11 Section I — relayered across L5 (Markets) / L6 (Contracts) / L7 (Cross-site Network)
const KG_COMMERCIAL_NODES = [
  // L5 — Markets (W12 Section C: densified 3 → 8)
  { id: 'merchant-market-sg',         label: 'Merchant market · USEP · Singapore',   layer: 'L5', x: 710, y: LAYER_Y.L5, z:  20, canonical: false, cluster: 'commercial' },
  { id: 'supply-curve-singapore',     label: 'Supply curve · Singapore · Q3-2026',   layer: 'L5', x: 750, y: LAYER_Y.L5, z:   0, canonical: false, cluster: 'commercial' },
  { id: 'demand-forecast-q3-2026',    label: 'Demand forecast · Q3-2026',            layer: 'L5', x: 790, y: LAYER_Y.L5, z: -20, canonical: false, cluster: 'commercial' },
  { id: 'usep-30min-clearing',        label: 'USEP · 30-min clearing price',         layer: 'L5', x: 720, y: LAYER_Y.L5, z:  40, canonical: false, cluster: 'commercial' },
  { id: 'lng-spot-index-asia',        label: 'LNG spot index · Asia JKM',            layer: 'L5', x: 740, y: LAYER_Y.L5, z:  30, canonical: false, cluster: 'commercial' },
  { id: 'carbon-credit-corsia',       label: 'Carbon credit · CORSIA',               layer: 'L5', x: 770, y: LAYER_Y.L5, z:  10, canonical: false, cluster: 'commercial' },
  { id: 'weather-temp-forecast-sg',   label: 'Weather · temp forecast SG · 7-day',   layer: 'L5', x: 800, y: LAYER_Y.L5, z: -10, canonical: false, cluster: 'commercial' },
  { id: 'gas-pipeline-utilization',   label: 'Gas pipeline · MY-SG utilization',     layer: 'L5', x: 760, y: LAYER_Y.L5, z: -30, canonical: false, cluster: 'commercial' },

  // L6 — Contracts (W12 Section C: densified 2 → 7)
  { id: 'ppa-pso-2026',               label: 'PPA · PSO commitment · 2026',          layer: 'L6', x: 720, y: LAYER_Y.L6, z:  15, canonical: false, cluster: 'commercial' },
  { id: 'hedge-instrument-catalog',   label: 'Hedge instrument catalog',             layer: 'L6', x: 780, y: LAYER_Y.L6, z: -15, canonical: false, cluster: 'commercial' },
  { id: 'pso-bilateral-2024-sembcorp', label: 'PSO bilateral · 2024-Sembcorp',       layer: 'L6', x: 700, y: LAYER_Y.L6, z:  30, canonical: false, cluster: 'commercial' },
  { id: 'industrial-customer-ccaa',   label: 'Industrial customer · CCAA-2026',      layer: 'L6', x: 740, y: LAYER_Y.L6, z:   0, canonical: false, cluster: 'commercial' },
  { id: 'futures-sgd-monthly',        label: 'Futures · SGD-monthly · Jul-26',       layer: 'L6', x: 760, y: LAYER_Y.L6, z: -30, canonical: false, cluster: 'commercial' },
  { id: 'vesting-contract-ema',       label: 'Vesting contract · EMA',               layer: 'L6', x: 800, y: LAYER_Y.L6, z:  10, canonical: false, cluster: 'commercial' },
  { id: 'ancillary-services-contract', label: 'Ancillary services · 2026',           layer: 'L6', x: 810, y: LAYER_Y.L6, z: -10, canonical: false, cluster: 'commercial' },

  // L7 — Cross-site Network (W12 Section C: densified 2 → 8)
  { id: 'cross-site-sakra-availability', label: 'Cross-site · Sakra-CCGT-1 standby', layer: 'L7', x: 720, y: LAYER_Y.L7, z:  10, canonical: false, cluster: 'commercial' },
  { id: 'cross-site-tuas-availability',  label: 'Cross-site · Tuas-Power available', layer: 'L7', x: 780, y: LAYER_Y.L7, z: -10, canonical: false, cluster: 'commercial' },
  { id: 'banyan-chp-availability',    label: 'Banyan-CHP · availability',            layer: 'L7', x: 700, y: LAYER_Y.L7, z:  30, canonical: false, cluster: 'commercial' },
  { id: 'tuas-power-spinning-reserve', label: 'Tuas-Power · spinning reserve',       layer: 'L7', x: 730, y: LAYER_Y.L7, z: -20, canonical: false, cluster: 'commercial' },
  { id: 'transmission-275kv-ehv',     label: 'Transmission · 275kV EHV',             layer: 'L7', x: 760, y: LAYER_Y.L7, z:  20, canonical: false, cluster: 'commercial' },
  { id: 'interconnector-malaysia',    label: 'Interconnector · Malaysia',            layer: 'L7', x: 790, y: LAYER_Y.L7, z:  30, canonical: false, cluster: 'commercial' },
  { id: 'grid-frequency-50hz',        label: 'Grid frequency · 50 Hz status',        layer: 'L7', x: 810, y: LAYER_Y.L7, z:   0, canonical: false, cluster: 'commercial' },
  { id: 'sakra-cogen-standby',        label: 'Sakra-Cogen · standby state',          layer: 'L7', x: 750, y: LAYER_Y.L7, z: -30, canonical: false, cluster: 'commercial' },
];
KG_NODES.push(...KG_COMMERCIAL_NODES);

const KG_COMMERCIAL_EDGES = [
  // Bridge: main KG (bfp-3a asset chain) → commercial intelligence
  { source: 'bfp-3a',                       target: 'merchant-market-sg',           canonical: false, cluster: 'main-to-commercial' },
  // Commercial-internal flow
  { source: 'merchant-market-sg',           target: 'supply-curve-singapore',       canonical: false, cluster: 'commercial-internal' },
  { source: 'supply-curve-singapore',       target: 'demand-forecast-q3-2026',      canonical: false, cluster: 'commercial-internal' },
  { source: 'demand-forecast-q3-2026',      target: 'hedge-instrument-catalog',     canonical: false, cluster: 'commercial-internal' },
  { source: 'ppa-pso-2026',                 target: 'cross-site-sakra-availability', canonical: false, cluster: 'commercial-internal' },
  { source: 'ppa-pso-2026',                 target: 'cross-site-tuas-availability',  canonical: false, cluster: 'commercial-internal' },
  { source: 'cross-site-sakra-availability', target: 'hedge-instrument-catalog',     canonical: false, cluster: 'commercial-internal' },
  // W12 Section C.4 — new inter/intra-layer edges for densified L5/L6/L7
  { source: 'usep-30min-clearing',         target: 'merchant-market-sg',     canonical: false, cluster: 'commercial-internal' },
  { source: 'lng-spot-index-asia',         target: 'usep-30min-clearing',    canonical: false, cluster: 'commercial-internal' },
  { source: 'gas-pipeline-utilization',    target: 'lng-spot-index-asia',    canonical: false, cluster: 'commercial-internal' },
  { source: 'pso-bilateral-2024-sembcorp', target: 'usep-30min-clearing',    canonical: false, cluster: 'commercial-internal' },
  { source: 'futures-sgd-monthly',         target: 'hedge-instrument-catalog', canonical: false, cluster: 'commercial-internal' },
  { source: 'banyan-chp-availability',     target: 'ppa-pso-2026',           canonical: false, cluster: 'commercial-internal' },
  { source: 'interconnector-malaysia',     target: 'grid-frequency-50hz',    canonical: false, cluster: 'commercial-internal' },
  { source: 'transmission-275kv-ehv',      target: 'sakra-cogen-standby',    canonical: false, cluster: 'commercial-internal' },
  // Cross-cluster bridge: L4 predictive → L5 markets
  { source: 'pump-casing-crack-pattern',   target: 'demand-forecast-q3-2026', canonical: false, cluster: 'main-to-commercial' },
];
KG_EDGES.push(...KG_COMMERCIAL_EDGES);

const KG_COMMERCIAL_IDS = KG_COMMERCIAL_NODES.map(n => n.id);

// ── W14 R3 — Section C — additional L3 semantic nodes per Pulkit semantic split ──
// Plant & Equipment gains failure-mode + telemetry stratum (existing manuals stay in L3).
const KG_W14R3_L3_NODES = [
  { id: 'failure-mode-race-spalling', label: 'Failure mode · NDE bearing race spalling', layer: 'L3', x:  85, y: 0, z:  30, canonical: false, cluster: 'w14r3-l3' },
  { id: 'failure-mode-casing-crack',  label: 'Failure mode · casing hairline crack',     layer: 'L3', x:  92, y: 0, z:  12, canonical: false, cluster: 'w14r3-l3' },
  { id: 'failure-mode-misalignment',  label: 'Failure mode · shaft misalignment',        layer: 'L3', x:  72, y: 0, z: -12, canonical: false, cluster: 'w14r3-l3' },
  { id: 'failure-mode-imbalance',     label: 'Failure mode · impeller imbalance',        layer: 'L3', x:  52, y: 0, z: -30, canonical: false, cluster: 'w14r3-l3' },
  { id: 'failure-mode-bent-shaft',    label: 'Failure mode · bent shaft (1×RPM dominant)', layer: 'L3', x: 40, y: 0, z:  -8, canonical: false, cluster: 'w14r3-l3' },
  { id: 'telemetry-vib-rms-nde',      label: 'Telemetry · vibration RMS · NDE housing',  layer: 'L3', x: -75, y: 0, z:  40, canonical: false, cluster: 'w14r3-l3' },
  { id: 'telemetry-vib-phase-1xrpm',  label: 'Telemetry · vibration phase · 1×RPM',      layer: 'L3', x: -85, y: 0, z:  25, canonical: false, cluster: 'w14r3-l3' },
  { id: 'telemetry-bearing-temp-live',label: 'Telemetry · NDE bearing temp · live',      layer: 'L3', x: -68, y: 0, z: -22, canonical: false, cluster: 'w14r3-l3' },
];
KG_NODES.push(...KG_W14R3_L3_NODES);

// W14 R3 — Section C — central layer remap. Single pass after all node pushes.
// Old: L1 People+Process · L2 Physical · L3 Historical · L4 Predictive · L5 Markets · L6 Contracts · L7 Cross-site.
// New: L1 Org · L2 SOPs · L3 Physical · L4 Historical · L5 Predictive · L6 Markets · L7 Contracts · L8 Cross-site.
// SOP-flavored nodes split out of old L1 → new L2 via SOP_IDS list.
const W14R3_LAYER_REMAP = { L1: 'L1', L2: 'L3', L3: 'L4', L4: 'L5', L5: 'L6', L6: 'L7', L7: 'L8' };
const W14R3_SOP_IDS = new Set([
  'sop-bfp-vibration-investigation',
  'raci-derate',
  'esc-pso',
  'bfp-casing-inspection-protocol',
]);
const W14R3_NEW_NODE_IDS = new Set(KG_W14R3_L3_NODES.map(n => n.id));
KG_NODES.forEach(n => {
  if (W14R3_NEW_NODE_IDS.has(n.id)) return; // already in new scheme
  n.layer = W14R3_SOP_IDS.has(n.id) ? 'L2' : (W14R3_LAYER_REMAP[n.layer] || n.layer);
  if (!n.isStaging) n.y = LAYER_Y[n.layer];
});

// Label refinements per Pulkit spec (Section C.3 — clearer Sembcorp-canonical naming).
const W14R3_LABEL_OVERRIDES = {
  'bearing-bfp-3a-nde':   'BFP-3A · NDE bearing (SKF)',
  'casing-bfp-3a':        'BFP-3A · pump casing (Sulzer)',
  'sulzer-bfp-manual':    'Manual · Sulzer BFP-3A maintenance',
  'oem-ge-9ha-manual':    'Manual · GE 9HA gas turbine',
  'iso-10816-7-spec':     'Standard · ISO 10816-7 alarm zones',
  'vib-rms-90d':          'History · BFP-3A 90d vibration RMS',
  'bearing-temp-30d':     'History · NDE bearing 30d temp',
};
KG_NODES.forEach(n => {
  if (W14R3_LABEL_OVERRIDES[n.id]) n.label = W14R3_LABEL_OVERRIDES[n.id];
});

// W14 R3 — Section E — tacit-byte label simplification per Pulkit explicit:
// "tacit bite, just call it tacit bite and say ingested or triaged. Nothing else needs to be there."
// Promoted = triaged (post Process-Engineering-Review). Unpromoted = ingested (raw staging).
KG_NODES.forEach(n => {
  if (n.isStaging && !n.isStagingAgent) {
    n.state = n.isPromoted ? 'triaged' : 'ingested';
    n.label = `Tacit byte [${n.state}]`;
  }
});

// ── W14 R3 — Section D — connectivity edges ──
// (1) Bridge new L3 failure-mode + telemetry nodes to L3 assets + L4 historical + L5 predictive.
// (2) Fix 6 isolated commercial nodes from W12 densification (no edges → no visible connection).
const KG_W14R3_EDGES = [
  // Failure modes ← BFP-3A asset chain (L3 intra)
  { source: 'bfp-3a',                       target: 'failure-mode-race-spalling', canonical: false, cluster: 'w14r3-l3' },
  { source: 'bearing-bfp-3a-nde',           target: 'failure-mode-race-spalling', canonical: false, cluster: 'w14r3-l3' },
  { source: 'casing-bfp-3a',                target: 'failure-mode-casing-crack',  canonical: false, cluster: 'w14r3-l3' },
  { source: 'shaft-bfp-3a',                 target: 'failure-mode-misalignment',  canonical: false, cluster: 'w14r3-l3' },
  { source: 'shaft-bfp-3a',                 target: 'failure-mode-bent-shaft',    canonical: false, cluster: 'w14r3-l3' },
  { source: 'coupling-bfp-3a',              target: 'failure-mode-misalignment',  canonical: false, cluster: 'w14r3-l3' },
  { source: 'bfp-3a',                       target: 'failure-mode-imbalance',     canonical: false, cluster: 'w14r3-l3' },

  // Telemetry signals ← BFP-3A asset + vibration transducers
  { source: 'vt-bfp-3a-nde-x',              target: 'telemetry-vib-rms-nde',       canonical: false, cluster: 'w14r3-l3' },
  { source: 'vt-bfp-3a-nde-y',              target: 'telemetry-vib-rms-nde',       canonical: false, cluster: 'w14r3-l3' },
  { source: 'vt-bfp-3a-nde-x',              target: 'telemetry-vib-phase-1xrpm',   canonical: false, cluster: 'w14r3-l3' },
  { source: 'bearing-bfp-3a-nde',           target: 'telemetry-bearing-temp-live', canonical: false, cluster: 'w14r3-l3' },

  // Failure modes → L4 historical RCA evidence
  { source: 'failure-mode-race-spalling',   target: 'rca-bfp-jrg-2025',           canonical: false, cluster: 'w14r3-l3' },
  { source: 'failure-mode-race-spalling',   target: 'rca-bfp-skr-2024',           canonical: false, cluster: 'w14r3-l3' },
  { source: 'failure-mode-casing-crack',    target: 'casing-rca-jrg-2023',        canonical: false, cluster: 'w14r3-l3' },

  // Failure modes → L5 predictive patterns (bridge L3→L5)
  { source: 'failure-mode-race-spalling',   target: 'bearing-spalling-pattern',   canonical: false, cluster: 'w14r3-l3' },
  { source: 'failure-mode-casing-crack',    target: 'pump-casing-crack-pattern',  canonical: false, cluster: 'w14r3-l3' },
  { source: 'failure-mode-bent-shaft',      target: 'ismail-field-experience-2023', canonical: false, cluster: 'w14r3-l3' },

  // Telemetry → L4 history (sensor stream feeds 90d aggregates)
  { source: 'telemetry-vib-rms-nde',        target: 'vib-rms-90d',                canonical: false, cluster: 'w14r3-l3' },
  { source: 'telemetry-bearing-temp-live',  target: 'bearing-temp-30d',           canonical: false, cluster: 'w14r3-l3' },

  // Fix 6 isolated commercial nodes
  { source: 'carbon-credit-corsia',         target: 'merchant-market-sg',         canonical: false, cluster: 'w14r3-commercial-fix' },
  { source: 'weather-temp-forecast-sg',     target: 'demand-forecast-q3-2026',    canonical: false, cluster: 'w14r3-commercial-fix' },
  { source: 'industrial-customer-ccaa',     target: 'ppa-pso-2026',               canonical: false, cluster: 'w14r3-commercial-fix' },
  { source: 'vesting-contract-ema',         target: 'ppa-pso-2026',               canonical: false, cluster: 'w14r3-commercial-fix' },
  { source: 'ancillary-services-contract',  target: 'grid-frequency-50hz',        canonical: false, cluster: 'w14r3-commercial-fix' },
  { source: 'tuas-power-spinning-reserve',  target: 'cross-site-tuas-availability', canonical: false, cluster: 'w14r3-commercial-fix' },
];
KG_EDGES.push(...KG_W14R3_EDGES);

// ── W3.5: helpers for billboarded canvas-based sprites ──
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function buildNodeLabel(node) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontSize = 18;
  const padX = 12;
  const padY = 6;

  ctx.font = `600 ${fontSize}px ui-monospace, "SF Mono", monospace`;
  const textW = ctx.measureText(node.label).width;
  const canvasW = Math.ceil(textW + padX * 2);
  const canvasH = fontSize + padY * 2;

  canvas.width = canvasW;
  canvas.height = canvasH;
  ctx.font = `600 ${fontSize}px ui-monospace, "SF Mono", monospace`;

  ctx.fillStyle = 'rgba(10,15,28,0.78)';
  roundRect(ctx, 0, 0, canvasW, canvasH, 8);
  ctx.fill();

  ctx.fillStyle = KG_LAYER_COLORS[node.layer];
  ctx.fillRect(0, 0, 4, canvasH);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.label, padX, canvasH / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvasW / 6, canvasH / 6, 1);
  sprite.position.set(15, 0, 0);
  sprite.renderOrder = 10;
  return sprite;
}

function buildLayerTitle(layerId, name, color, yPos) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const padX = 18;
  const padY = 10;
  const layerFontSize = 32;
  const nameFontSize = 18;
  const arrowFontSize = 28;

  ctx.font = `800 ${layerFontSize}px ui-monospace, "SF Mono", monospace`;
  const layerW = ctx.measureText(layerId).width;
  ctx.font = `600 ${nameFontSize}px ui-monospace, "SF Mono", monospace`;
  const nameW = ctx.measureText(name).width;
  ctx.font = `800 ${arrowFontSize}px ui-monospace, "SF Mono", monospace`;
  const arrowW = ctx.measureText('▸').width;
  const textW = Math.max(layerW, nameW);
  const canvasW = Math.ceil(textW + padX * 2 + arrowW + 12);
  const canvasH = layerFontSize + nameFontSize + padY * 3;

  canvas.width = canvasW;
  canvas.height = canvasH;

  ctx.fillStyle = 'rgba(10,15,28,0.92)';
  roundRect(ctx, 0, 0, canvasW, canvasH, 10);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 8, canvasH);

  ctx.font = `800 ${layerFontSize}px ui-monospace, "SF Mono", monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(layerId, padX, padY);

  ctx.font = `600 ${nameFontSize}px ui-monospace, "SF Mono", monospace`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name, padX, padY + layerFontSize + 4);

  ctx.font = `800 ${arrowFontSize}px ui-monospace, "SF Mono", monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('▸', canvasW - 8, canvasH / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvasW / 3.5, canvasH / 3.5, 1);
  sprite.position.set(-130, yPos, 0);
  sprite.renderOrder = 9;
  return sprite;
}

// W14 R3 — 8-layer names (extends W11 commercial layers, splits L1 People+Process).
const KG_LAYER_NAMES = {
  L1: 'Org Structure',
  L2: 'SOPs',
  L3: 'Plant & Equipment',
  L4: 'Historical State',
  L5: 'Predictive Intelligence',
  L6: 'Markets',
  L7: 'Contracts',
  L8: 'Cross-site Network',
};

function hexWithAlpha(hex, alpha) {
  const m = hex.replace('#', '').match(/.{2}/g);
  return `rgba(${parseInt(m[0], 16)},${parseInt(m[1], 16)},${parseInt(m[2], 16)},${alpha})`;
}

function fallbackToCSS() {
  const mount = document.getElementById('kg-3d-mount');
  const fallback = document.getElementById('kg-css-fallback');
  if (mount) mount.style.display = 'none';
  if (fallback) fallback.style.display = '';
}

function isInChain(id) {
  return KG_STATE.activeChain.has(id) || KG_STATE.pinnedChain.has(id);
}
function anyChainActive() {
  return KG_STATE.activeChain.size > 0 || KG_STATE.pinnedChain.size > 0;
}

function nodeOpacityFor(node) {
  if (isInChain(node.id)) return 1.0;
  if (anyChainActive()) return 0.20;
  return node.canonical ? 0.90 : 0.65;
}

function chainContainsLink(link) {
  const s = link.source.id || link.source;
  const t = link.target.id || link.target;
  const inActive = KG_STATE.activeChain.has(s) && KG_STATE.activeChain.has(t);
  const inPinned = KG_STATE.pinnedChain.has(s) && KG_STATE.pinnedChain.has(t);
  return inActive || inPinned;
}

function startAutoRotate() {
  if (!KG_STATE.graph) return;
  if (KG_STATE.autoRotateTimer) return;
  let angle = KG_STATE.lastAngle || 0;
  // W7 — orbit center shifted to x=200 to fit 3-tier KG (main + auditor + tacit clusters)
  const orbitCenter = { x: 200, y: 0, z: 0 };
  KG_STATE.autoRotateTimer = setInterval(() => {
    angle += 0.003;  // gentle spin
    KG_STATE.lastAngle = angle;
    const cam = KG_STATE.graph.camera();
    const dx = cam.position.x - orbitCenter.x;
    const dz = cam.position.z - orbitCenter.z;
    const radiusXZ = Math.sqrt(dx * dx + dz * dz) || 480;
    const currentY = cam.position.y;
    KG_STATE.graph.cameraPosition({
      x: orbitCenter.x + radiusXZ * Math.sin(angle),
      y: currentY,
      z: orbitCenter.z + radiusXZ * Math.cos(angle),
    }, orbitCenter, 0);
  }, 40);
}

function stopAutoRotate() {
  if (KG_STATE.autoRotateTimer) {
    clearInterval(KG_STATE.autoRotateTimer);
    KG_STATE.autoRotateTimer = null;
  }
}

function refreshKGStyles() {
  if (!KG_STATE.graph) return;
  // Re-trigger node + link accessors to repaint chain highlight state.
  // nodeThreeObject rebuilds the per-node Group; link accessors repaint edges.
  KG_STATE.graph
    .nodeThreeObject(KG_STATE.graph.nodeThreeObject())
    .linkColor(KG_STATE.graph.linkColor())
    .linkWidth(KG_STATE.graph.linkWidth());
}

function initKG3D() {
  const mount = document.getElementById('kg-3d-mount');
  if (!mount) return;

  if (typeof ForceGraph3D === 'undefined' || typeof THREE === 'undefined') {
    console.warn('[KG] three.js or 3d-force-graph failed to load. Falling back to CSS scaffold.');
    fallbackToCSS();
    return;
  }

  try {
    // Pin Y per layer — 3d-force-graph respects fy on node data
    const nodes = KG_NODES.map(n => ({ ...n, fy: n.y }));

    const graph = ForceGraph3D()(mount)
      .graphData({ nodes, links: KG_EDGES })
      .nodeId('id')
      .nodeLabel(node => `<div style="background:#0A0F1C;color:#fff;padding:5px 9px;border:1px solid rgba(255,255,255,0.35);border-radius:4px;font-size:11px;font-family:'SF Mono',monospace;white-space:nowrap;"><strong>${node.label}</strong><br><span style="color:${KG_LAYER_COLORS[node.layer]};font-weight:700;font-size:9.5px;letter-spacing:.1em;">${node.layer}</span></div>`)
      .nodeThreeObject(node => {
        const radius = isInChain(node.id) ? 14 : 9;
        const group = new THREE.Group();
        // W10 — tacit-byte nodes (staging cluster, NOT agent) render as diamond (octahedron)
        const isTacitByte = node.cluster === 'staging' && node.isStaging && !node.isStagingAgent;
        const sphereGeo = isTacitByte
          ? new THREE.OctahedronGeometry(radius * 1.05, 0)
          : new THREE.SphereGeometry(radius, 32, 20);
        // Unpromoted staging bytes = 60% opacity (less prominent)
        const baseOpacity = nodeOpacityFor(node);
        const stagingOpacityMul = (node.cluster === 'staging' && node.isStaging && !node.isPromoted) ? 0.6 : 1.0;
        const sphereMat = new THREE.MeshBasicMaterial({
          color: KG_LAYER_COLORS[node.layer],
          transparent: true,
          opacity: baseOpacity * stagingOpacityMul,
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        group.add(sphere);
        // W12 Section B.2 — uniform white thick halo across ALL nodes.
        // Newly-added (W6 KG growth) keeps green flash; everything else = white halo radius*1.18 opacity 0.95.
        // Per-cluster ring color logic (staging/auditor/tacit/commercial) DROPPED.
        const isNewlyAdded = KG_STATE.newlyAddedNodes && KG_STATE.newlyAddedNodes.has(node.id);
        const ringColor = isNewlyAdded ? 0x00A651 : 0xFFFFFF;
        const ringRadius = isNewlyAdded ? radius * 1.55 : radius * 1.18;
        const ringGeo = isTacitByte
          ? new THREE.OctahedronGeometry(ringRadius * 1.05, 0)
          : new THREE.SphereGeometry(ringRadius, 32, 20);
        const ringMat = new THREE.MeshBasicMaterial({
          color: ringColor,
          transparent: true,
          opacity: isNewlyAdded ? (baseOpacity * stagingOpacityMul) : 0.95,
          side: THREE.BackSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        group.add(ring);
        // W3.5: persistent billboarded label sprite to the right of the sphere
        const label = buildNodeLabel(node);
        group.add(label);
        return group;
      })
      .nodeThreeObjectExtend(false)
      // W15 — Solid colors (no rgba alpha) · linkOpacity owns attenuation · width bumped for projector legibility.
      // Drops W14 R3 double-attenuation (rgba 0.75 × opacity 0.85 = 0.64 effective).
      .linkColor(link => {
        if (chainContainsLink(link)) return '#FFFFFF';
        if (link.isPromotionEdge)    return '#00A651';
        return link.canonical ? '#94A3B8' : '#64748B';
      })
      .linkWidth(link => {
        if (chainContainsLink(link)) return 3.5;
        if (link.isPromotionEdge)    return 2.8;
        return link.canonical ? 2.0 : 1.5;
      })
      .linkDirectionalParticles(link => link.isPromotionEdge ? 3 : 0)
      .linkDirectionalParticleSpeed(0.008)
      .linkDirectionalParticleWidth(2.5)
      .linkDirectionalParticleColor(() => '#00A651')
      .linkOpacity(0.92)
      .backgroundColor('#0A0F1C')
      .showNavInfo(false)
      .enableNodeDrag(true)
      .width(mount.clientWidth || 460)
      .height(mount.clientHeight || 320)
      // W14 R3 — unwind W3.7 lock. Click node → stop autorotate + center camera.
      // Click empty background → resume autorotate (only if no active chain pinned).
      .onNodeClick(node => {
        stopAutoRotate();
        const dist = 100;
        const hyp = Math.hypot(node.x || 0, node.y || 0, node.z || 0) || 1;
        const ratio = 1 + dist / hyp;
        graph.cameraPosition(
          { x: (node.x || 0) * ratio, y: (node.y || 0) * ratio, z: (node.z || 0) * ratio },
          node,
          800
        );
      })
      .onBackgroundClick(() => {
        if (!anyChainActive()) startAutoRotate();
      });

    // Disable default y force (we pin Y via fy on node data)
    graph.d3Force('y', null);
    if (graph.d3Force('charge')) graph.d3Force('charge').strength(-80);
    if (graph.d3Force('link'))   graph.d3Force('link').distance(35);

    // W15 — Pull camera back z=480→650 to frame full 8-layer Y range (180 to -240 = 420 units).
    graph.cameraPosition({ x: 100, y: 0, z: 650 }, { x: 200, y: 0, z: 0 }, 0);

    // W3.5: hide node labels when camera zoomed far out (reduces clutter)
    if (typeof graph.onAfterRender === 'function') {
      graph.onAfterRender(() => {
        const cam = graph.camera();
        if (!cam) return;
        const distance = cam.position.length();
        const hideLabels = distance > 700;
        graph.graphData().nodes.forEach(n => {
          if (n.__threeObj) {
            const labelSprite = n.__threeObj.children.find(c => c.isSprite);
            if (labelSprite) labelSprite.visible = !hideLabels;
          }
        });
      });
    }

    KG_STATE.graph = graph;
    startAutoRotate();

    // Pause rotation on user interaction; resume after a delay so the user's last position settles before spin
    mount.addEventListener('mousedown', stopAutoRotate);
    mount.addEventListener('mouseup', () => {
      if (anyChainActive()) return;
      setTimeout(() => { if (!anyChainActive()) startAutoRotate(); }, 1000);
    });
    mount.addEventListener('wheel', () => {
      stopAutoRotate();
      clearTimeout(KG_STATE.wheelResumeTimer);
      KG_STATE.wheelResumeTimer = setTimeout(() => {
        if (!anyChainActive()) startAutoRotate();
      }, 2000);
    }, { passive: true });
    mount.addEventListener('touchstart', stopAutoRotate, { passive: true });
    mount.addEventListener('touchend', () => {
      if (anyChainActive()) return;
      setTimeout(() => { if (!anyChainActive()) startAutoRotate(); }, 1000);
    });

    window.addEventListener('resize', () => {
      graph.width(mount.clientWidth).height(mount.clientHeight);
    });

    console.log('[KG] 3D force-graph initialized.', KG_NODES.length, 'nodes,', KG_EDGES.length, 'edges.');

  } catch (err) {
    console.error('[KG] initKG3D threw — falling back to CSS scaffold.', err);
    fallbackToCSS();
  }
}

// Public API — consumed by W3+ for CoT-line hover/stream → node-chain highlight
window.KG = {
  setNodeChain(nodeIds) {
    KG_STATE.activeChain = new Set(nodeIds);
    stopAutoRotate();
    refreshKGStyles();
  },
  clearNodeChain() {
    KG_STATE.activeChain.clear();
    refreshKGStyles();
    if (KG_STATE.pinnedChain.size === 0) startAutoRotate();
  },
  pinNodeChain(nodeIds) {
    KG_STATE.pinnedChain = new Set(nodeIds);
    stopAutoRotate();
    refreshKGStyles();
  },
  unpinNodeChain() {
    KG_STATE.pinnedChain.clear();
    refreshKGStyles();
    if (KG_STATE.activeChain.size === 0) startAutoRotate();
  },
};

// ─────────────────────────────────────────────
// Orchestrator dispatch log — streaming queue (Wave 3.1)
// Plumbing only. CoT scripts arrive W3.2.
// ─────────────────────────────────────────────

const LOG_STATE = {
  lines: [],
  maxVisible: 5,
  pinnedLineId: null,
  hoveredLineId: null,
  collapsedExpanded: false,
  nextId: 1,
};

const LOG_SOURCE_COLORS = {
  orchestrator:        'var(--green-vivid)',
  inspection:          'var(--blue-vivid)',
  triage:              'var(--blue-vivid)',
  'diag-hrsg':         'var(--blue-vivid)',
  'diag-electrical':   'var(--blue-vivid)',
  playbook:            'var(--blue-vivid)',
  'wo-prefill':        'var(--blue-vivid)',
  workflow:            'var(--blue-vivid)',
  learning:            'var(--blue-vivid)',
  'critic-power-gen':  'var(--amber-vivid)',
  'critic-renewables': 'var(--amber-vivid)',
  'critic-networks':   'var(--amber-vivid)',
  hse:                 'var(--pink-vivid)',
  pl:                  'var(--pink-vivid)',
};

const AGENT_DISPLAY_NAMES = {
  orchestrator:        'Orchestrator',
  inspection:            'Sensor Anomaly Inspector',
  triage:                'Equipment Diagnostic Agent',
  'diag-hrsg':           'HRSG · Boiler Diagnostic Agent',
  'diag-electrical':     'Generator · Electrical Diagnostic Agent',
  playbook:              'BFP Maintenance Playbook Agent',
  'sop-action':          'SOP Action Agent',
  'audio-transcription': 'Audio-transcription Agent',
  'wo-prefill':          'Work Order Pre-fill Agent',
  workflow:              'A2A Coordination Agent',
  learning:            'Learning Engine',
  'critic-power-gen':  'Critic · Power Gen',
  'critic-renewables': 'Critic · Renewables',
  'critic-networks':   'Critic · Networks',
  hse:                 'HSE Risk Validator',
  pl:                  'P&L Impact Validator',
};

function visibleLines() {
  return LOG_STATE.lines.slice(-LOG_STATE.maxVisible);
}
function collapsedLines() {
  return LOG_STATE.lines.length > LOG_STATE.maxVisible
    ? LOG_STATE.lines.slice(0, LOG_STATE.lines.length - LOG_STATE.maxVisible)
    : [];
}

function appendLogLine(payload) {
  const { ts, source, text, dataSource, nodeChain = [] } = payload;
  const id = LOG_STATE.nextId++;
  const line = { id, ts, source, text, dataSource, nodeChain, el: null };

  const validIds = new Set(KG_NODES.map(n => n.id));
  const invalidChainIds = nodeChain.filter(nid => !validIds.has(nid));
  if (invalidChainIds.length > 0) {
    console.warn('[LOG] appendLine has nodeChain referencing unknown KG node IDs:', invalidChainIds);
  }

  LOG_STATE.lines.push(line);

  const body = document.getElementById('orch-log-body');
  if (!body) return id;

  // Find the last .log-group (skip the accordion that lives at index 0)
  const groups = body.querySelectorAll('.log-group');
  const lastGroup = groups.length > 0 ? groups[groups.length - 1] : null;

  let group;
  if (lastGroup && lastGroup.dataset.source === source) {
    // Same agent → demote prior active step in this group to done
    const prevActive = lastGroup.querySelector('.log-step[data-state="active"]');
    if (prevActive) prevActive.dataset.state = 'done';
    group = lastGroup;
  } else {
    // New agent group → demote prior group's active step to done
    if (lastGroup) {
      const prevActive = lastGroup.querySelector('.log-step[data-state="active"]');
      if (prevActive) prevActive.dataset.state = 'done';
    }
    group = buildLogGroup(source);
    body.appendChild(group);
  }

  const stepEl = buildLogStep(line);
  group.querySelector('.log-steps').appendChild(stepEl);
  line.el = stepEl;

  reconcileVisibility();
  rerenderAccordion();

  // Pulse the matching agent card
  pulseAgentEngagement(source);

  requestAnimationFrame(() => stepEl.classList.add('orch-line-in'));

  updateLogCountBadge();

  return id;
}

function buildLogGroup(source) {
  const group = document.createElement('div');
  group.className = 'log-group';
  group.dataset.source = source;
  group.style.setProperty('--src-color', LOG_SOURCE_COLORS[source] || 'var(--text-muted)');
  group.innerHTML = `
    <div class="log-group-hdr">
      <span class="log-engage-prefix">engaging</span>
      <span class="log-agent-name">${AGENT_DISPLAY_NAMES[source] || source}</span>
    </div>
    <div class="log-steps"></div>
  `;
  return group;
}

function buildLogStep(line) {
  const el = document.createElement('div');
  el.className = 'log-step';
  el.dataset.lineId = line.id;
  el.dataset.state = 'active';
  el.dataset.source = line.source;

  const tagHtml = line.dataSource
    ? `<span class="log-step-tag">${line.dataSource}</span>`
    : '';
  const nodesHtml = line.nodeChain && line.nodeChain.length > 0
    ? `<span class="log-step-nodes">${line.nodeChain.map(n => `<span class="log-step-node">${n}</span>`).join('')}</span>`
    : '';

  el.innerHTML = `
    <span class="log-step-bullet"></span>
    <span class="log-step-ts">${line.ts}</span>
    <span class="log-step-text">${line.text}</span>
    ${tagHtml}
    ${nodesHtml}
  `;

  el.addEventListener('mouseenter', () => onLineHoverEnter(line.id));
  el.addEventListener('mouseleave', () => onLineHoverLeave(line.id));
  el.addEventListener('click', () => onLineClick(line.id));

  return el;
}

function reconcileVisibility() {
  const all = LOG_STATE.lines;
  const visibleStartIdx = Math.max(0, all.length - LOG_STATE.maxVisible);

  all.forEach((line, idx) => {
    if (!line.el) return;
    if (idx < visibleStartIdx) {
      line.el.dataset.collapsed = 'true';
    } else {
      delete line.el.dataset.collapsed;
    }
  });

  // Hide groups whose ALL steps are collapsed
  document.querySelectorAll('.log-group').forEach(group => {
    const steps = group.querySelectorAll('.log-step');
    const allCollapsed = steps.length > 0 && Array.from(steps).every(s => s.dataset.collapsed === 'true');
    if (allCollapsed) group.dataset.collapsed = 'true';
    else delete group.dataset.collapsed;
  });
}

function rerenderAccordion() {
  const body = document.getElementById('orch-log-body');
  if (!body) return;

  const existing = body.querySelector('.orch-accordion');
  if (existing) existing.remove();

  const collapsed = collapsedLines();
  if (collapsed.length === 0) {
    body.classList.remove('log-accordion-expanded');
    return;
  }

  const acc = document.createElement('div');
  acc.className = 'orch-accordion';
  if (LOG_STATE.collapsedExpanded) {
    acc.classList.add('orch-accordion-expanded');
    body.classList.add('log-accordion-expanded');
  } else {
    body.classList.remove('log-accordion-expanded');
  }

  acc.innerHTML = `
    <div class="orch-accordion-toggle">
      <span class="orch-accordion-chev">▾</span>
      <span class="orch-accordion-lbl">${collapsed.length} earlier step${collapsed.length === 1 ? '' : 's'}</span>
    </div>
  `;

  acc.querySelector('.orch-accordion-toggle').addEventListener('click', () => {
    LOG_STATE.collapsedExpanded = !LOG_STATE.collapsedExpanded;
    acc.classList.toggle('orch-accordion-expanded');
    body.classList.toggle('log-accordion-expanded');
  });

  body.insertBefore(acc, body.firstChild);
}

function onLineHoverEnter(lineId) {
  if (LOG_STATE.pinnedLineId !== null) return;
  const line = LOG_STATE.lines.find(l => l.id === lineId);
  if (!line) return;
  LOG_STATE.hoveredLineId = lineId;
  if (window.KG && line.nodeChain.length > 0) {
    window.KG.setNodeChain(line.nodeChain);
  }
}

function onLineHoverLeave(lineId) {
  if (LOG_STATE.pinnedLineId !== null) return;
  LOG_STATE.hoveredLineId = null;
  if (window.KG) {
    window.KG.clearNodeChain();
  }
}

function onLineClick(lineId) {
  const line = LOG_STATE.lines.find(l => l.id === lineId);
  if (!line) return;

  if (LOG_STATE.pinnedLineId === lineId) {
    LOG_STATE.pinnedLineId = null;
    line.el.classList.remove('log-step-pinned');
    if (window.KG) window.KG.unpinNodeChain();
    return;
  }

  if (LOG_STATE.pinnedLineId !== null) {
    const prev = LOG_STATE.lines.find(l => l.id === LOG_STATE.pinnedLineId);
    if (prev && prev.el) prev.el.classList.remove('log-step-pinned');
  }

  LOG_STATE.pinnedLineId = lineId;
  line.el.classList.add('log-step-pinned');
  if (window.KG && line.nodeChain.length > 0) {
    window.KG.pinNodeChain(line.nodeChain);
  }
}

function pulseAgentEngagement(source) {
  const card = document.querySelector(`.agent-card[data-agent-id="${source}"]`);
  if (!card) return;
  card.classList.remove('agent-engage-pulse');
  void card.offsetWidth;  // force reflow so animation re-triggers
  card.classList.add('agent-engage-pulse');
  setTimeout(() => card.classList.remove('agent-engage-pulse'), 1550);
}

window.LOG = {
  appendLine(payload) { return appendLogLine(payload); },
  clearAll() {
    const body = document.getElementById('orch-log-body');
    if (body) body.querySelectorAll('.log-group, .orch-accordion').forEach(n => n.remove());
    LOG_STATE.lines = [];
    LOG_STATE.pinnedLineId = null;
    LOG_STATE.hoveredLineId = null;
    LOG_STATE.collapsedExpanded = false;
    if (body) body.classList.remove('log-accordion-expanded');
    if (window.KG) {
      window.KG.clearNodeChain();
      window.KG.unpinNodeChain();
    }
  },
  state() {
    return {
      visibleCount: visibleLines().length,
      totalCount: LOG_STATE.lines.length,
      pinned: LOG_STATE.pinnedLineId,
    };
  },
};

// ─────────────────────────────────────────────
// P1 arc — agent CoT scripts + sequencer (Wave 3.2)
// Hardcoded reasoning sequences. Each step = log line payload + tree label.
// Sequencer chains scripts via timed setTimeout.
// ─────────────────────────────────────────────

const INSPECTION_AGENT_SCRIPT = {
  agentId: 'inspection',
  durationMs: 5000,
  taskTreeLabel: 'BFP-3A Vibration Anomaly · KG Traverse',
  steps: [
    {
      log: { ts: '02:47:12', source: 'inspection', text: 'BFP-3A vibration anomaly detected · NDE RMS 8.4 mm/s · alarm 7.1 mm/s', dataSource: 'Bently Nevada 3500', nodeChain: ['bfp-3a', 'vt-bfp-3a-nde-x', 'vt-bfp-3a-nde-y'] },
      treeLabel: 'Fetch vibration anomaly',
      delayMs: 200,
    },
    {
      log: { ts: '02:47:13', source: 'inspection', text: 'L2 traverse · 4 vibration transducers · 2 bearing housings · coupling + shaft', dataSource: 'Honeywell Experion DCS', nodeChain: ['vt-bfp-3a-nde-x','vt-bfp-3a-nde-y','vt-bfp-3a-de-x','vt-bfp-3a-de-y','bearing-bfp-3a-nde','coupling-bfp-3a','shaft-bfp-3a'] },
      treeLabel: 'L2 · trace BFP sub-assembly',
      delayMs: 800,
    },
    {
      log: { ts: '02:47:14', source: 'inspection', text: 'L3 lookup · 90-day RMS trend · rising past 14 days · ISO 10816-7 Zone C entry', dataSource: 'OSIsoft PI System', nodeChain: ['vib-rms-90d','iso-10816-7-spec'] },
      treeLabel: 'L3 · 90d RMS trend',
      delayMs: 800,
    },
    {
      log: { ts: '02:47:15', source: 'inspection', text: 'asset chain assembled · 6 nodes · BFP-3A → HRSG-3 → ST-3 cascade', dataSource: 'Hyperspace KG', nodeChain: ['bfp-3a','hrsg-3','st-3','generator-3','transformer-3','switchyard-a'] },
      treeLabel: 'Assemble asset chain',
      delayMs: 800,
    },
  ],
};

const ORCHESTRATOR_DISPATCH_LINES = [
  { ts: '02:47:16', source: 'orchestrator', text: 'received inspection findings · handing to Equipment Diagnostic Agent', nodeChain: [] },
];

const TRIAGE_AGENT_SCRIPT = {
  agentId: 'triage',
  durationMs: 3500,
  taskTreeLabel: 'Misalignment Hypothesis · Spectral Match',
  steps: [
    {
      log: { ts: '02:47:19', source: 'triage', text: 'spectral analysis · elevated 2×RPM harmonic + ~180° NDE-DE phase shift across coupling', dataSource: 'Hyperspace KG', nodeChain: ['shaft-bfp-3a','coupling-bfp-3a','failure-mode-misalignment'] },
      treeLabel: 'Analyze vibration spectrum',
      delayMs: 200,
    },
    {
      log: { ts: '02:47:20', source: 'triage', text: 'diagnosis hypothesis · shaft misalignment · 85% confidence', dataSource: 'Hyperspace OS', nodeChain: ['failure-mode-misalignment','shaft-bfp-3a'] },
      treeLabel: 'Form hypothesis',
      delayMs: 900,
    },
    {
      log: { ts: '02:47:21', source: 'triage', text: 'alternatives considered · NDE bearing race spalling 78% · coupling wear 31% · impeller imbalance 19%', dataSource: 'Hyperspace OS', nodeChain: ['bearing-spalling-pattern','coupling-bfp-3a'] },
      treeLabel: 'Consider alternatives',
      delayMs: 900,
    },
    {
      log: { ts: '02:47:22', source: 'triage', text: 'synthesis · 85% confidence · passing to Power Gen Critic', dataSource: 'Hyperspace OS', nodeChain: ['failure-mode-misalignment'] },
      treeLabel: 'Pass to critic',
      delayMs: 800,
    },
  ],
};

const POWER_GEN_CRITIC_SCRIPT = {
  agentId: 'critic-power-gen',
  durationMs: 2400,
  taskTreeLabel: 'Validate Misalignment Hypothesis',
  steps: [
    {
      log: { ts: '02:47:22', source: 'critic-power-gen', text: 'KG path validated · failure-mode-misalignment within Sulzer BFP coupling-alignment tolerance ✓', dataSource: 'Hyperspace KG', nodeChain: ['failure-mode-misalignment','sulzer-bfp-manual'] },
      treeLabel: 'Walk KG path backwards',
      delayMs: 200,
    },
    {
      log: { ts: '02:47:23', source: 'critic-power-gen', text: 'cross-check ISO 10816-7 alarm zone C threshold ✓ · onsite verification recommended', dataSource: 'Hyperspace KG', nodeChain: ['iso-10816-7-spec','sop-bfp-vibration-investigation'] },
      treeLabel: 'Cross-check standard',
      delayMs: 1000,
    },
    {
      log: { ts: '02:47:24', source: 'critic-power-gen', text: 'diagnosis VALIDATED · surfacing to tablet', nodeChain: ['failure-mode-misalignment','bfp-3a'] },
      treeLabel: 'Validate + surface',
      delayMs: 1000,
    },
  ],
};

const ORCHESTRATOR_CLOSE_LINES = [
  { ts: '02:47:25', source: 'orchestrator', text: 'recommendation ready · SOP-BFP-VIBR-001 · awaiting dispatch · pending onsite verification', nodeChain: [] },
];

// Wave 3.4 — Workflow Agent (fires on Dispatch CTA → captures SOP trace)
const WORKFLOW_AGENT_SCRIPT = {
  agentId: 'workflow',
  durationMs: 2500,
  taskTreeLabel: 'Capture SOP Trace',
  steps: [
    {
      log: { ts: '02:47:48', source: 'workflow', text: 'Sembcorp CCGT-1 · incident workflow trace captured · INC-2026-0537', nodeChain: ['bfp-3a', 'r-kumar'] },
      treeLabel: 'Capture trace',
      delayMs: 200,
    },
    {
      log: { ts: '02:47:49', source: 'workflow', text: 'dispatch sequence recorded · P1 Ops Tower → P2 Onsite · 02:47:48 SGT', nodeChain: ['r-kumar', 'lim-wei-jie'] },
      treeLabel: 'Record dispatch sequence',
      delayMs: 900,
    },
    {
      log: { ts: '02:47:50', source: 'workflow', text: 'SOP-BFP-VIBR-001 registered for process-engineer review · 0 deviations from standard', nodeChain: ['sop-bfp-vibration-investigation', 'raci-derate'] },
      treeLabel: 'Register SOP for review',
      delayMs: 900,
    },
  ],
};

// ── Agent-card helpers (Wave 3.3 — inline task-tree removed; log strip is primary surface) ──
function setAgentActive(agentId, taskTreeLabel, totalSteps) {
  if (state.activeAgentId && state.activeAgentId !== agentId) {
    teardownAgentTree(state.activeAgentId);
  }
  state.activeAgentId = agentId;
  state.agentStepIndex[agentId] = 0;

  const card = document.querySelector(`.agent-card[data-agent-id="${agentId}"]`);
  if (!card) return;
  card.classList.add('agent-active');
  card.classList.remove('agent-done');

  const tree = card.querySelector('.agent-tree');
  if (tree) tree.remove();

  ensureStepPill(card, 0, totalSteps);
}

function ensureStepPill(card, currentStep, totalSteps) {
  let pill = card.querySelector('.agent-step-pill');
  if (!pill) {
    pill = document.createElement('span');
    pill.className = 'agent-step-pill';
    card.appendChild(pill);
  }
  pill.textContent = `${currentStep}/${totalSteps}`;
  pill.classList.remove('idle', 'done');
  pill.dataset.total = totalSteps;
}

function advanceAgentStep(agentId, stepIdx, step) {
  state.agentStepIndex[agentId] = stepIdx + 1;
  const card = document.querySelector(`.agent-card[data-agent-id="${agentId}"]`);
  if (!card) return;

  const pill = card.querySelector('.agent-step-pill');
  const total = pill ? +(pill.dataset.total || 0) : 0;
  if (pill) ensureStepPill(card, stepIdx + 1, total);
}

function teardownAgentTree(agentId) {
  const card = document.querySelector(`.agent-card[data-agent-id="${agentId}"]`);
  if (!card) return;
  card.classList.remove('agent-active');
  card.classList.add('agent-done');

  const tree = card.querySelector('.agent-tree');
  if (tree) tree.remove();

  const pill = card.querySelector('.agent-step-pill');
  if (pill) {
    const total = pill.dataset.total || '';
    pill.textContent = `${total}/${total}`;
    pill.classList.add('done');
  }
}

// ── W3.9 — Arc clone fires for any persona (theater). Only advances state pill when P1 is on first arc. ──
function fireArc(personaKey) {
  dispatchP1Arc(personaKey);
}

// ── Sequencer ──
function dispatchP1Arc(arcPersonaKey) {
  // Re-runnable: clear any prior timers
  state.arcTimers.forEach(t => clearTimeout(t));
  state.arcTimers = [];

  // W3.9 — only advance state pill when this is P1's first arc (TRIAGING in flight)
  const advanceStatePill = (arcPersonaKey === undefined || arcPersonaKey === 'ops') &&
                           (state.incidentPhase === 'TRIAGING');
  if (advanceStatePill) {
    setStatePill('TRIAGING');
  }
  rerenderMonitoringIfVisible();

  let t = 0;

  // 1. Inspection Agent
  t += 200;
  scheduleArcStep(t, () => {
    setAgentActive(INSPECTION_AGENT_SCRIPT.agentId, INSPECTION_AGENT_SCRIPT.taskTreeLabel, INSPECTION_AGENT_SCRIPT.steps.length);
  });
  INSPECTION_AGENT_SCRIPT.steps.forEach((step, idx) => {
    t += step.delayMs;
    scheduleArcStep(t, () => {
      window.LOG.appendLine(step.log);
      advanceAgentStep(INSPECTION_AGENT_SCRIPT.agentId, idx, step);
    });
  });
  t += 400;
  scheduleArcStep(t, () => teardownAgentTree(INSPECTION_AGENT_SCRIPT.agentId));

  // 2. Orchestrator handoff
  ORCHESTRATOR_DISPATCH_LINES.forEach(line => {
    t += 400;
    scheduleArcStep(t, () => window.LOG.appendLine(line));
  });

  // 3. Triage Agent
  t += 200;
  scheduleArcStep(t, () => {
    setAgentActive(TRIAGE_AGENT_SCRIPT.agentId, TRIAGE_AGENT_SCRIPT.taskTreeLabel, TRIAGE_AGENT_SCRIPT.steps.length);
  });
  TRIAGE_AGENT_SCRIPT.steps.forEach((step, idx) => {
    t += step.delayMs;
    scheduleArcStep(t, () => {
      window.LOG.appendLine(step.log);
      advanceAgentStep(TRIAGE_AGENT_SCRIPT.agentId, idx, step);
    });
  });
  t += 400;
  scheduleArcStep(t, () => teardownAgentTree(TRIAGE_AGENT_SCRIPT.agentId));

  // 4. Power Gen Critic
  t += 200;
  scheduleArcStep(t, () => {
    setAgentActive(POWER_GEN_CRITIC_SCRIPT.agentId, POWER_GEN_CRITIC_SCRIPT.taskTreeLabel, POWER_GEN_CRITIC_SCRIPT.steps.length);
  });
  POWER_GEN_CRITIC_SCRIPT.steps.forEach((step, idx) => {
    t += step.delayMs;
    scheduleArcStep(t, () => {
      window.LOG.appendLine(step.log);
      advanceAgentStep(POWER_GEN_CRITIC_SCRIPT.agentId, idx, step);
    });
  });
  t += 400;
  scheduleArcStep(t, () => teardownAgentTree(POWER_GEN_CRITIC_SCRIPT.agentId));

  // 5. Orchestrator close
  ORCHESTRATOR_CLOSE_LINES.forEach(line => {
    t += 400;
    scheduleArcStep(t, () => window.LOG.appendLine(line));
  });

  // 6. Phase: TRIAGING → REVIEW_READY (only for P1's first arc; clones don't regress)
  t += 300;
  scheduleArcStep(t, () => {
    if (advanceStatePill) setStatePill('REVIEW_READY');
    state.activeAgentId = null;
    rerenderMonitoringIfVisible();
  });
}

function scheduleArcStep(delayMs, fn) {
  const handle = setTimeout(fn, delayMs);
  state.arcTimers.push(handle);
}

function rerenderMonitoringIfVisible() {
  // Re-render only when a monitoring screen (or incident detail) is visible
  if (state.screen === 'monitoring-landed' ||
      state.screen === 'monitoring-notify' ||
      state.screen === 'monitoring' ||
      state.screen === 'incident-detail') {
    render();
  }
}

function seedLogLines() {
  appendLogLine({
    ts: '02:47:03',
    source: 'orchestrator',
    text: 'idle · monitoring incident channel',
    nodeChain: [],
  });
  appendLogLine({
    ts: '02:47:07',
    source: 'inspection',
    text: 'sensor anomaly · BFP-3A NDE vibration transducer · RMS drift detected',
    dataSource: 'Bently Nevada 3500',
    nodeChain: ['bfp-3a', 'vt-bfp-3a-nde-x'],
  });
  appendLogLine({
    ts: '02:47:08',
    source: 'orchestrator',
    text: 'received INC-2026-0537 · JRG-CCGT-1 · Block 2 · BFP-3A',
    nodeChain: ['bfp-3a', 'r-kumar'],
  });
  appendLogLine({
    ts: '02:47:08',
    source: 'orchestrator',
    text: 'severity AMBER · dispatching Sensor Anomaly Inspector · scope: KG lookup + cross-layer impact',
    nodeChain: ['bfp-3a'],
  });
  appendLogLine({
    ts: '02:47:09',
    source: 'orchestrator',
    text: 'standby · awaiting inspection findings',
    nodeChain: [],
  });
}

// ─────────────────────────────────────────────
// Right-pane toolbar + floating KG window (Wave 3.4)
// ─────────────────────────────────────────────

function updateLogCountBadge() {
  const badge = document.getElementById('rp-logs-count');
  if (badge) badge.textContent = String(LOG_STATE.lines.length);
}

function updateGraphCountBadge() {
  const badge = document.getElementById('rp-graph-count');
  if (badge) badge.textContent = `${KG_NODES.length} nodes · ${KG_EDGES.length} edges`;
}

function toggleLogDropdown() {
  state.logDropdownOpen = !state.logDropdownOpen;
  const dropdown = document.getElementById('log-dropdown');
  const btn = document.getElementById('btn-display-logs');
  if (!dropdown || !btn) return;
  dropdown.dataset.open = state.logDropdownOpen ? 'true' : 'false';
  btn.classList.toggle('rp-toggle-active', state.logDropdownOpen);
  const icon = btn.querySelector('.rp-toggle-icon');
  if (icon) icon.textContent = state.logDropdownOpen ? '▾' : '▸';
}

// W10 Section A.5 — Log dropdown 2-tab switcher [Log · Agents]
// Reparents #zone-agents inside the dropdown so the agent roster lives behind a tab.
// Persistent-roster pulses (fireAgentCardLifecycle) still fire regardless of tab visibility.
function initLogDropdownTabs() {
  const content = document.querySelector('#log-dropdown .rp-log-dropdown-content');
  if (!content || content.dataset.tabsBuilt === '1') return;
  const orchLog = content.querySelector('.orch-log');
  const zoneAgents = document.getElementById('zone-agents');
  if (!orchLog || !zoneAgents) return;

  const tabRow = document.createElement('div');
  tabRow.className = 'rp-tab-row';
  tabRow.innerHTML = `
    <button class="rp-tab-btn" type="button" data-tab="log" data-active="true">Log</button>
    <button class="rp-tab-btn" type="button" data-tab="agents" data-active="false">Agents · 17</button>
  `;

  const logPane = document.createElement('div');
  logPane.className = 'rp-tab-pane';
  logPane.dataset.tab = 'log';
  logPane.dataset.active = 'true';
  orchLog.parentNode.insertBefore(logPane, orchLog);
  logPane.appendChild(orchLog);

  const agentsPane = document.createElement('div');
  agentsPane.className = 'rp-tab-pane';
  agentsPane.dataset.tab = 'agents';
  agentsPane.dataset.active = 'false';
  agentsPane.appendChild(zoneAgents);
  content.appendChild(agentsPane);

  content.insertBefore(tabRow, content.firstChild);

  tabRow.querySelectorAll('.rp-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      tabRow.querySelectorAll('.rp-tab-btn').forEach(b => {
        b.dataset.active = (b.dataset.tab === tab) ? 'true' : 'false';
      });
      content.querySelectorAll('.rp-tab-pane').forEach(p => {
        p.dataset.active = (p.dataset.tab === tab) ? 'true' : 'false';
      });
    });
  });

  content.dataset.tabsBuilt = '1';
}

function toggleGraphWindow() {
  state.graphWinOpen = !state.graphWinOpen;
  const win = document.getElementById('kg-floating-window');
  const btn = document.getElementById('btn-display-graph');
  if (!win || !btn) return;
  win.dataset.open = state.graphWinOpen ? 'true' : 'false';
  btn.classList.toggle('rp-toggle-active', state.graphWinOpen);
  const icon = btn.querySelector('.rp-toggle-icon');
  if (icon) icon.textContent = state.graphWinOpen ? '◫' : '⊞';

  if (state.graphWinOpen) {
    win.dataset.persona = state.activePersona;
    openKGForPersona(state.activePersona);
  } else {
    // W17 Section C — stop physics loop + drop document-level drag listeners on close.
    if (typeof stopKGSimulation === 'function') stopKGSimulation();
  }
}

// W14 R3 — Persona-scoped KG node/edge subset.
// P2 (Lim · onsite): hide L6 Markets / L7 Contracts / L8 Cross-site (commercial layers).
// L5 Predictive Intelligence now VISIBLE to Lim (patterns matter for diagnosis).
// All other personas: full 8-layer graph.
function getKGNodesForPersona(persona) {
  if (persona === 'onsite') {
    return KG_NODES.filter(n => n.layer !== 'L6' && n.layer !== 'L7' && n.layer !== 'L8');
  }
  return KG_NODES;
}
function getKGEdgesForPersona(persona) {
  if (persona === 'onsite') {
    const idSet = new Set(getKGNodesForPersona(persona).map(n => n.id));
    return KG_EDGES.filter(e => {
      const s = (e.source && e.source.id) ? e.source.id : e.source;
      const t = (e.target && e.target.id) ? e.target.id : e.target;
      return idSet.has(s) && idSet.has(t);
    });
  }
  return KG_EDGES;
}
function applyPersonaKGFilter(persona) {
  if (!KG_STATE.graph) return;
  const nodes = getKGNodesForPersona(persona).map(n => ({ ...n, fy: n.y }));
  const edges = getKGEdgesForPersona(persona);
  KG_STATE.graph.graphData({ nodes, links: edges });
}

// W16 — Persona-specific KG mount.
// P2 (onsite · Lim) + P3 (analyst · Priya) use static SVG renderers (this wave).
// 3d-force-graph init code preserved as dead code per WA #5 for other personas.
function openKGForPersona(persona) {
  const win = document.getElementById('kg-floating-window');
  if (!win) return;
  const body = win.querySelector('.kg-fw-body');
  if (!body) return;

  // Defensive: stop any zombie 3d autorotate timer regardless of persona path.
  if (typeof stopAutoRotate === 'function') stopAutoRotate();

  // SVG path — P2 + P3
  if (persona === 'onsite' || persona === 'analyst') {
    mountSvgKG(body, win, persona);
    return;
  }

  // ── DEAD CODE (W16 · per WA #5) — original 3d-force-graph dispatch for other personas ──
  if (!KG_STATE.graph) return;
  const w = body.clientWidth;
  const h = body.clientHeight;
  KG_STATE.graph.width(w).height(h);
  applyPersonaKGFilter(persona);

  state.w10 = state.w10 || {};
  state.w10.kgFlashedFor = state.w10.kgFlashedFor || { onsite: false, analyst: false };

  const POSE = {
    ops: null,
  };
  const pose = POSE[persona];
  if (!pose) return;

  KG_STATE.graph.cameraPosition(pose.cam, pose.lookAt, 2000);
  setTimeout(() => {
    if (!anyChainActive()) startAutoRotate();
  }, 6000);
}

// ═══════════════════════════════════════════════
// W16 — Static SVG KG (P2 + P3)
// ═══════════════════════════════════════════════

function mountSvgKG(body, win, persona) {
  // Hide 3d mount (if present); show svg mount
  const threeMount = body.querySelector('#kg-3d-mount');
  if (threeMount) threeMount.style.display = 'none';

  let svgMount = body.querySelector('#kg-svg-mount');
  if (!svgMount) {
    svgMount = document.createElement('div');
    svgMount.id = 'kg-svg-mount';
    svgMount.className = 'kg-svg-mount';
    body.appendChild(svgMount);
  }
  svgMount.style.display = 'block';
  svgMount.innerHTML = persona === 'onsite' ? renderP2KGSvg() : renderP3KGSvg();

  // Resize floating window so SVG legible (default 460x360 too small).
  // W17 Section A: onsite bumped 820×620 → 1180×780 to fit 1100×720 viewBox at full scale.
  // W17 Section B: analyst bumped to 1180×880 to fit 1100×1500 viewBox.
  const ideal = persona === 'onsite'
    ? { w: 1180, h: 780 }
    : { w: 1180, h: 880 };
  // Clamp to viewport so edges never run off-screen at any projector resolution.
  const margin = 16;
  const dims = {
    w: Math.min(ideal.w, window.innerWidth - margin * 2),
    h: Math.min(ideal.h, window.innerHeight - margin * 2),
  };
  // Centre the KG window on screen.
  win.style.left = Math.max(margin, (window.innerWidth - dims.w) / 2) + 'px';
  win.style.top = Math.max(margin, (window.innerHeight - dims.h) / 2) + 'px';
  win.style.width = dims.w + 'px';
  win.style.height = dims.h + 'px';
  state.graphWinSize = dims;

  // W18 Section A — ORDER MATTERS. initKGSimulation calls stopKGSimulation() which removes any
  // prior document mousemove/mouseup listeners. Wiring AFTER init prevents the freshly-installed
  // drag listeners from being stripped (W17 bug: wire-then-init killed drag end-to-end).
  initKGSimulation(persona);
  wireKGSvgInteractions(svgMount);
  wireKGParallaxTilt(body);
}

// ── P2 (Lim · onsite) — 5 layers (L1-L5) ──
// W17 Section A: enriched 25 → 72 nodes · canvas widened 800→1100, height stays 720.
// Layout grid: L1 (y=60), L2 (y=160), L3 (y=270/340/410 · 3 rows), L4 (y=510/580 · 2 rows), L5 (y=670).
const P2_KG_NODES_DEF = [
  // L1 Org Structure (y=60 · 10 nodes · x spacing ~104px)
  { id: 'lim',                label: 'Lim Wei Jie',                 layer: 'L1', x: 80,   y: 60 },
  { id: 'faye',               label: 'Faye Sit',                    layer: 'L1', x: 184,  y: 60 },
  { id: 'ismail',             label: 'Dr. A. Ismail',               layer: 'L1', x: 289,  y: 60 },
  { id: 'supervisor',         label: 'Block 2 Supervisor',          layer: 'L1', x: 393,  y: 60 },
  { id: 'block1-supervisor',  label: 'Block 1 Supervisor',          layer: 'L1', x: 498,  y: 60 },
  { id: 'maint-lead',         label: 'Maint Lead · S. Ibrahim',     layer: 'L1', x: 602,  y: 60 },
  { id: 'hse-officer',        label: 'HSE · P. Subramaniam',        layer: 'L1', x: 707,  y: 60 },
  { id: 'trading-lead',       label: 'Trading Lead · P. Sundaram',  layer: 'L1', x: 811,  y: 60 },
  { id: 'asset-perf-mgr',     label: 'Asset Perf Mgr · J. Tan',     layer: 'L1', x: 916,  y: 60 },
  { id: 'plant-mgr',          label: 'Plant Manager · M. Lim',      layer: 'L1', x: 1020, y: 60 },

  // L2 SOPs (y=160 · 10 nodes)
  { id: 'sop-bfp-vibr',       label: 'SOP-BFP-VIBR-001',            layer: 'L2', x: 80,   y: 160 },
  { id: 'sop-escalation',     label: 'Escalation playbook',         layer: 'L2', x: 184,  y: 160 },
  { id: 'sop-safety',         label: 'Safety procedure',            layer: 'L2', x: 289,  y: 160 },
  { id: 'sop-vibr-trending',  label: 'SOP · vibration trending',    layer: 'L2', x: 393,  y: 160 },
  { id: 'sop-wo-creation',    label: 'SOP · WO creation',           layer: 'L2', x: 498,  y: 160 },
  { id: 'sop-maximo-entry',   label: 'SOP · Maximo entry',          layer: 'L2', x: 602,  y: 160 },
  { id: 'sop-shift-handover', label: 'SOP · shift handover',        layer: 'L2', x: 707,  y: 160 },
  { id: 'sop-loto',           label: 'SOP · LOTO',                  layer: 'L2', x: 811,  y: 160 },
  { id: 'sop-confined-space', label: 'SOP · confined space',        layer: 'L2', x: 916,  y: 160 },
  { id: 'sop-overspeed',      label: 'SOP · GT overspeed',          layer: 'L2', x: 1020, y: 160 },

  // L3 row 1 (y=270) — BFP-3A + sub-assemblies (10 nodes)
  { id: 'bfp-3a',             label: 'BFP-3A',                      layer: 'L3', x: 80,   y: 270 },
  { id: 'impeller',           label: 'Impeller · Sulzer',           layer: 'L3', x: 184,  y: 270 },
  { id: 'shaft',              label: 'Shaft',                       layer: 'L3', x: 289,  y: 270 },
  { id: 'seals',              label: 'Seals · John Crane',          layer: 'L3', x: 393,  y: 270 },
  { id: 'casing',             label: 'Pump casing (Sulzer)',        layer: 'L3', x: 498,  y: 270 },
  { id: 'coupling',           label: 'Coupling',                    layer: 'L3', x: 602,  y: 270 },
  { id: 'bearing-nde',        label: 'NDE bearing (SKF)',           layer: 'L3', x: 707,  y: 270 },
  { id: 'bearing-de',         label: 'DE bearing (SKF)',            layer: 'L3', x: 811,  y: 270 },
  { id: 'lube-oil',           label: 'Lube oil system',             layer: 'L3', x: 916,  y: 270 },
  { id: 'base-plate',         label: 'Pump base plate',             layer: 'L3', x: 1020, y: 270 },

  // L3 row 2 (y=340) — valves, sensors, asset chain (10 nodes)
  { id: 'suction-valve',      label: 'Suction valve',               layer: 'L3', x: 80,   y: 340 },
  { id: 'discharge-valve',    label: 'Discharge valve',             layer: 'L3', x: 184,  y: 340 },
  { id: 'sensor-bn3500',      label: 'Sensor · Bently Nevada 3500', layer: 'L3', x: 289,  y: 340 },
  { id: 'telemetry-vib',      label: 'Telemetry · vibration RMS',   layer: 'L3', x: 393,  y: 340 },
  { id: 'telemetry-temp',     label: 'Telemetry · bearing temp',    layer: 'L3', x: 498,  y: 340 },
  { id: 'telemetry-flow',     label: 'Telemetry · flow rate',       layer: 'L3', x: 602,  y: 340 },
  { id: 'hrsg-3',             label: 'HRSG-3',                      layer: 'L3', x: 707,  y: 340 },
  { id: 'st-3',               label: 'Steam turbine ST-3',          layer: 'L3', x: 811,  y: 340 },
  { id: 'gen-3',              label: 'Generator-3',                 layer: 'L3', x: 916,  y: 340 },
  { id: 'transformer-3',      label: 'Transformer-3',               layer: 'L3', x: 1020, y: 340 },

  // L3 row 3 (y=410) — switchyard + failure modes + manuals (10 nodes)
  { id: 'switchyard-a',       label: 'Switchyard-A',                layer: 'L3', x: 80,   y: 410 },
  { id: 'fm-race',            label: 'Failure · race spalling',     layer: 'L3', x: 184,  y: 410 },
  { id: 'fm-crack',           label: 'Failure · casing crack',      layer: 'L3', x: 289,  y: 410 },
  { id: 'fm-imbalance',       label: 'Failure · imbalance',         layer: 'L3', x: 393,  y: 410 },
  { id: 'fm-misalignment',    label: 'Failure · misalignment',      layer: 'L3', x: 498,  y: 410 },
  { id: 'fm-cavitation',      label: 'Failure · cavitation',        layer: 'L3', x: 602,  y: 410 },
  { id: 'manual-sulzer',      label: 'Manual · Sulzer BFP',         layer: 'L3', x: 707,  y: 410 },
  { id: 'manual-ge9ha',       label: 'Manual · GE 9HA',             layer: 'L3', x: 811,  y: 410 },
  { id: 'manual-bn',          label: 'Manual · Bently Nevada',      layer: 'L3', x: 916,  y: 410 },
  { id: 'manual-abb',         label: 'Manual · ABB drives',         layer: 'L3', x: 1020, y: 410 },

  // L4 row 1 (y=510) — WOs + RCAs (7 nodes · x spacing ~157px)
  { id: 'wo-jrg-2025',        label: 'WO · Jurong 2025',            layer: 'L4', x: 80,   y: 510 },
  { id: 'wo-skr-2024',        label: 'WO · Sakra 2024',             layer: 'L4', x: 237,  y: 510 },
  { id: 'wo-banyan-2024',     label: 'WO · Banyan 2024',            layer: 'L4', x: 393,  y: 510 },
  { id: 'wo-tuas-2023',       label: 'WO · Tuas 2023',              layer: 'L4', x: 550,  y: 510 },
  { id: 'rca-jrg-2025',       label: 'RCA · Jurong 2025',           layer: 'L4', x: 707,  y: 510 },
  { id: 'rca-banyan-2024',    label: 'RCA · Banyan 2024',           layer: 'L4', x: 863,  y: 510 },
  { id: 'rca-sakra-coupling', label: 'RCA · Sakra coupling 2025',   layer: 'L4', x: 1020, y: 510 },

  // L4 row 2 (y=580) — historical telemetry + logs (7 nodes)
  { id: 'vib-90d',            label: 'Vibration history · 90d',     layer: 'L4', x: 80,   y: 580 },
  { id: 'temp-30d',           label: 'Temp history · 30d',          layer: 'L4', x: 237,  y: 580 },
  { id: 'trend-90d',          label: 'Vibration trend · aggregate', layer: 'L4', x: 393,  y: 580 },
  { id: 'spec-compliance',    label: 'Spec compliance reports',     layer: 'L4', x: 550,  y: 580 },
  { id: 'maint-log',          label: 'Maintenance log · 12-mo',     layer: 'L4', x: 707,  y: 580 },
  { id: 'align-history',      label: 'Shaft alignment history',     layer: 'L4', x: 863,  y: 580 },
  { id: 'brg-replace-log',    label: 'Bearing replacement log',     layer: 'L4', x: 1020, y: 580 },

  // W18 Section D — L4.5 Tacit knowledge (y=625 · 5 diamond nodes between L4 and L5).
  // Tacit bytes represent senior-engineer field experience that's been triaged or ingested into the KG.
  // They sit topologically between historical RCAs/telemetry (L4) and predictive patterns (L5).
  { id: 'tacit-1', label: 'Tacit byte [triaged]',  layer: 'L4.5', tacitState: 'triaged',  isTacit: true, x: 220, y: 625 },
  { id: 'tacit-2', label: 'Tacit byte [triaged]',  layer: 'L4.5', tacitState: 'triaged',  isTacit: true, x: 380, y: 625 },
  { id: 'tacit-3', label: 'Tacit byte [triaged]',  layer: 'L4.5', tacitState: 'triaged',  isTacit: true, x: 540, y: 625 },
  { id: 'tacit-4', label: 'Tacit byte [ingested]', layer: 'L4.5', tacitState: 'ingested', isTacit: true, x: 700, y: 625 },
  { id: 'tacit-5', label: 'Tacit byte [ingested]', layer: 'L4.5', tacitState: 'ingested', isTacit: true, x: 860, y: 625 },

  // L5 Predictive Intelligence (y=670 · 8 nodes · x spacing ~134px)
  { id: 'pattern-race',       label: 'Pattern · race spalling',     layer: 'L5', x: 80,   y: 670 },
  { id: 'pattern-crack',      label: 'Pattern · casing crack',      layer: 'L5', x: 214,  y: 670 },
  { id: 'pattern-imbalance',  label: 'Pattern · impeller imbalance',layer: 'L5', x: 348,  y: 670 },
  { id: 'pattern-misalign',   label: 'Pattern · shaft misalignment',layer: 'L5', x: 483,  y: 670 },
  { id: 'pattern-cavitation', label: 'Pattern · cavitation',        layer: 'L5', x: 617,  y: 670 },
  { id: 'derate-model',       label: 'Derate cascade model',        layer: 'L5', x: 751,  y: 670 },
  { id: 'oem-playbook',       label: 'OEM · Sulzer playbook',       layer: 'L5', x: 886,  y: 670 },
  { id: 'mtbf-model',         label: 'MTBF · BFP fleet model',      layer: 'L5', x: 1020, y: 670 },
];

// W17 Section A: edges enriched 26 → ~97 across all layer transitions.
const P2_KG_EDGES_DEF = [
  // L1 → L2 (12 edges · each person uses multiple SOPs)
  ['lim', 'sop-bfp-vibr'], ['lim', 'sop-safety'], ['lim', 'sop-loto'], ['lim', 'sop-wo-creation'],
  ['faye', 'sop-bfp-vibr'], ['faye', 'sop-escalation'], ['faye', 'sop-shift-handover'],
  ['ismail', 'sop-escalation'], ['ismail', 'sop-vibr-trending'],
  ['supervisor', 'sop-safety'], ['maint-lead', 'sop-maximo-entry'], ['hse-officer', 'sop-confined-space'],

  // L2 → L3 (16 edges)
  ['sop-bfp-vibr', 'bfp-3a'], ['sop-bfp-vibr', 'telemetry-vib'],
  ['sop-bfp-vibr', 'bearing-nde'], ['sop-bfp-vibr', 'bearing-de'],
  ['sop-safety', 'casing'], ['sop-vibr-trending', 'telemetry-vib'], ['sop-vibr-trending', 'sensor-bn3500'],
  ['sop-loto', 'bfp-3a'], ['sop-loto', 'suction-valve'], ['sop-loto', 'discharge-valve'],
  ['sop-overspeed', 'hrsg-3'], ['sop-overspeed', 'st-3'],
  ['sop-wo-creation', 'fm-race'], ['sop-maximo-entry', 'bfp-3a'],
  ['sop-confined-space', 'casing'], ['sop-shift-handover', 'telemetry-temp'],

  // L3 intra (26 edges · sub-assemblies → parent · sensors → monitored · asset chain)
  ['bfp-3a', 'bearing-nde'], ['bfp-3a', 'casing'], ['bfp-3a', 'coupling'],
  ['bfp-3a', 'impeller'], ['bfp-3a', 'shaft'], ['bfp-3a', 'seals'],
  ['bfp-3a', 'bearing-de'], ['bfp-3a', 'lube-oil'],
  ['bfp-3a', 'suction-valve'], ['bfp-3a', 'discharge-valve'],
  ['bfp-3a', 'manual-sulzer'],
  ['bearing-nde', 'fm-race'], ['casing', 'fm-crack'],
  ['shaft', 'fm-misalignment'], ['impeller', 'fm-imbalance'], ['impeller', 'fm-cavitation'],
  ['bearing-nde', 'telemetry-vib'], ['bearing-nde', 'telemetry-temp'],
  ['bearing-de', 'telemetry-temp'], ['sensor-bn3500', 'telemetry-vib'],
  // Asset chain (canonical): BFP-3A → HRSG-3 → ST-3 → GEN-3 → TX-3 → SY-A
  ['bfp-3a', 'hrsg-3'], ['hrsg-3', 'st-3'], ['st-3', 'gen-3'],
  ['gen-3', 'transformer-3'], ['transformer-3', 'switchyard-a'],
  ['manual-bn', 'sensor-bn3500'],

  // L3 → L4 (11 edges)
  ['telemetry-vib', 'vib-90d'], ['telemetry-temp', 'temp-30d'],
  ['telemetry-vib', 'trend-90d'], ['telemetry-temp', 'trend-90d'],
  ['telemetry-flow', 'spec-compliance'],
  ['bearing-nde', 'brg-replace-log'], ['bearing-de', 'brg-replace-log'],
  ['shaft', 'align-history'], ['coupling', 'align-history'],
  ['bfp-3a', 'maint-log'], ['hrsg-3', 'maint-log'],

  // L4 intra (9 edges)
  ['wo-jrg-2025', 'rca-jrg-2025'], ['wo-skr-2024', 'rca-banyan-2024'],
  ['wo-banyan-2024', 'rca-banyan-2024'], ['wo-tuas-2023', 'rca-sakra-coupling'],
  ['vib-90d', 'trend-90d'], ['temp-30d', 'trend-90d'],
  ['trend-90d', 'spec-compliance'], ['maint-log', 'align-history'],
  ['brg-replace-log', 'maint-log'],

  // L4 → L5 (11 edges)
  ['rca-jrg-2025', 'pattern-race'], ['rca-banyan-2024', 'pattern-crack'],
  ['vib-90d', 'pattern-race'], ['temp-30d', 'pattern-race'],
  ['rca-sakra-coupling', 'pattern-misalign'], ['align-history', 'pattern-misalign'],
  ['brg-replace-log', 'pattern-race'],
  ['spec-compliance', 'mtbf-model'], ['maint-log', 'mtbf-model'],
  ['trend-90d', 'pattern-imbalance'], ['wo-banyan-2024', 'pattern-cavitation'],

  // L5 intra + L5 → L3 (12 edges)
  ['pattern-race', 'derate-model'], ['pattern-crack', 'derate-model'],
  ['pattern-imbalance', 'derate-model'], ['pattern-misalign', 'derate-model'],
  ['pattern-cavitation', 'derate-model'],
  ['pattern-race', 'fm-race'], ['pattern-crack', 'fm-crack'],
  ['pattern-imbalance', 'fm-imbalance'], ['pattern-misalign', 'fm-misalignment'],
  ['oem-playbook', 'pattern-race'], ['oem-playbook', 'pattern-misalign'],
  ['mtbf-model', 'pattern-race'],

  // W18 Section D — L4 RCAs/telemetry → L4.5 tacit bytes → L5 patterns (8 edges · narrative:
  // tacit knowledge captured from past incidents now feeds predictive pattern recognition).
  ['rca-jrg-2025', 'tacit-1'], ['rca-banyan-2024', 'tacit-2'],
  ['vib-90d', 'tacit-3'], ['temp-30d', 'tacit-4'],
  ['tacit-1', 'pattern-race'], ['tacit-2', 'pattern-crack'],
  ['tacit-3', 'pattern-race'], ['tacit-5', 'pattern-crack'],
];

function getP2KGData() {
  return { nodes: P2_KG_NODES_DEF, edges: P2_KG_EDGES_DEF };
}

function renderP2KGSvg() {
  const { nodes, edges } = getP2KGData();
  // W17 Section A: width 800 → 1100 to fit 72-node 5-layer grid (10 nodes per L1/L2 row).
  // Height bumped to 840 to leave room for relocated tacit cluster below L5 (y=670).
  return buildKGSvg({ nodes, edges, persona: 'onsite', width: 1100, height: 840 });
}

// ── P3 (Priya · analyst) — all 8 layers ──
// W17 Section B: L6/L7/L8 each expanded 5 → 15 nodes (total P3 = 72 P2 + 45 P3-only = 117).
// Canvas widened 840→1100, height 1040→1500 to fit 8-layer commercial cluster.
function renderP3KGSvg() {
  const p2 = getP2KGData();

  const extraNodes = [
    // L6 Markets row 1 (y=800 · 8 nodes · spacing ~134px)
    { id: 'usep',                label: 'USEP · 30-min',          layer: 'L6', x: 80,   y: 800 },
    { id: 'usep-day-ahead',      label: 'USEP · day-ahead',       layer: 'L6', x: 214,  y: 800 },
    { id: 'lng-spot',            label: 'LNG spot · JKM',         layer: 'L6', x: 348,  y: 800 },
    { id: 'lng-charter',         label: 'LNG charter rate',       layer: 'L6', x: 482,  y: 800 },
    { id: 'gas-spot',            label: 'Gas spot index',         layer: 'L6', x: 616,  y: 800 },
    { id: 'coal-price',          label: 'Coal price · API4',      layer: 'L6', x: 750,  y: 800 },
    { id: 'carbon',              label: 'Carbon · CORSIA',        layer: 'L6', x: 884,  y: 800 },
    { id: 'weather',             label: 'Weather · SG 7-day',     layer: 'L6', x: 1020, y: 800 },

    // L6 Markets row 2 (y=870 · 7 nodes · spacing ~157px)
    { id: 'demand-q3',           label: 'Demand forecast Q3',     layer: 'L6', x: 80,   y: 870 },
    { id: 'vesting-price',       label: 'Vesting price',          layer: 'L6', x: 237,  y: 870 },
    { id: 'imbalance-settle',    label: 'Imbalance settlement',   layer: 'L6', x: 393,  y: 870 },
    { id: 'electricity-futures', label: 'Electricity futures',    layer: 'L6', x: 550,  y: 870 },
    { id: 'spinning-reserve',    label: 'Spinning reserve price', layer: 'L6', x: 707,  y: 870 },
    { id: 'reg-ancillary',       label: 'Regulatory ancillary',   layer: 'L6', x: 863,  y: 870 },
    { id: 'grid-rel-levy',       label: 'Grid-reliability levy',  layer: 'L6', x: 1020, y: 870 },

    // L7 Contracts row 1 (y=980 · 8 nodes)
    { id: 'ppa-pso',             label: 'PPA · PSO 2026',         layer: 'L7', x: 80,   y: 980 },
    { id: 'ppa-banyan-2025',     label: 'PPA · Banyan 2025',      layer: 'L7', x: 214,  y: 980 },
    { id: 'ppa-tuas-2028',       label: 'PPA · Tuas 2028',        layer: 'L7', x: 348,  y: 980 },
    { id: 'ppa-10yr',            label: 'PPA · 10-yr',            layer: 'L7', x: 482,  y: 980 },
    { id: 'ppa-5yr',             label: 'PPA · 5-yr',             layer: 'L7', x: 616,  y: 980 },
    { id: 'longterm-sakra',      label: 'Long-term · Sakra',      layer: 'L7', x: 750,  y: 980 },
    { id: 'vesting-baseline',    label: 'Vesting baseline',       layer: 'L7', x: 884,  y: 980 },
    { id: 'embedded-gen',        label: 'Embedded gen contract',  layer: 'L7', x: 1020, y: 980 },

    // L7 Contracts row 2 (y=1050 · 7 nodes)
    { id: 'hedges',              label: 'Hedge catalog',          layer: 'L7', x: 80,   y: 1050 },
    { id: 'futures',             label: 'Futures · SGD-Jul',      layer: 'L7', x: 237,  y: 1050 },
    { id: 'trader-hedge-book',   label: 'Trader hedge book',      layer: 'L7', x: 393,  y: 1050 },
    { id: 'spot-trader-desk',    label: 'Spot trader desk',       layer: 'L7', x: 550,  y: 1050 },
    { id: 'industrial-cust',     label: 'Industrial · CCAA',      layer: 'L7', x: 707,  y: 1050 },
    { id: 'esco-industrial',     label: 'ESCO industrial cust',   layer: 'L7', x: 863,  y: 1050 },
    { id: 'ancillary',           label: 'Ancillary services',     layer: 'L7', x: 1020, y: 1050 },

    // L8 Cross-site row 1 (y=1170 · 8 nodes)
    { id: 'banyan',              label: 'Banyan-CHP',             layer: 'L8', x: 80,   y: 1170 },
    { id: 'tuas-power',          label: 'Tuas-Power',             layer: 'L8', x: 214,  y: 1170 },
    { id: 'sakra-cogen',         label: 'Sakra-Cogen',            layer: 'L8', x: 348,  y: 1170 },
    { id: 'senoko',              label: 'Senoko',                 layer: 'L8', x: 482,  y: 1170 },
    { id: 'tuaspring',           label: 'Tuaspring',              layer: 'L8', x: 616,  y: 1170 },
    { id: 'ytl-power-seraya',    label: 'YTL PowerSeraya',        layer: 'L8', x: 750,  y: 1170 },
    { id: 'pulau-seraya',        label: 'Pulau Seraya',           layer: 'L8', x: 884,  y: 1170 },
    { id: 'interconnect-my',     label: 'Interconnector MY-SG',   layer: 'L8', x: 1020, y: 1170 },

    // L8 Cross-site row 2 (y=1240 · 7 nodes)
    { id: 'interconnect-id',     label: 'Interconnector IND-SG',  layer: 'L8', x: 80,   y: 1240 },
    { id: 'pasir-panjang-sw',    label: 'Pasir Panjang switching',layer: 'L8', x: 237,  y: 1240 },
    { id: 'bukit-panjang-fdr',   label: 'Bukit Panjang feeder',   layer: 'L8', x: 393,  y: 1240 },
    { id: 'tuas-substation',     label: 'Tuas substation',        layer: 'L8', x: 550,  y: 1240 },
    { id: 'jurong-substation',   label: 'Jurong substation',      layer: 'L8', x: 707,  y: 1240 },
    { id: 'sakra-intertie',      label: 'Sakra grid intertie',    layer: 'L8', x: 863,  y: 1240 },
    { id: 'grid-50hz',           label: 'Grid · 50 Hz',           layer: 'L8', x: 1020, y: 1240 },
  ];

  const extraEdges = [
    // L5 → L6 (8 edges · predictive feeds markets)
    ['derate-model', 'demand-q3'], ['pattern-crack', 'demand-q3'],
    ['derate-model', 'usep'], ['derate-model', 'imbalance-settle'],
    ['mtbf-model', 'spinning-reserve'], ['pattern-race', 'usep-day-ahead'],
    ['oem-playbook', 'reg-ancillary'], ['pattern-imbalance', 'electricity-futures'],

    // L6 intra (10 edges · markets internal cross-references)
    ['usep', 'lng-spot'], ['lng-spot', 'carbon'], ['weather', 'demand-q3'],
    ['usep', 'usep-day-ahead'], ['lng-spot', 'lng-charter'], ['lng-spot', 'gas-spot'],
    ['gas-spot', 'coal-price'], ['vesting-price', 'imbalance-settle'],
    ['electricity-futures', 'spinning-reserve'], ['reg-ancillary', 'grid-rel-levy'],

    // L6 → L7 (12 edges · markets feed contracts)
    ['usep', 'ppa-pso'], ['usep', 'hedges'], ['lng-spot', 'futures'],
    ['demand-q3', 'industrial-cust'],
    ['vesting-price', 'vesting-baseline'], ['usep-day-ahead', 'spot-trader-desk'],
    ['electricity-futures', 'trader-hedge-book'], ['lng-charter', 'longterm-sakra'],
    ['spinning-reserve', 'ancillary'], ['reg-ancillary', 'ancillary'],
    ['grid-rel-levy', 'embedded-gen'], ['imbalance-settle', 'hedges'],

    // L7 intra (10 edges · contracts internal)
    ['ppa-pso', 'hedges'], ['hedges', 'futures'], ['ppa-pso', 'ancillary'],
    ['ppa-banyan-2025', 'ppa-pso'], ['ppa-tuas-2028', 'ppa-10yr'],
    ['ppa-10yr', 'ppa-5yr'], ['longterm-sakra', 'ppa-10yr'],
    ['trader-hedge-book', 'spot-trader-desk'], ['esco-industrial', 'industrial-cust'],
    ['vesting-baseline', 'ppa-pso'],

    // L7 → L8 (10 edges · contracts bound to sites)
    ['ppa-pso', 'banyan'], ['ancillary', 'tuas-power'], ['hedges', 'sakra-cogen'],
    ['ppa-banyan-2025', 'banyan'], ['ppa-tuas-2028', 'tuas-power'],
    ['longterm-sakra', 'sakra-cogen'], ['ppa-10yr', 'senoko'],
    ['ppa-5yr', 'tuaspring'], ['embedded-gen', 'ytl-power-seraya'],
    ['esco-industrial', 'pulau-seraya'],

    // L8 intra (8 edges · cross-site grid topology)
    ['banyan', 'tuas-power'], ['tuas-power', 'interconnect-my'], ['sakra-cogen', 'grid-50hz'],
    ['senoko', 'tuaspring'], ['tuas-substation', 'tuas-power'],
    ['jurong-substation', 'banyan'], ['pasir-panjang-sw', 'bukit-panjang-fdr'],
    ['sakra-intertie', 'interconnect-id'],

    // L8 → L3 (1 edge · cross-site touches plant)
    ['banyan', 'bfp-3a'],
  ];

  return buildKGSvg({
    nodes: [...p2.nodes, ...extraNodes],
    edges: [...p2.edges, ...extraEdges],
    persona: 'analyst',
    width: 1100,
    height: 1500,
  });
}

function buildKGSvg({ nodes, edges, persona, width, height }) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  // Edges first (behind nodes per SVG z-order)
  const edgesHtml = edges.map(([srcId, dstId]) => {
    const s = nodeMap[srcId], d = nodeMap[dstId];
    if (!s || !d) {
      console.warn(`[KG] orphan edge skipped: ${srcId} → ${dstId}`);
      return '';
    }
    return `<line class="kg-svg-edge" data-src="${srcId}" data-dst="${dstId}" x1="${s.x}" y1="${s.y}" x2="${d.x}" y2="${d.y}" />`;
  }).join('');

  // W18 Section D — static tacit cluster removed. Tacit bytes now first-class nodes embedded as
  // L4.5 in the main P2_KG_NODES_DEF list (rendered as diamonds via the isTacit branch below),
  // participate in the force sim, and connect to L4 RCAs/telemetry + L5 patterns via real edges.
  const tacitHtml = '';

  // W18 follow-up — dashed marching workflow arrows removed per Pulkit's call (visual noise on
  // top of the enriched 77-node graph · static edges already convey L2→L3 connection).
  const arrowsHtml = '';

  // Nodes last (z-order: above edges/arrows). W18 Section D — tacit nodes render as rotated
  // rect (diamond) but keep the .kg-svg-node selector so drag + click-highlight apply uniformly.
  const nodesHtml = nodes.map(n => {
    if (n.isTacit) {
      const color = n.tacitState === 'triaged' ? '#10B981' : '#94A3B8';
      return `
      <g class="kg-svg-node kg-svg-tacit-node" data-id="${n.id}" data-layer="${n.layer}" data-tacit-state="${n.tacitState}" transform="translate(${n.x},${n.y})">
        <rect class="kg-svg-node-shape" x="-9" y="-9" width="18" height="18" fill="${color}" stroke="white" stroke-width="2" transform="rotate(45)" />
        <text class="kg-svg-label" y="26" text-anchor="middle">${n.label}</text>
      </g>`;
    }
    const color = KG_LAYER_COLORS[n.layer] || '#94A3B8';
    return `
      <g class="kg-svg-node" data-id="${n.id}" data-layer="${n.layer}" transform="translate(${n.x},${n.y})">
        <circle class="kg-svg-node-circle" r="9" fill="${color}" stroke="white" stroke-width="2" />
        <text class="kg-svg-label" y="22" text-anchor="middle">${n.label}</text>
      </g>`;
  }).join('');

  return `
    <svg class="kg-svg" data-persona="${persona}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMin meet" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="kg-arrow-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L6,3 L0,6 z" fill="#10B981" />
        </marker>
      </defs>
      ${edgesHtml}
      ${arrowsHtml}
      ${tacitHtml}
      ${nodesHtml}
    </svg>`;
}

// ═══════════════════════════════════════════════
// W17 Sections C-F — Force simulation + drag + live edge tracking
// ═══════════════════════════════════════════════

// Module-level simulation state. One sim runs at a time (whichever KG is open).
const KG_SIM = {
  persona: null,
  nodes: [],   // each: { id, x, y, vx, vy, initialX, initialY, pinned, layer, label }
  edges: [],   // each: [srcId, dstId]
  active: false,
  rafId: null,
  dragHandlers: null,  // { onMouseMove, onMouseUp } document-level cleanup
  dragActive: false,   // W18 Section C — true while a node is being dragged (freezes tilt)
};

// Physics constants (Obsidian-style settling). Tune ±2x range if visual settles poorly.
const KG_SIM_REPULSION = 600;
const KG_SIM_SPRING_K = 0.012;
const KG_SIM_SPRING_LEN = 100;
const KG_SIM_GRAVITY_K = 0.005;
const KG_SIM_DAMPING = 0.82;

function initKGSimulation(persona) {
  const data = (persona === 'onsite')
    ? getP2KGData()
    : (() => {
        // Re-extract P3 data by parsing the rendered SVG node defs would be wasteful.
        // Instead re-execute the P3 enrichment by reading from the live DOM nodes.
        const mount = document.querySelector('#kg-svg-mount');
        if (!mount) return { nodes: [], edges: [] };
        const nodes = Array.from(mount.querySelectorAll('.kg-svg-node')).map(g => {
          const tr = g.getAttribute('transform') || '';
          const m = tr.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
          return {
            id: g.dataset.id,
            label: g.dataset.id,
            layer: g.dataset.layer,
            x: m ? parseFloat(m[1]) : 0,
            y: m ? parseFloat(m[2]) : 0,
          };
        });
        const edges = Array.from(mount.querySelectorAll('.kg-svg-edge')).map(e => [e.dataset.src, e.dataset.dst]);
        return { nodes, edges };
      })();

  stopKGSimulation();  // cancel any prior loop

  KG_SIM.persona = persona;
  KG_SIM.nodes = data.nodes.map(n => ({
    ...n,
    vx: 0, vy: 0,
    initialX: n.x, initialY: n.y,
    pinned: false,
  }));
  KG_SIM.edges = data.edges;
  KG_SIM.active = true;
  KG_SIM.rafId = requestAnimationFrame(tickKGSimulation);
}

function tickKGSimulation() {
  if (!KG_SIM.active) return;

  const nodeMap = Object.fromEntries(KG_SIM.nodes.map(n => [n.id, n]));

  // 1. Repulsion between all node pairs (O(n²) · fine for n<150).
  for (let i = 0; i < KG_SIM.nodes.length; i++) {
    for (let j = i + 1; j < KG_SIM.nodes.length; j++) {
      const a = KG_SIM.nodes[i];
      const b = KG_SIM.nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 1) continue;
      const d = Math.sqrt(d2);
      const f = KG_SIM_REPULSION / d2;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      if (!a.pinned) { a.vx -= fx; a.vy -= fy; }
      if (!b.pinned) { b.vx += fx; b.vy += fy; }
    }
  }

  // 2. Spring force on edges (Hooke's law toward rest length).
  KG_SIM.edges.forEach(([srcId, dstId]) => {
    const s = nodeMap[srcId];
    const d = nodeMap[dstId];
    if (!s || !d) return;
    const dx = d.x - s.x;
    const dy = d.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    const f = KG_SIM_SPRING_K * (dist - KG_SIM_SPRING_LEN);
    const fx = (dx / dist) * f;
    const fy = (dy / dist) * f;
    if (!s.pinned) { s.vx += fx; s.vy += fy; }
    if (!d.pinned) { d.vx -= fx; d.vy -= fy; }
  });

  // 3. Gravity pulls each node toward its initial position (prevents drift).
  KG_SIM.nodes.forEach(n => {
    if (n.pinned) return;
    n.vx += (n.initialX - n.x) * KG_SIM_GRAVITY_K;
    n.vy += (n.initialY - n.y) * KG_SIM_GRAVITY_K;
  });

  // 4. Damping + integrate velocities → positions.
  KG_SIM.nodes.forEach(n => {
    if (n.pinned) return;
    n.vx *= KG_SIM_DAMPING;
    n.vy *= KG_SIM_DAMPING;
    n.x += n.vx;
    n.y += n.vy;
  });

  // 5. Sync to SVG.
  renderKGSimulationFrame();

  KG_SIM.rafId = requestAnimationFrame(tickKGSimulation);
}

function renderKGSimulationFrame() {
  const win = document.getElementById('kg-floating-window');
  if (!win) return;

  KG_SIM.nodes.forEach(n => {
    const g = win.querySelector(`.kg-svg-node[data-id="${n.id}"]`);
    if (g) g.setAttribute('transform', `translate(${n.x},${n.y})`);
  });

  const nodeMap = Object.fromEntries(KG_SIM.nodes.map(n => [n.id, n]));
  win.querySelectorAll('.kg-svg-edge').forEach(line => {
    const s = nodeMap[line.dataset.src];
    const d = nodeMap[line.dataset.dst];
    if (!s || !d) return;
    line.setAttribute('x1', s.x);
    line.setAttribute('y1', s.y);
    line.setAttribute('x2', d.x);
    line.setAttribute('y2', d.y);
  });
}

function stopKGSimulation() {
  KG_SIM.active = false;
  if (KG_SIM.rafId) {
    cancelAnimationFrame(KG_SIM.rafId);
    KG_SIM.rafId = null;
  }
  // Detach document-level drag listeners (no zombie handlers across persona switches).
  if (KG_SIM.dragHandlers) {
    document.removeEventListener('mousemove', KG_SIM.dragHandlers.onMouseMove);
    document.removeEventListener('mouseup', KG_SIM.dragHandlers.onMouseUp);
    KG_SIM.dragHandlers = null;
  }
}

function resetKGSimulation() {
  KG_SIM.nodes.forEach(n => {
    n.x = n.initialX;
    n.y = n.initialY;
    n.vx = 0;
    n.vy = 0;
    n.pinned = false;
  });
  renderKGSimulationFrame();
}

function wireKGSvgInteractions(mount) {
  const svg = mount.querySelector('.kg-svg');
  if (!svg) return;

  // W17 Section D + F — click-vs-drag disambiguation via 4px mousemove threshold.
  // Track per-node mousedown · accumulate deltas · classify at mouseup.
  const CLICK_THRESHOLD = 4;
  let active = null;  // { node, id, startClientX, startClientY, moved, dragged, svgRect, viewBox }

  function applyClickHighlight(id) {
    mount.querySelectorAll('.kg-svg-edge').forEach(edge => {
      edge.classList.remove('kg-svg-edge-highlight');
      edge.classList.add('kg-svg-edge-dim');
    });
    mount.querySelectorAll(`.kg-svg-edge[data-src="${id}"], .kg-svg-edge[data-dst="${id}"]`).forEach(edge => {
      edge.classList.add('kg-svg-edge-highlight');
      edge.classList.remove('kg-svg-edge-dim');
    });
  }

  function clearHighlight() {
    mount.querySelectorAll('.kg-svg-edge').forEach(edge => {
      edge.classList.remove('kg-svg-edge-highlight', 'kg-svg-edge-dim');
    });
  }

  mount.querySelectorAll('.kg-svg-node').forEach(g => {
    g.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      const id = g.dataset.id;
      const n = KG_SIM.nodes.find(x => x.id === id);
      if (!n) return;
      const svgEl = mount.querySelector('.kg-svg');
      const svgRect = svgEl.getBoundingClientRect();
      const vb = (svgEl.getAttribute('viewBox') || '0 0 1 1').split(/\s+/).map(parseFloat);
      active = {
        node: n,
        id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        moved: 0,
        dragged: false,
        svgRect,
        viewBoxW: vb[2],
        viewBoxH: vb[3],
        gEl: g,
      };
    });
  });

  function onMouseMove(e) {
    if (!active) return;
    const dx = e.clientX - active.startClientX;
    const dy = e.clientY - active.startClientY;
    active.moved = Math.sqrt(dx * dx + dy * dy);

    // Only flip to drag mode once threshold exceeded — preserves W16 click-highlight for small clicks.
    if (!active.dragged && active.moved >= CLICK_THRESHOLD) {
      active.dragged = true;
      active.node.pinned = true;
      active.node.vx = 0;
      active.node.vy = 0;
      active.gEl.classList.add('kg-svg-node-dragging');
      KG_SIM.dragActive = true;  // W18 Section C — freezes parallax tilt during drag
    }

    if (active.dragged) {
      const scaleX = active.viewBoxW / active.svgRect.width;
      const scaleY = active.viewBoxH / active.svgRect.height;
      active.node.x = (e.clientX - active.svgRect.left) * scaleX;
      active.node.y = (e.clientY - active.svgRect.top) * scaleY;
    }
  }

  function onMouseUp() {
    if (!active) return;
    if (!active.dragged) {
      // Treated as click → highlight (W16 behavior preserved).
      applyClickHighlight(active.id);
    } else {
      // Drag end → unpin · let physics ease neighbors back into place.
      active.node.pinned = false;
      active.gEl.classList.remove('kg-svg-node-dragging');
    }
    KG_SIM.dragActive = false;  // W18 Section C — re-enables parallax tilt
    active = null;
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  KG_SIM.dragHandlers = { onMouseMove, onMouseUp };  // tracked for cleanup in stopKGSimulation

  // Click empty SVG area → clear highlights (preserved from W16).
  svg.addEventListener('click', e => {
    if (e.target === svg || e.target.tagName === 'svg') {
      clearHighlight();
    }
  });
}

// W18 Section C — mouse-parallax tilt on .kg-svg. Tilt freezes during node drag
// (KG_SIM.dragActive flag set by wireKGSvgInteractions). rAF-coalesced so mousemove spam doesn't
// thrash the style attribute. Tilt resets on mouseleave.
function wireKGParallaxTilt(body) {
  const svg = body.querySelector('.kg-svg');
  if (!svg) return;

  const maxTiltDeg = 8;
  let rafPending = false;
  let lastClientX = 0;
  let lastClientY = 0;

  function updateTilt() {
    rafPending = false;
    if (KG_SIM.dragActive) return;  // freeze tilt while dragging a node
    const rect = body.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const nx = (lastClientX - cx) / (rect.width / 2);
    const ny = (lastClientY - cy) / (rect.height / 2);
    const rotateY = Math.max(-1, Math.min(1, nx)) * maxTiltDeg;
    const rotateX = -Math.max(-1, Math.min(1, ny)) * maxTiltDeg;
    svg.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }

  body.addEventListener('mousemove', e => {
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(updateTilt);
    }
  });

  body.addEventListener('mouseleave', () => {
    svg.style.transform = 'rotateX(0deg) rotateY(0deg)';
  });
}

function initFloatingWindowHandlers() {
  const win = document.getElementById('kg-floating-window');
  if (!win) return;
  const titlebar = win.querySelector('.kg-fw-titlebar');
  const resizeHandle = win.querySelector('.kg-fw-resize');
  const closeBtn = win.querySelector('#kg-fw-close');
  const resetBtn = win.querySelector('#kg-fw-reset');

  // W17 Section G — reset positions
  if (resetBtn) {
    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (typeof resetKGSimulation === 'function' && KG_SIM.active) resetKGSimulation();
    });
  }

  // Drag — title bar
  let dragStart = null;
  titlebar.addEventListener('mousedown', e => {
    if (e.target.closest('.kg-fw-action')) return;
    const rect = win.getBoundingClientRect();
    dragStart = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      winX: rect.left,
      winY: rect.top,
    };
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragStart) return;
    const dx = e.clientX - dragStart.mouseX;
    const dy = e.clientY - dragStart.mouseY;
    let newX = dragStart.winX + dx;
    let newY = dragStart.winY + dy;
    const w = win.offsetWidth;
    const h = win.offsetHeight;
    newX = Math.max(-w + 80, Math.min(window.innerWidth - 80, newX));
    newY = Math.max(0, Math.min(window.innerHeight - 40, newY));
    win.style.left = newX + 'px';
    win.style.top = newY + 'px';
    state.graphWinPos = { x: newX, y: newY };
  });

  document.addEventListener('mouseup', () => { dragStart = null; });

  // Resize — bottom-right handle
  let resizeStart = null;
  resizeHandle.addEventListener('mousedown', e => {
    resizeStart = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      winW: win.offsetWidth,
      winH: win.offsetHeight,
    };
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('mousemove', e => {
    if (!resizeStart) return;
    const dx = e.clientX - resizeStart.mouseX;
    const dy = e.clientY - resizeStart.mouseY;
    const newW = Math.max(280, resizeStart.winW + dx);
    const newH = Math.max(220, resizeStart.winH + dy);
    win.style.width = newW + 'px';
    win.style.height = newH + 'px';
    state.graphWinSize = { w: newW, h: newH };
    if (KG_STATE.graph) {
      const body = win.querySelector('.kg-fw-body');
      KG_STATE.graph.width(body.clientWidth).height(body.clientHeight);
    }
  });

  document.addEventListener('mouseup', () => { resizeStart = null; });

  // Close
  closeBtn.addEventListener('click', () => {
    if (!state.graphWinOpen) return;
    toggleGraphWindow();
  });
}

function initRightPaneToolbar() {
  const logsBtn = document.getElementById('btn-display-logs');
  const graphBtn = document.getElementById('btn-display-graph');
  if (logsBtn) logsBtn.addEventListener('click', toggleLogDropdown);
  if (graphBtn) graphBtn.addEventListener('click', toggleGraphWindow);
  updateLogCountBadge();
  updateGraphCountBadge();
}

// ─────────────────────────────────────────────
// W3.8 — Right-pane drawer toggle
// ─────────────────────────────────────────────
function toggleDrawer() {
  state.drawerOpen = !state.drawerOpen;
  const stage = document.getElementById('stage');
  const toggleBtn = document.getElementById('drawer-toggle');
  if (!stage || !toggleBtn) return;
  if (state.drawerOpen) {
    stage.setAttribute('data-drawer', 'open');
    toggleBtn.dataset.state = 'open';
  } else {
    stage.removeAttribute('data-drawer');
    toggleBtn.dataset.state = 'closed';
    // Auto-close KG floating window if it's open.
    if (state.graphWinOpen) {
      toggleGraphWindow();
    }
  }
}

function initDrawer() {
  const toggleBtn = document.getElementById('drawer-toggle');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleDrawer);
}

// W3.6 — OCR document modal (IEEE 1159 § 4.2 wired)
function openDocModal(docRef) {
  const modal = document.getElementById('doc-modal');
  if (!modal) return;
  // For W3.6 only IEEE-1159 is wired; future refs can swap modal contents per docRef.
  modal.dataset.open = 'true';
}
function closeDocModal() {
  const modal = document.getElementById('doc-modal');
  if (!modal) return;
  modal.dataset.open = 'false';
}
function initDocModal() {
  // Delegated click on .dyn-entity-ref (rebuilt every render) — bind on body once.
  document.body.addEventListener('click', e => {
    const ref = e.target.closest('.dyn-entity-ref');
    if (ref) {
      e.preventDefault();
      openDocModal(ref.dataset.docRef);
      return;
    }
    if (e.target.closest('#doc-modal-close, #doc-modal-overlay')) {
      closeDocModal();
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDocModal();
  });
}

function init() {
  render();
  initKG3D();
  initFloatingWindowHandlers();
  initRightPaneToolbar();
  initDrawer();
  initDocModal();
  initSourcesModal();
  initTranscriptModal();
  // W3.10 — telemetry modal ESC-to-close
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const m = document.getElementById('telemetry-modal');
    if (m && m.dataset.open === 'true') closeTelemetryModal();
  });
  seedLogLines();
  updateLogCountBadge();
  updateGraphCountBadge();
  initAgentCardStates();
  updateAgentDimmingForActivePersona();
  // W10 A.5 — relocate agent buckets into log dropdown as 2-tab switcher.
  // Runs AFTER seedLogLines + initAgentCardStates so orch-log + agent cards are populated before reparenting.
  initLogDropdownTabs();
  // Part 3 switch (persona header) — wordless toggle
  const actToggle = document.getElementById('act-toggle');
  if (actToggle) actToggle.addEventListener('click', () => setPart3(!state.part3));
  syncActSwitch();
}

document.addEventListener('DOMContentLoaded', init);
