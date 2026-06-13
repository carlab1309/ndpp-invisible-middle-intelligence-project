// Invisible Middle Intelligence — interpretation engine (demo)
// Pure logic. Given a stream of signals, infer structural conditions,
// compute confidence, and produce response guidance.

export type SignalFamily =
  | "Behavioural"
  | "Workflow"
  | "Communication"
  | "Governance"
  | "AI Interaction"
  | "Escalation"
  | "Closure"
  | "Trust"
  | "Continuity"
  | "Compensation";

export type SignalSeverity = "low" | "moderate" | "elevated" | "critical";

export interface Signal {
  id: string;
  ts: number;
  family: SignalFamily;
  name: string;
  source: string; // e.g. "CRM-Risk", "AI-Triage", "Workflow Engine"
  detail: string;
}

export type ConditionId =
  | "trust_instability"
  | "closure_failure"
  | "threshold_ambiguity"
  | "ownership_drift"
  | "context_fragmentation"
  | "ai_burden_transfer"
  | "interpretive_overload"
  | "escalation_instability"
  | "workflow_incoherence"
  | "predictability_failure";

export interface ConditionContribution {
  signalId: string;
  name: string;
  family: SignalFamily;
  source: string;
  ts: number;
  mechanism: string;
  points: number; // signed percentage-point contribution to severity
}

export type ArchitectureCategory =
  | "Governance"
  | "Feedback Architecture"
  | "Decision Architecture"
  | "Workflow Architecture"
  | "Continuity Architecture";

export interface ArchitecturalAttributionGroup {
  category: ArchitectureCategory;
  items: string[];
}

export interface ConditionMechanism {
  label: string;
  points: number; // percentage points contributed to severity
  signalNames: string[]; // distinct signals that activated this mechanism
  evidence: string[]; // why this signal was interpreted as this mechanism
}

export interface StructuralCondition {
  id: ConditionId;
  label: string;
  description: string;
  strength: number; // 0..1 — severity of this architecture condition
  severity: SignalSeverity;
  evidenceStrength: "High" | "Medium" | "Low";
  contributingFamilies: SignalFamily[];
  contributingSignalIds: string[];
  mechanisms: ConditionMechanism[];
  breakdown: ConditionContribution[];
  architecturalCauses: ArchitecturalAttributionGroup[];
  responseGuidance: string[];
}




// --- Signal catalogue (drawn from the taxonomy doc) -----------------

interface SignalDef {
  name: string;
  family: SignalFamily;
  source: string;
  detail: string;
  // Each signal contributes weighted evidence to one or more conditions
  contributions: Partial<Record<ConditionId, number>>;
}

export const SIGNAL_CATALOGUE: SignalDef[] = [
  {
    name: "Repeated dashboard checking",
    family: "Behavioural",
    source: "Telemetry",
    detail: "Same user re-opened the case dashboard 6× in 40min without action.",
    contributions: { trust_instability: 0.35, closure_failure: 0.2, predictability_failure: 0.15 },
  },
  {
    name: "Reassurance-seeking message",
    family: "Communication",
    source: "Channels",
    detail: "“Just confirming this is mine to action?” — 3rd similar message today.",
    contributions: { trust_instability: 0.3, ownership_drift: 0.25, threshold_ambiguity: 0.15 },
  },
  {
    name: "Case reopened after closure",
    family: "Closure",
    source: "Workflow Engine",
    detail: "Case #41-882 reopened 14min after marked complete.",
    contributions: { closure_failure: 0.5, trust_instability: 0.2 },
  },
  {
    name: "Repeated AI override",
    family: "AI Interaction",
    source: "AI-Triage",
    detail: "Operator overrode AI recommendation 4× in last hour.",
    contributions: { ai_burden_transfer: 0.45, trust_instability: 0.2 },
  },
  {
    name: "Confidence interpretation query",
    family: "AI Interaction",
    source: "AI-Triage",
    detail: "“What does 0.62 confidence mean here?” raised in review.",
    contributions: { ai_burden_transfer: 0.35, interpretive_overload: 0.2 },
  },
  {
    name: "Duplicated intervention",
    family: "Workflow",
    source: "Workflow Engine",
    detail: "Two teams independently actioned the same alert.",
    contributions: { ownership_drift: 0.5, workflow_incoherence: 0.25 },
  },
  {
    name: "Ownership clarification request",
    family: "Governance",
    source: "Channels",
    detail: "“Who owns response on amber-band cases?”",
    contributions: { ownership_drift: 0.4, threshold_ambiguity: 0.2 },
  },
  {
    name: "Threshold reinterpretation loop",
    family: "Governance",
    source: "Review Log",
    detail: "Severity reclassified 3× on same case in 2 hours.",
    contributions: { threshold_ambiguity: 0.5, escalation_instability: 0.25 },
  },
  {
    name: "Handoff context replay",
    family: "Continuity",
    source: "Channels",
    detail: "Receiving team asked for case background to be re-explained.",
    contributions: { context_fragmentation: 0.45, workflow_incoherence: 0.15 },
  },
  {
    name: "Escalation inflation",
    family: "Escalation",
    source: "Workflow Engine",
    detail: "Routine alert escalated 2 tiers above protocol.",
    contributions: { escalation_instability: 0.45, threshold_ambiguity: 0.2 },
  },
  {
    name: "Delayed intervention",
    family: "Workflow",
    source: "Telemetry",
    detail: "Alert sat 38min before first action; threshold = 10min.",
    contributions: { threshold_ambiguity: 0.3, interpretive_overload: 0.25, ownership_drift: 0.15 },
  },
  {
    name: "Workaround documented",
    family: "Workflow",
    source: "Knowledge Base",
    detail: "New team-local workaround posted for status-stuck cases.",
    contributions: { workflow_incoherence: 0.5, predictability_failure: 0.2 },
  },
  {
    name: "Verification loop",
    family: "Trust",
    source: "Telemetry",
    detail: "Same record validated 3× by 3 reviewers.",
    contributions: { trust_instability: 0.4, ai_burden_transfer: 0.15 },
  },
  {
    name: "Stable closure confirmed",
    family: "Closure",
    source: "Workflow Engine",
    detail: "Case closed cleanly, no reopen within SLA window.",
    contributions: {}, // flourish — recorded but does not raise burden
  },
];

const CONDITION_META: Record<ConditionId, Pick<StructuralCondition, "label" | "description" | "responseGuidance">> = {
  trust_instability: {
    label: "Trust Instability",
    description: "Users are compensating for perceived unreliability — verification, reassurance, rechecking.",
    responseGuidance: [
      "Strengthen closure confirmation surfaces",
      "Audit confidence signals returned to operators",
      "Reduce silent state changes",
    ],
  },
  closure_failure: {
    label: "Closure Failure",
    description: "The system isn't creating durable, trustable completion. Loops stay cognitively open.",
    responseGuidance: [
      "Add explicit completion confirmation",
      "Suppress notifications after confirmed close",
      "Make state transitions legible",
    ],
  },
  threshold_ambiguity: {
    label: "Threshold Ambiguity",
    description: "When observation should become intervention is interpreted inconsistently across teams.",
    responseGuidance: [
      "Codify intervention thresholds explicitly",
      "Align severity bands across reviewers",
      "Surface threshold criteria in-context",
    ],
  },
  ownership_drift: {
    label: "Ownership Drift",
    description: "Responsibility is being informally redistributed. Handoffs are unclear or duplicated.",
    responseGuidance: [
      "Make ownership transitions explicit",
      "Surface owner at every interaction surface",
      "Audit duplicated interventions",
    ],
  },
  context_fragmentation: {
    label: "Context Fragmentation",
    description: "Meaning is not surviving handoffs. Humans repeatedly reconstruct case context.",
    responseGuidance: [
      "Carry case context across handoffs",
      "Preserve decision rationale on transitions",
      "Reduce re-explanation burden",
    ],
  },
  ai_burden_transfer: {
    label: "AI Burden Transfer",
    description: "AI is silently redistributing verification, interpretation and oversight back to humans.",
    responseGuidance: [
      "Make AI confidence operationally interpretable",
      "Define explicit oversight thresholds",
      "Audit override frequency by surface",
    ],
  },
  interpretive_overload: {
    label: "Interpretive Overload",
    description: "Humans are repeatedly inferring meaning, urgency or next step that the system should contain.",
    responseGuidance: [
      "Reduce ambiguous signal surfaces",
      "Translate raw signals into action clarity",
      "Tighten next-step prompts",
    ],
  },
  escalation_instability: {
    label: "Escalation Instability",
    description: "Escalation is reactive, delayed, or inflated — containment architecture is weak.",
    responseGuidance: [
      "Define proportionate escalation criteria",
      "Audit recent escalations against protocol",
      "Strengthen first-line containment",
    ],
  },
  workflow_incoherence: {
    label: "Workflow Incoherence",
    description: "Comparable situations are being handled inconsistently. Local workarounds proliferating.",
    responseGuidance: [
      "Reconcile divergent local workarounds",
      "Stabilise workflow logic across teams",
      "Identify root cause of detours",
    ],
  },
  predictability_failure: {
    label: "Predictability Failure",
    description: "Users cannot reliably form expectations about system behaviour. Trust budget erodes.",
    responseGuidance: [
      "Make state changes deterministic",
      "Communicate behavioural changes ahead of time",
      "Reduce unexplained variance",
    ],
  },
};

// --- Mechanism mapping ---------------------------------------------
// Mechanisms describe WHAT BURDEN HUMANS ARE BEING ASKED TO CARRY when a
// signal occurs in the context of a given architecture condition.
// They are deliberately phrased structurally ("Verification Burden",
// "Oversight Compensation"), not behaviourally ("verification loop",
// "override"). This is the NDPP causal layer: signal → burden → condition.

const MECHANISM_MAP: Record<ConditionId, Record<string, string>> = {
  trust_instability: {
    "Verification loop": "Verification Burden",
    "Repeated dashboard checking": "Reassurance Dependency",
    "Reassurance-seeking message": "Reassurance Dependency",
    "Case reopened after closure": "Closure Uncertainty",
    "Repeated AI override": "Oversight Compensation",
  },
  closure_failure: {
    "Case reopened after closure": "Closure Uncertainty",
    "Repeated dashboard checking": "Completion Ambiguity",
    "Reassurance-seeking message": "Completion Ambiguity",
  },
  threshold_ambiguity: {
    "Threshold reinterpretation loop": "Threshold Reinterpretation",
    "Ownership clarification request": "Severity Inconsistency",
    "Reassurance-seeking message": "Severity Inconsistency",
    "Escalation inflation": "Severity Inconsistency",
    "Delayed intervention": "Recognition Latency",
  },
  ownership_drift: {
    "Duplicated intervention": "Duplicated Responsibility",
    "Ownership clarification request": "Ownership Ambiguity",
    "Reassurance-seeking message": "Ownership Ambiguity",
    "Delayed intervention": "Handoff Gap",
  },
  context_fragmentation: {
    "Handoff context replay": "Context Reconstruction",
  },
  ai_burden_transfer: {
    "Repeated AI override": "Oversight Compensation",
    "Confidence interpretation query": "Interpretive Reliance",
    "Verification loop": "Verification Burden",
  },
  interpretive_overload: {
    "Confidence interpretation query": "Meaning Reconstruction",
    "Delayed intervention": "Urgency Inference",
  },
  escalation_instability: {
    "Escalation inflation": "Escalation Inflation",
    "Threshold reinterpretation loop": "Threshold-Driven Escalation",
  },
  workflow_incoherence: {
    "Workaround documented": "Workaround Proliferation",
    "Duplicated intervention": "Duplicated Workflow",
    "Handoff context replay": "Context Loss",
  },
  predictability_failure: {
    "Repeated dashboard checking": "Behavioural Hedging",
    "Workaround documented": "Workaround Persistence",
  },
};

function mechanismFor(cid: ConditionId, signalName: string): string {
  return MECHANISM_MAP[cid]?.[signalName] ?? "Residual Compensation";
}

// --- Architectural causes ------------------------------------------
// Per mechanism: the system-level architecture gaps that typically *produce*
// that form of human compensation. This is the layer beneath the mechanism:
// not what burden is forming, but why the architecture is creating it.

type CauseEntry = { category: ArchitectureCategory; text: string };

const MECHANISM_CAUSES: Record<string, CauseEntry[]> = {
  "Verification Burden": [
    { category: "Governance", text: "Verification ownership unresolved" },
    { category: "Feedback Architecture", text: "System feedback insufficient to confirm action took effect" },
  ],
  "Reassurance Dependency": [
    { category: "Feedback Architecture", text: "Closure conditions unclear" },
    { category: "Feedback Architecture", text: "State transitions not communicated back to the user" },
  ],
  "Closure Uncertainty": [
    { category: "Feedback Architecture", text: "Completion not durably confirmed" },
    { category: "Governance", text: "Reopen criteria not codified" },
  ],
  "Completion Ambiguity": [
    { category: "Feedback Architecture", text: "Completion not durably confirmed" },
    { category: "Feedback Architecture", text: "Notifications continue past completion" },
  ],
  "Oversight Compensation": [
    { category: "Decision Architecture", text: "AI recommendation thresholds not aligned to operator trust" },
    { category: "Governance", text: "Override expectations not designed into the workflow" },
  ],
  "Interpretive Reliance": [
    { category: "Decision Architecture", text: "Confidence interpretation unsupported" },
    { category: "Decision Architecture", text: "AI output lacks operational meaning at point of use" },
  ],
  "Threshold Reinterpretation": [
    { category: "Governance", text: "Severity bands not codified across teams" },
    { category: "Decision Architecture", text: "Threshold criteria invisible in-context" },
  ],
  "Severity Inconsistency": [
    { category: "Governance", text: "Severity model interpreted locally, not structurally" },
    { category: "Governance", text: "Escalation criteria not anchored to protocol" },
  ],
  "Recognition Latency": [
    { category: "Governance", text: "First-action ownership unclear" },
    { category: "Feedback Architecture", text: "Alert framing does not communicate urgency" },
  ],
  "Duplicated Responsibility": [
    { category: "Governance", text: "Ownership not explicit on alert surfaces" },
    { category: "Governance", text: "Multiple teams hold overlapping mandate without coordination" },
  ],
  "Ownership Ambiguity": [
    { category: "Governance", text: "Ownership not explicit on alert surfaces" },
    { category: "Workflow Architecture", text: "Handoff protocol absent for amber-band cases" },
  ],
  "Handoff Gap": [
    { category: "Workflow Architecture", text: "Handoff state not preserved between systems" },
    { category: "Workflow Architecture", text: "Receiving team has no inbound queue" },
  ],
  "Context Reconstruction": [
    { category: "Continuity Architecture", text: "Case context does not survive handoff" },
    { category: "Continuity Architecture", text: "Decision rationale not preserved on transitions" },
  ],
  "Meaning Reconstruction": [
    { category: "Decision Architecture", text: "Signals require interpretation the system should perform" },
    { category: "Decision Architecture", text: "Next-step prompts missing at decision points" },
  ],
  "Urgency Inference": [
    { category: "Feedback Architecture", text: "Time-criticality not represented in signal surface" },
    { category: "Feedback Architecture", text: "SLA context absent at point of action" },
  ],
  "Escalation Inflation": [
    { category: "Governance", text: "Proportionate-escalation criteria undefined" },
    { category: "Workflow Architecture", text: "First-line containment under-resourced" },
  ],
  "Threshold-Driven Escalation": [
    { category: "Decision Architecture", text: "Severity bands ambiguous, defaulting to escalation" },
    { category: "Workflow Architecture", text: "Reclassification has no holding state" },
  ],
  "Workaround Proliferation": [
    { category: "Workflow Architecture", text: "Workflow logic does not match operational reality" },
    { category: "Governance", text: "Local detours are not surfaced back to design" },
  ],
  "Duplicated Workflow": [
    { category: "Workflow Architecture", text: "Workflow does not converge across teams" },
    { category: "Workflow Architecture", text: "Comparable cases routed differently by surface" },
  ],
  "Context Loss": [
    { category: "Continuity Architecture", text: "Context not carried across system boundaries" },
    { category: "Continuity Architecture", text: "Handoff acts as a context discontinuity" },
  ],
  "Behavioural Hedging": [
    { category: "Feedback Architecture", text: "System behaviour is non-deterministic from user perspective" },
    { category: "Feedback Architecture", text: "State changes not announced" },
  ],
  "Workaround Persistence": [
    { category: "Governance", text: "Workarounds outlive the conditions that produced them" },
    { category: "Workflow Architecture", text: "Workflow design has no retirement loop" },
  ],
  "Residual Compensation": [
    { category: "Governance", text: "Compensation pattern outside the modelled mechanism library" },
  ],
};

const CATEGORY_ORDER: ArchitectureCategory[] = [
  "Governance",
  "Feedback Architecture",
  "Decision Architecture",
  "Workflow Architecture",
  "Continuity Architecture",
];

function architecturalCausesFor(mechanismLabels: string[]): ArchitecturalAttributionGroup[] {
  const seen = new Set<string>();
  const groups = new Map<ArchitectureCategory, string[]>();
  for (const m of mechanismLabels) {
    for (const c of MECHANISM_CAUSES[m] ?? []) {
      const key = `${c.category}::${c.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const list = groups.get(c.category) ?? [];
      list.push(c.text);
      groups.set(c.category, list);
    }
  }
  return CATEGORY_ORDER
    .filter((cat) => groups.has(cat))
    .map((cat) => ({ category: cat, items: groups.get(cat)! }));
}

// --- Evidence logic ------------------------------------------------
// Per mechanism: the rationale used to interpret a signal as this specific
// form of human compensation. This is the "Why this mechanism?" layer.
// It explains the interpretive logic, not the signal itself.

const MECHANISM_EVIDENCE: Record<string, string[]> = {
  "Verification Burden": [
    "repeated confirmation behaviour present",
    "trust signal active across reviewers",
    "evidence of redundant validation effort",
  ],
  "Reassurance Dependency": [
    "confirmation behaviour repeated",
    "unresolved completion signal present",
    "communication seeking external assurance",
  ],
  "Closure Uncertainty": [
    "completion state reversed or reopened",
    "closure not durably held by the system",
    "trust evidence around finality active",
  ],
  "Completion Ambiguity": [
    "post-closure attention persists",
    "users acting as if completion is provisional",
    "signal recurrence around finished state",
  ],
  "Oversight Compensation": [
    "operator overriding system recommendation",
    "trust signal active toward automated layer",
    "oversight load held by human, not architecture",
  ],
  "Interpretive Reliance": [
    "users requesting meaning the system should supply",
    "confidence output not operationally legible",
    "interpretation burden carried by operator",
  ],
  "Threshold Reinterpretation": [
    "severity reclassified within short window",
    "threshold boundaries treated as negotiable",
    "governance signal active on classification",
  ],
  "Severity Inconsistency": [
    "comparable cases handled at different severities",
    "escalation or ownership query indicates band ambiguity",
    "governance signal active",
  ],
  "Recognition Latency": [
    "action delayed past threshold",
    "alert framing did not trigger timely response",
    "interpretive lag observed",
  ],
  "Duplicated Responsibility": [
    "multiple actors intervened on same alert",
    "ownership not exclusively held",
    "workflow signal indicates parallel action",
  ],
  "Ownership Ambiguity": [
    "explicit query about who owns response",
    "reassurance pattern around responsibility",
    "governance signal active",
  ],
  "Handoff Gap": [
    "delay observed at transition point",
    "ownership unclear across teams",
    "workflow continuity signal weak",
  ],
  "Context Reconstruction": [
    "receiving party requested re-explanation",
    "case context did not survive transition",
    "continuity signal active",
  ],
  "Meaning Reconstruction": [
    "operator inferring meaning the system should contain",
    "AI interaction signal active",
    "interpretive load held by human",
  ],
  "Urgency Inference": [
    "time-criticality not surfaced by system",
    "operator inferring urgency from indirect cues",
    "workflow signal indicates latency",
  ],
  "Escalation Inflation": [
    "escalation exceeded protocol tier",
    "containment at first line insufficient",
    "escalation signal active",
  ],
  "Threshold-Driven Escalation": [
    "reclassification triggered escalation",
    "severity ambiguity defaulted upward",
    "governance signal active",
  ],
  "Workaround Proliferation": [
    "new local workaround documented",
    "workflow signal indicates design–reality gap",
    "workaround treated as durable solution",
  ],
  "Duplicated Workflow": [
    "comparable cases routed differently",
    "workflow signal active across surfaces",
    "convergence absent across teams",
  ],
  "Context Loss": [
    "context did not carry across boundary",
    "continuity signal active at handoff",
    "re-explanation effort observed",
  ],
  "Behavioural Hedging": [
    "users monitoring without acting",
    "behavioural signal indicates uncertainty about state",
    "predictability eroded from user perspective",
  ],
  "Workaround Persistence": [
    "workaround persists beyond originating condition",
    "governance signal indicates no retirement loop",
    "workflow signal active",
  ],
  "Residual Compensation": [
    "compensation pattern outside modelled library",
    "rationale derived from generic burden inference",
  ],
};

function evidenceFor(label: string, signalCount: number): string[] {
  const base = MECHANISM_EVIDENCE[label] ?? MECHANISM_EVIDENCE["Residual Compensation"];
  const items = base.slice(0, 3);
  if (signalCount > 1) {
    items.push("signal recurrence increased within current scenario window");
  }
  return items;
}





// --- Scenarios -----------------------------------------------------

export type ScenarioId = "baseline" | "trust_collapse" | "ai_burden" | "handoff_breakdown" | "flourishing";

export const SCENARIOS: Record<ScenarioId, { label: string; description: string; weighted: string[] }> = {
  baseline: {
    label: "Baseline operations",
    description: "Mixed low-volume signals across families.",
    weighted: [],
  },
  trust_collapse: {
    label: "Trust collapse forming",
    description: "Verification, reassurance and reopen patterns rising.",
    weighted: [
      "Repeated dashboard checking",
      "Reassurance-seeking message",
      "Case reopened after closure",
      "Verification loop",
    ],
  },
  ai_burden: {
    label: "AI burden transfer",
    description: "AI-supported environment silently shifting load to humans.",
    weighted: [
      "Repeated AI override",
      "Confidence interpretation query",
      "Verification loop",
    ],
  },
  handoff_breakdown: {
    label: "Handoff breakdown",
    description: "Ownership and context not surviving transitions.",
    weighted: [
      "Duplicated intervention",
      "Ownership clarification request",
      "Handoff context replay",
      "Threshold reinterpretation loop",
    ],
  },
  flourishing: {
    label: "Healthy containment",
    description: "Closure confirmed, low compensation burden.",
    weighted: [
      "Stable closure confirmed",
      "Stable closure confirmed",
    ],
  },
};

// --- Generation -----------------------------------------------------

let seq = 0;
const nextId = () => `s_${Date.now().toString(36)}_${(seq++).toString(36)}`;

export function generateSignal(scenarioId: ScenarioId): Signal {
  const scenario = SCENARIOS[scenarioId];
  let def: SignalDef;
  if (scenario.weighted.length && Math.random() < 0.75) {
    const pick = scenario.weighted[Math.floor(Math.random() * scenario.weighted.length)];
    def = SIGNAL_CATALOGUE.find((s) => s.name === pick) ?? SIGNAL_CATALOGUE[0];
  } else {
    def = SIGNAL_CATALOGUE[Math.floor(Math.random() * SIGNAL_CATALOGUE.length)];
  }
  return {
    id: nextId(),
    ts: Date.now(),
    family: def.family,
    name: def.name,
    source: def.source,
    detail: def.detail,
  };
}

// --- Interpretation -------------------------------------------------

const HALF_LIFE_MS = 90_000; // recent signals weigh more

function timeWeight(ts: number, now: number) {
  const age = Math.max(0, now - ts);
  return Math.pow(0.5, age / HALF_LIFE_MS);
}

function severityFor(strength: number): SignalSeverity {
  if (strength >= 0.8) return "critical";
  if (strength >= 0.55) return "elevated";
  if (strength >= 0.3) return "moderate";
  return "low";
}

interface AccEntry {
  raw: number;
  families: Set<SignalFamily>;
  signalIds: string[];
  perSignal: Map<string, { sig: Signal; weighted: number }>;
}

export function interpret(signals: Signal[], now = Date.now()): StructuralCondition[] {
  const conditionAcc: Record<string, AccEntry> = {};

  for (const sig of signals) {
    const def = SIGNAL_CATALOGUE.find((d) => d.name === sig.name);
    if (!def) continue;
    const w = timeWeight(sig.ts, now);
    for (const [cid, contribution] of Object.entries(def.contributions) as [
      ConditionId,
      number,
    ][]) {
      const acc = (conditionAcc[cid] ??= {
        raw: 0,
        families: new Set(),
        signalIds: [],
        perSignal: new Map(),
      });
      const weighted = contribution * w;
      acc.raw += weighted;
      acc.families.add(sig.family);
      acc.signalIds.push(sig.id);
      const existing = acc.perSignal.get(sig.id);
      if (existing) existing.weighted += weighted;
      else acc.perSignal.set(sig.id, { sig, weighted });
    }
  }

  const results: StructuralCondition[] = [];
  for (const [cid, acc] of Object.entries(conditionAcc)) {
    // Diminishing returns curve
    const strength = 1 - Math.exp(-acc.raw * 0.9);
    if (strength < 0.12) continue;
    const meta = CONDITION_META[cid as ConditionId];

    // Attribute severity back to contributing signals proportionally,
    // then roll signals up into structural mechanisms.
    const strengthPct = strength * 100;
    const breakdown: ConditionContribution[] = Array.from(acc.perSignal.values())
      .map(({ sig, weighted }) => ({
        signalId: sig.id,
        name: sig.name,
        family: sig.family,
        source: sig.source,
        ts: sig.ts,
        mechanism: mechanismFor(cid as ConditionId, sig.name),
        points: acc.raw > 0 ? (weighted / acc.raw) * strengthPct : 0,
      }))
      .sort((a, b) => b.points - a.points);

    const mechAcc = new Map<string, { points: number; signals: Set<string> }>();
    for (const b of breakdown) {
      const m = mechAcc.get(b.mechanism) ?? { points: 0, signals: new Set() };
      m.points += b.points;
      m.signals.add(b.name);
      mechAcc.set(b.mechanism, m);
    }
    const mechanisms: ConditionMechanism[] = Array.from(mechAcc.entries())
      .map(([label, v]) => ({
        label,
        points: v.points,
        signalNames: Array.from(v.signals),
      }))
      .sort((a, b) => b.points - a.points);

    const sev = severityFor(strength);
    const evidenceStrength: StructuralCondition["evidenceStrength"] =
      acc.families.size >= 3 && sev !== "low"
        ? "High"
        : acc.families.size >= 2
          ? "Medium"
          : "Low";

    results.push({
      id: cid as ConditionId,
      label: meta.label,
      description: meta.description,
      strength,
      severity: sev,
      evidenceStrength,
      contributingFamilies: Array.from(acc.families),
      contributingSignalIds: acc.signalIds.slice(-6),
      mechanisms,
      breakdown,
      architecturalCauses: architecturalCausesFor(mechanisms.map((m) => m.label)),
      responseGuidance: meta.responseGuidance,
    });
  }


  results.sort((a, b) => b.strength - a.strength);
  return results;
}


export function familyCounts(signals: Signal[]): Record<SignalFamily, number> {
  const out = {} as Record<SignalFamily, number>;
  for (const s of signals) out[s.family] = (out[s.family] ?? 0) + 1;
  return out;
}
