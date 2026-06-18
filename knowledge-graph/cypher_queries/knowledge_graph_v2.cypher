// =============================================================
// Neo4j Import — BFP NDE Vibration KNOWLEDGE GRAPH (SYM-001)
//
// Knowledge-centric, bounded by the diagnostic domain (no incidents).
//
// Topology — tests are a layer ON the diagnostic path, with lightweight
// outcome-conditional sequencing (Option A):
//
//   (Symptom)-[:OCCURS_IN]->(AssetClass)
//   (Symptom)-[:TRIGGERS {order}]->(DiagnosticTest)
//   (DiagnosticTest)-[:CONFIRMS  {band, probability}]->(RootCause)
//   (DiagnosticTest)-[:RULES_OUT {band, probability}]->(RootCause)
//   (DiagnosticTest)-[:THEN_IF {result}]->(DiagnosticTest)  // branch on outcome
//
// SEQUENCING:
//   - `order` on TRIGGERS = default suggested order (cheap/decisive first).
//   - THEN_IF {result} = conditional next test. The `result` string is the
//     outcome of the SOURCE test that makes the TARGET test worth running
//     (e.g. "inconclusive", "negative"). This is the lightweight form — the
//     outcome is an edge property, not its own node. Production would promote
//     outcomes to TestOutcome nodes to attach probability per-outcome.
//
// PROBABILITY lives on the test->cause edge: how diagnostic a positive
// result on that test is for that cause. Coarse band (high/med/low) plus a
// representative numeric. Live per-incident ranking is computed by the app,
// not stored.
//
// Nodes first, then relationships matched by id (order-independent, re-runnable).
// =============================================================


// -------------------------------------------------------------
// NODES
// -------------------------------------------------------------

// ---- Asset class ----
MERGE (ac:AssetClass {id: "AC-BFP"})
  SET ac.name        = "Boiler feed pump (BFP)",
      ac.description = "High-pressure multistage boiler feed pump class";

// ---- Symptom ----
MERGE (sym:Symptom {id: "SYM-001"})
  SET sym.name        = "BFP NDE Vibration High (Zone C)",
      sym.description = "NDE bearing-housing vibration RMS exceeds ISO 10816-7 Zone C alarm threshold",
      sym.severity    = "Amber",
      sym.urgency     = "Immediate";

// ---- Diagnostic tests (the discriminating layer) ----
MERGE (dt:DiagnosticTest {id: "DT-PHASE"})
  SET dt.name           = "Vibration phase / spectrum analysis",
      dt.method         = "Compare NDE-DE phase and harmonic content",
      dt.cost_band      = "low",
      dt.required_certs = ["ISO 10816-7 Vibration Analysis"];

MERGE (dt:DiagnosticTest {id: "DT-HOUSING-INSPECT"})
  SET dt.name           = "NDE bearing housing inspection",
      dt.method         = "Visual / borescope inspection of NDE bearing race",
      dt.cost_band      = "low",
      dt.required_certs = ["Sulzer BFP Maintenance"];

MERGE (dt:DiagnosticTest {id: "DT-OIL-ANALYSIS"})
  SET dt.name           = "Lubricant / oil debris analysis",
      dt.method         = "Sample bearing oil; ferrography + particle count",
      dt.cost_band      = "med",
      dt.required_certs = ["Lubrication Analysis Level 1"];

MERGE (dt:DiagnosticTest {id: "DT-THERMOGRAPHY"})
  SET dt.name           = "Infrared thermography",
      dt.method         = "Thermal imaging of bearing housing under load",
      dt.cost_band      = "low",
      dt.required_certs = ["Thermography Level 1"];

MERGE (dt:DiagnosticTest {id: "DT-RUNOUT"})
  SET dt.name           = "Dial-indicator shaft runout test",
      dt.method         = "Dial indicator on shaft, measure total indicated runout",
      dt.cost_band      = "med",
      dt.required_certs = ["Rotating Equipment Specialist", "ISO 10816-7 Vibration Analysis"];

MERGE (dt:DiagnosticTest {id: "DT-ALIGNMENT"})
  SET dt.name           = "Laser shaft alignment check",
      dt.method         = "Laser alignment of pump-driver coupling",
      dt.cost_band      = "med",
      dt.required_certs = ["Laser Alignment Certified", "Rotating Equipment Specialist"];

// ---- Root causes ----
MERGE (rc:RootCause {id: "RC-BEARING-SPALL"})
  SET rc.name        = "Bearing race spalling",
      rc.description = "NDE bearing race surface fatigue / spalling";

MERGE (rc:RootCause {id: "RC-BENT-SHAFT"})
  SET rc.name        = "Bent shaft",
      rc.description = "Shaft bow (mechanical or thermal) driving 1xRPM vibration";

MERGE (rc:RootCause {id: "RC-LUBE-FAIL"})
  SET rc.name        = "Lubrication failure",
      rc.description = "Oil starvation / contamination degrading the NDE bearing";

MERGE (rc:RootCause {id: "RC-MISALIGN"})
  SET rc.name        = "Coupling misalignment",
      rc.description = "Pump-driver misalignment driving 2xRPM vibration and bearing load";


// -------------------------------------------------------------
// RELATIONSHIPS
// -------------------------------------------------------------

// ---- Symptom scoped to asset class ----
MATCH (sym:Symptom {id: "SYM-001"}), (ac:AssetClass {id: "AC-BFP"})
MERGE (sym)-[:OCCURS_IN]->(ac);

// ---- Symptom -> tests to run (TRIGGERS; order = cheap/decisive first) ----
// Phase analysis goes first: cheap, non-invasive, and discriminates the most.
MATCH (sym:Symptom {id: "SYM-001"}), (dt:DiagnosticTest {id: "DT-PHASE"})
MERGE (sym)-[r:TRIGGERS]->(dt) SET r.order = 1;

MATCH (sym:Symptom {id: "SYM-001"}), (dt:DiagnosticTest {id: "DT-HOUSING-INSPECT"})
MERGE (sym)-[r:TRIGGERS]->(dt) SET r.order = 2;

MATCH (sym:Symptom {id: "SYM-001"}), (dt:DiagnosticTest {id: "DT-THERMOGRAPHY"})
MERGE (sym)-[r:TRIGGERS]->(dt) SET r.order = 3;

// ---- Conditional sequencing (THEN_IF {result}) ----
// Phase analysis is the triage test. Its outcome routes to the next test:
//   - harmonic signature points to bearing  -> confirm with housing inspection
//   - 1xRPM dominant (shaft-like)            -> confirm with runout test
//   - 2xRPM dominant (misalignment-like)     -> confirm with alignment check
//   - inconclusive                           -> escalate to oil analysis
MATCH (a:DiagnosticTest {id: "DT-PHASE"}), (b:DiagnosticTest {id: "DT-HOUSING-INSPECT"})
MERGE (a)-[:THEN_IF {result: "bearing harmonics present"}]->(b);

MATCH (a:DiagnosticTest {id: "DT-PHASE"}), (b:DiagnosticTest {id: "DT-RUNOUT"})
MERGE (a)-[:THEN_IF {result: "1xRPM dominant"}]->(b);

MATCH (a:DiagnosticTest {id: "DT-PHASE"}), (b:DiagnosticTest {id: "DT-ALIGNMENT"})
MERGE (a)-[:THEN_IF {result: "2xRPM dominant"}]->(b);

MATCH (a:DiagnosticTest {id: "DT-PHASE"}), (b:DiagnosticTest {id: "DT-OIL-ANALYSIS"})
MERGE (a)-[:THEN_IF {result: "inconclusive"}]->(b);

// Housing inspection inconclusive -> oil analysis to catch early lube failure.
MATCH (a:DiagnosticTest {id: "DT-HOUSING-INSPECT"}), (b:DiagnosticTest {id: "DT-OIL-ANALYSIS"})
MERGE (a)-[:THEN_IF {result: "no visible spalling"}]->(b);

// ---- Test -> root cause (probability = how diagnostic the test is) ----
// Phase analysis triages toward multiple causes at moderate confidence.
MATCH (dt:DiagnosticTest {id: "DT-PHASE"}), (rc:RootCause {id: "RC-BENT-SHAFT"})
MERGE (dt)-[r:CONFIRMS]->(rc) SET r.band = "high", r.probability = 0.88;

MATCH (dt:DiagnosticTest {id: "DT-PHASE"}), (rc:RootCause {id: "RC-MISALIGN"})
MERGE (dt)-[r:CONFIRMS]->(rc) SET r.band = "med", r.probability = 0.7;

// Housing inspection: confirms spalling, rules out shaft.
MATCH (dt:DiagnosticTest {id: "DT-HOUSING-INSPECT"}), (rc:RootCause {id: "RC-BEARING-SPALL"})
MERGE (dt)-[r:CONFIRMS]->(rc) SET r.band = "high", r.probability = 0.95;

MATCH (dt:DiagnosticTest {id: "DT-HOUSING-INSPECT"}), (rc:RootCause {id: "RC-BENT-SHAFT"})
MERGE (dt)-[r:RULES_OUT]->(rc) SET r.band = "med", r.probability = 0.6;

// Oil analysis: confirms lube failure; metal debris also supports spalling.
MATCH (dt:DiagnosticTest {id: "DT-OIL-ANALYSIS"}), (rc:RootCause {id: "RC-LUBE-FAIL"})
MERGE (dt)-[r:CONFIRMS]->(rc) SET r.band = "high", r.probability = 0.9;

MATCH (dt:DiagnosticTest {id: "DT-OIL-ANALYSIS"}), (rc:RootCause {id: "RC-BEARING-SPALL"})
MERGE (dt)-[r:CONFIRMS]->(rc) SET r.band = "med", r.probability = 0.65;

// Thermography: hot bearing supports lube failure / spalling.
MATCH (dt:DiagnosticTest {id: "DT-THERMOGRAPHY"}), (rc:RootCause {id: "RC-LUBE-FAIL"})
MERGE (dt)-[r:CONFIRMS]->(rc) SET r.band = "med", r.probability = 0.7;

MATCH (dt:DiagnosticTest {id: "DT-THERMOGRAPHY"}), (rc:RootCause {id: "RC-BEARING-SPALL"})
MERGE (dt)-[r:CONFIRMS]->(rc) SET r.band = "low", r.probability = 0.45;

// Runout: confirms bent shaft strongly.
MATCH (dt:DiagnosticTest {id: "DT-RUNOUT"}), (rc:RootCause {id: "RC-BENT-SHAFT"})
MERGE (dt)-[r:CONFIRMS]->(rc) SET r.band = "high", r.probability = 0.9;

// Alignment check: confirms misalignment; rules out bent shaft if aligned-but-bowed.
MATCH (dt:DiagnosticTest {id: "DT-ALIGNMENT"}), (rc:RootCause {id: "RC-MISALIGN"})
MERGE (dt)-[r:CONFIRMS]->(rc) SET r.band = "high", r.probability = 0.92;

MATCH (dt:DiagnosticTest {id: "DT-ALIGNMENT"}), (rc:RootCause {id: "RC-BENT-SHAFT"})
MERGE (dt)-[r:RULES_OUT]->(rc) SET r.band = "low", r.probability = 0.4;
