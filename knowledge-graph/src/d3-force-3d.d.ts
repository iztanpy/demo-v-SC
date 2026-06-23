// Minimal ambient declaration — d3-force-3d ships no types. We only need the force factories,
// used loosely (`any`) to feed 3d-force-graph's .d3Force() slots. KGForce3D uses them imperatively.
declare module 'd3-force-3d'
