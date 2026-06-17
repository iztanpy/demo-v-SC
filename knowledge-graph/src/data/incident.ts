import type { KGNode, KGEdge } from '../types'

// Hardcoded incident cluster for INC-2026-0537 (BFP-3A bent shaft).
// Coordinates are authored against a 1040 × 660 viewBox. Left→right reading:
// symptom (anchor) → past-incident matches → diagnoses → work orders / tech / outcome.
export const VIEWBOX = { w: 1040, h: 660 }

export const NODES: KGNode[] = [
  { id: 'symptom', title: 'Symptom', sub: 'NDE vib 8.4 mm/s · Zone C', state: 'confirmed', cx: 130, cy: 330, step: 1 },

  // past-incident matches (fleet memory)
  { id: 'pi-jrg', title: 'Jurong-CCGT-2', sub: 'BFP race spalling', state: 'history', cx: 370, cy: 110, step: 1 },
  { id: 'pi-skr', title: 'Sakra-CCGT-1', sub: 'coupling wear', state: 'history', cx: 370, cy: 235, step: 1 },
  { id: 'pi-banyan', title: 'Banyan-CHP', sub: 'bent shaft · 1×RPM', state: 'history', cx: 370, cy: 560, step: 1 },

  // initial (wrong) diagnosis → relabelled incorrect at step 7
  { id: 'dx-init', title: 'Dx · bearing race spalling', sub: '78% · pattern match', state: 'proposed', cx: 620, cy: 200, step: 2 },

  // work order + technician for the initial diagnosis
  { id: 'wo-1', title: 'WO-1', sub: 'bearing inspection', state: 'proposed', cx: 870, cy: 110, step: 3 },
  { id: 'tech-lim', title: 'Lim Wei Jie', sub: 'Sulzer BFP cert ✓', state: 'selected', cx: 870, cy: 250, step: 3 },

  // corrected diagnosis + its work order
  { id: 'dx-corr', title: 'Dx · bent shaft', sub: 'runout + 1×RPM phase', state: 'proposed', cx: 620, cy: 480, step: 6 },
  { id: 'wo-2', title: 'WO-2', sub: 'shaft straighten / replace', state: 'proposed', cx: 870, cy: 440, step: 6 },

  // outcome / remedy (kept separate from diagnosis)
  { id: 'outcome', title: 'Outcome · success', sub: 'shaft replaced · 6.1 mm/s', state: 'success', cx: 870, cy: 575, step: 8 },
]

export const EDGES: KGEdge[] = [
  // step 1 — symptom matched against fleet precedents
  { source: 'symptom', target: 'pi-jrg', kind: 'normal', step: 1 },
  { source: 'symptom', target: 'pi-skr', kind: 'normal', step: 1 },
  { source: 'symptom', target: 'pi-banyan', kind: 'normal', step: 1 },

  // step 2 — initial diagnosis linked to symptom
  { source: 'symptom', target: 'dx-init', kind: 'normal', step: 2 },

  // step 3 — work order + technician
  { source: 'dx-init', target: 'wo-1', kind: 'normal', step: 3 },
  { source: 'wo-1', target: 'tech-lim', kind: 'normal', step: 3 },

  // step 6 — corrected diagnosis (re-query path + bent-shaft precedent)
  { source: 'symptom', target: 'dx-corr', kind: 'normal', step: 6 },
  { source: 'pi-banyan', target: 'dx-corr', kind: 'normal', step: 6 },
  { source: 'dx-corr', target: 'wo-2', kind: 'normal', step: 6 },

  // step 7 — ⭐ the signature: wrong node kept, linked corrected-by → right node
  { source: 'dx-init', target: 'dx-corr', kind: 'corrected-by', step: 7 },

  // step 8 — outcome attached
  { source: 'dx-corr', target: 'outcome', kind: 'normal', step: 8 },
]
