// =============================================================
// Neo4j Import — BFP NDE Vibration Incidents (SYM-001)
// Historical reference incidents for the BFP NDE-vibration symptom class. The live
// NGT-CCGT-1 · BFP-3A incident (Part 1) attaches to this same symptom at demo time.
//
// Schema:
//   (Symptom)-[:HAS_INCIDENT]->(Incident)
//   (Incident)-[:HAS_DIAGNOSIS]->(Diagnosis)
//   (Incident)-[:HAS_ROOT_CAUSE]->(RootCause)   // from the confirmed diagnosis
//   (Incident)-[:HAS_OUTCOME]->(Outcome)
//   (Diagnosis)-[:ASSIGNED_TO]->(Technician)
//   (Diagnosis)-[:HAS_WORK_ORDER]->(WorkOrder)
//   (Diagnosis)-[:HAS_CONVERSATION]->(Conversation)
//   (Diagnosis)-[:HAS_CHECKLIST_ITEM]->(ChecklistItem)
//   (Diagnosis)-[:CORRECTED_BY]->(Diagnosis)
//
// Nodes first, then relationships matched by id (order-independent, re-runnable).
// =============================================================


// -------------------------------------------------------------
// NODES
// -------------------------------------------------------------

MERGE (sym:Symptom {id: "SYM-001"})
  SET sym.name        = "BFP NDE Vibration High (Zone C)",
      sym.description = "NDE bearing-housing vibration RMS exceeds ISO 10816-7 Zone C alarm threshold",
      sym.severity    = "Amber",
      sym.urgency     = "Immediate";

// ---- INC-101 (Eastbay-CCGT-1 · Block 1 — historical reference case, NOT the live incident) ----
MERGE (inc:Incident {id: "INC-101"})
  SET inc.location = "Eastbay-CCGT-1 · Block 1",
      inc.datetime = "2026-03-18T01:30:00+08:00",
      inc.asset    = "BFP-2A",
      inc.status   = "Resolved";

MERGE (dia:Diagnosis {id: "DIA-101"})
  SET dia.name       = "Bearing race spalling",
      dia.created_at = "2026-03-18T01:50:00+08:00",
      dia.rationale  = "NDE vibration signature matched fleet bearing-spalling precedents",
      dia.confidence = 0.78,
      dia.status     = "Incorrect";

MERGE (dia:Diagnosis {id: "DIA-102"})
  SET dia.name       = "Bent shaft",
      dia.created_at = "2026-03-18T04:10:00+08:00",
      dia.rationale  = "Dial-indicator runout + 1×RPM-dominant vibration with ~180° NDE-DE phase shift",
      dia.confidence = 0.96,
      dia.status     = "Confirmed";

MERGE (chk:ChecklistItem {id: "CHK-101"})
  SET chk.task = "Inspect NDE bearing housing", chk.completed = true, chk.result = "No race damage found";

MERGE (chk:ChecklistItem {id: "CHK-102"})
  SET chk.task = "Dial-indicator shaft runout test", chk.completed = true, chk.result = "Runout 0.18 mm — out of tolerance";

MERGE (tech:Technician {id: "TECH-001"})
  SET tech.name = "J. Tan",
      tech.certifications = ["Sulzer BFP Maintenance", "ISO 10816-7 Vibration Analysis"];

MERGE (work:WorkOrder {id: "WORK-101"})
  SET work.description = "Shaft straighten / replace", work.duration_hours = 6.0,
      work.comments = "NDE vibration dropped to 6.1 mm/s after shaft replacement";

MERGE (conv:Conversation {id: "CONV-101"})
  SET conv.participants = ["J. Tan", "M. Lim"],
      conv.summary = "Bearing hypothesis challenged after runout finding; remote phase analysis confirms bent shaft",
      conv.extracted_finding = "1×RPM-dominant + ~180° NDE-DE phase shift = bent shaft";

MERGE (root:RootCause {id: "ROOT-101"})
  SET root.description = "Bent BFP-2A shaft causing elevated NDE vibration";

MERGE (out:Outcome {id: "OUT-101"})
  SET out.status = "Success", out.verification = "NDE vibration stable at 6.1 mm/s over 24 h";

// The initial (incorrect) diagnosis DIA-101 also dispatched a technician + bearing-inspection WO
MERGE (tech:Technician {id: "TECH-004"})
  SET tech.name = "A. Wong", tech.certifications = ["Sulzer BFP Maintenance"];

MERGE (work:WorkOrder {id: "WORK-102"})
  SET work.description = "Bearing inspection / replace", work.comments = "No race damage found on inspection";

// ---- INC-102 (Northgate-CCGT-2 — precedent that drove the initial guess) ----
MERGE (inc:Incident {id: "INC-102"})
  SET inc.location = "Northgate-CCGT-2",
      inc.datetime = "2026-04-12T09:15:00+08:00",
      inc.asset    = "BFP-2B",
      inc.status   = "Resolved";

MERGE (dia:Diagnosis {id: "DIA-201"})
  SET dia.name = "Bearing race spalling", dia.created_at = "2026-04-12T10:00:00+08:00",
      dia.confidence = 0.89, dia.status = "Confirmed";

MERGE (tech:Technician {id: "TECH-002"})
  SET tech.name = "S. Ibrahim", tech.certifications = ["Sulzer BFP Maintenance"];

MERGE (work:WorkOrder {id: "WORK-201"})
  SET work.description = "Replaced NDE bearing";

MERGE (root:RootCause {id: "ROOT-201"})
  SET root.description = "NDE bearing race spalling";

MERGE (out:Outcome {id: "OUT-201"})
  SET out.status = "Success";

// ---- INC-103 (Westpoint-CHP — precedent that enabled the correction) ----
MERGE (inc:Incident {id: "INC-103"})
  SET inc.location = "Westpoint-CHP",
      inc.datetime = "2026-02-11T08:05:00+08:00",
      inc.asset    = "BFP-1A",
      inc.status   = "Resolved";

MERGE (dia:Diagnosis {id: "DIA-301"})
  SET dia.name = "Bearing race spiralling", dia.created_at = "2026-02-11T08:30:00+08:00",
      dia.confidence = 0.84, dia.status = "Confirmed";

MERGE (tech:Technician {id: "TECH-003"})
  SET tech.name = "P. Subramaniam", tech.certifications = ["Rotating Equipment Specialist"];

MERGE (work:WorkOrder {id: "WORK-301"})
  SET work.description = "Shaft replacement";

MERGE (root:RootCause {id: "ROOT-301"})
  SET root.description = "Bent shaft (thermal bow)";

MERGE (out:Outcome {id: "OUT-301"})
  SET out.status = "Success";


// -------------------------------------------------------------
// RELATIONSHIPS
// -------------------------------------------------------------

// ---- INC-101 ----
MATCH (sym:Symptom {id: "SYM-001"}), (inc:Incident {id: "INC-101"})
MERGE (sym)-[:HAS_INCIDENT]->(inc);

MATCH (inc:Incident {id: "INC-101"}), (dia:Diagnosis {id: "DIA-101"})
MERGE (inc)-[:HAS_DIAGNOSIS]->(dia);

MATCH (inc:Incident {id: "INC-101"}), (dia:Diagnosis {id: "DIA-102"})
MERGE (inc)-[:HAS_DIAGNOSIS]->(dia);

MATCH (inc:Incident {id: "INC-101"}), (root:RootCause {id: "ROOT-101"})
MERGE (inc)-[:HAS_ROOT_CAUSE]->(root);

MATCH (inc:Incident {id: "INC-101"}), (out:Outcome {id: "OUT-101"})
MERGE (inc)-[:HAS_OUTCOME]->(out);

MATCH (d1:Diagnosis {id: "DIA-101"}), (d2:Diagnosis {id: "DIA-102"})
MERGE (d1)-[:CORRECTED_BY]->(d2);

MATCH (dia:Diagnosis {id: "DIA-101"}), (chk:ChecklistItem {id: "CHK-101"})
MERGE (dia)-[:HAS_CHECKLIST_ITEM]->(chk);

MATCH (dia:Diagnosis {id: "DIA-101"}), (chk:ChecklistItem {id: "CHK-102"})
MERGE (dia)-[:HAS_CHECKLIST_ITEM]->(chk);

// Technician, work order, conversation attach to the CONFIRMED diagnosis (DIA-102)
MATCH (dia:Diagnosis {id: "DIA-102"}), (tech:Technician {id: "TECH-001"})
MERGE (dia)-[:ASSIGNED_TO]->(tech);

MATCH (dia:Diagnosis {id: "DIA-102"}), (work:WorkOrder {id: "WORK-101"})
MERGE (dia)-[:HAS_WORK_ORDER]->(work);

MATCH (dia:Diagnosis {id: "DIA-102"}), (conv:Conversation {id: "CONV-101"})
MERGE (dia)-[:HAS_CONVERSATION]->(conv);

// initial (incorrect) diagnosis DIA-101 — its own technician + work order
MATCH (dia:Diagnosis {id: "DIA-101"}), (tech:Technician {id: "TECH-004"})
MERGE (dia)-[:ASSIGNED_TO]->(tech);

MATCH (dia:Diagnosis {id: "DIA-101"}), (work:WorkOrder {id: "WORK-102"})
MERGE (dia)-[:HAS_WORK_ORDER]->(work);

// ---- INC-102 ----
MATCH (sym:Symptom {id: "SYM-001"}), (inc:Incident {id: "INC-102"})
MERGE (sym)-[:HAS_INCIDENT]->(inc);

MATCH (inc:Incident {id: "INC-102"}), (dia:Diagnosis {id: "DIA-201"})
MERGE (inc)-[:HAS_DIAGNOSIS]->(dia);

MATCH (inc:Incident {id: "INC-102"}), (root:RootCause {id: "ROOT-201"})
MERGE (inc)-[:HAS_ROOT_CAUSE]->(root);

MATCH (inc:Incident {id: "INC-102"}), (out:Outcome {id: "OUT-201"})
MERGE (inc)-[:HAS_OUTCOME]->(out);

MATCH (dia:Diagnosis {id: "DIA-201"}), (tech:Technician {id: "TECH-002"})
MERGE (dia)-[:ASSIGNED_TO]->(tech);

MATCH (dia:Diagnosis {id: "DIA-201"}), (work:WorkOrder {id: "WORK-201"})
MERGE (dia)-[:HAS_WORK_ORDER]->(work);

// ---- INC-103 ----
MATCH (sym:Symptom {id: "SYM-001"}), (inc:Incident {id: "INC-103"})
MERGE (sym)-[:HAS_INCIDENT]->(inc);

MATCH (inc:Incident {id: "INC-103"}), (dia:Diagnosis {id: "DIA-301"})
MERGE (inc)-[:HAS_DIAGNOSIS]->(dia);

MATCH (inc:Incident {id: "INC-103"}), (root:RootCause {id: "ROOT-301"})
MERGE (inc)-[:HAS_ROOT_CAUSE]->(root);

MATCH (inc:Incident {id: "INC-103"}), (out:Outcome {id: "OUT-301"})
MERGE (inc)-[:HAS_OUTCOME]->(out);

MATCH (dia:Diagnosis {id: "DIA-301"}), (tech:Technician {id: "TECH-003"})
MERGE (dia)-[:ASSIGNED_TO]->(tech);

MATCH (dia:Diagnosis {id: "DIA-301"}), (work:WorkOrder {id: "WORK-301"})
MERGE (dia)-[:HAS_WORK_ORDER]->(work);
