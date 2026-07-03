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
  displayLabel?: string; // human-language rewrite of the mechanism label
  plain?: string; // longer plain-language interpretation of the mechanism
  points: number; // percentage points contributed to severity
  signalNames: string[]; // distinct signals that activated this mechanism
  evidence: string[]; // why this signal was interpreted as this mechanism
}

export type ConditionTrajectoryState =
  | "Emerging"
  | "Escalating"
  | "Entrenching"
  | "Stabilising"
  | "Recovering"
  | "Resolved";

export interface ConditionTrajectory {
  state: ConditionTrajectoryState;
  description: string; // short caption shown under the label
  rationale: string[]; // why the engine assigned this trajectory
}

export interface ConditionStrengthSample {
  ts: number;
  strength: number;
}

export interface MechanismStrengthSample {
  ts: number;
  points: Record<string, number>;
}

export type DriverContribution = "High" | "Medium" | "Low";

export interface ConditionDriver {
  label: string;
  direction: "up" | "down";
  contribution: DriverContribution;
  reason: string;
}

export interface ConditionDrivers {
  drivers: ConditionDriver[]; // mechanisms currently increasing condition formation
  stabilisers: ConditionDriver[]; // mechanisms currently reducing condition formation
}

export interface ArchitecturalLeverage {
  statement: string; // the architecture adjustment
  displayStatement?: string; // human-language rewrite of the leverage statement
  plain?: string; // longer plain-language interpretation of the leverage statement
  expectedEffect: string[]; // mechanisms expected to reduce
  expectedEffectDisplay?: string[]; // human-language rewrite of expected-effect mechanism labels
  reason: string;
  estimatedInfluence: number; // 0..100 — share of current formation addressed
}

export type InterventionImpact = "Very High" | "High" | "Moderate" | "Low";
export type InterventionEffort = "Low" | "Medium" | "High";

export interface InterventionPriority {
  title: string;
  displayTitle?: string; // human-language rewrite of the intervention title
  plain?: string; // longer plain-language interpretation of the intervention
  impact: InterventionImpact;
  effort: InterventionEffort;
  reason: string;
}

export interface StructuralCondition {
  id: ConditionId;
  label: string;
  displayLabel?: string; // human-language rewrite of the condition label
  description: string;
  plain?: string; // longer plain-language interpretation of the condition
  strength: number; // 0..1 — severity of this architecture condition
  severity: SignalSeverity;
  evidenceMaturity: "Emerging" | "Developing" | "Established" | "Entrenched";
  evidenceRationale: string[]; // why the engine assigned this maturity level
  contributingFamilies: SignalFamily[];
  contributingSignalIds: string[];
  mechanisms: ConditionMechanism[];
  breakdown: ConditionContribution[];
  architecturalCauses: ArchitecturalAttributionGroup[];
  responseGuidance: string[];
  trajectory?: ConditionTrajectory;
  drivers?: ConditionDrivers;
  organisationalImpact: string[];
  leverage: ArchitecturalLeverage;
  interventionPriorities: InterventionPriority[];
  expectedImprovement: string[];
}

// --- Containment status (per condition + system-wide) --------------
export type ContainmentStatus = "Containable" | "Vulnerable" | "Fragile" | "Critical";

export interface ConditionContainment {
  status: ContainmentStatus;
  reasons: string[];
}

export function computeContainment(c: StructuralCondition): ConditionContainment {
  const reasons: string[] = [];
  const trajectory = c.trajectory?.state;
  const driverCount = c.drivers?.drivers.length ?? 0;
  const stabiliserCount = c.drivers?.stabilisers.length ?? 0;
  const upstreamPresent = c.architecturalCauses.length >= 2;

  let status: ContainmentStatus = "Containable";

  if (c.severity === "critical" || (c.severity === "elevated" && trajectory === "Escalating")) {
    status = "Critical";
  } else if (
    c.severity === "elevated" ||
    trajectory === "Escalating" ||
    trajectory === "Entrenching"
  ) {
    status = "Fragile";
  } else if (c.severity === "moderate" || driverCount > stabiliserCount) {
    status = "Vulnerable";
  }

  if (driverCount >= 2) reasons.push("Multiple active drivers");
  if (stabiliserCount === 0 && (status === "Fragile" || status === "Critical"))
    reasons.push("No stabilising mechanisms observed");
  if (trajectory === "Escalating") reasons.push("Upstream contributors escalating");
  if (trajectory === "Entrenching") reasons.push("Pattern persistently elevated across windows");
  if (trajectory === "Recovering" && stabiliserCount > 0)
    reasons.push("Stabilising mechanisms currently active");
  if (upstreamPresent && (status === "Fragile" || status === "Critical"))
    reasons.push("Architectural causes spanning multiple categories");
  if (reasons.length === 0)
    reasons.push("Severity within manageable band; no escalating drivers detected");

  return { status, reasons };
}

// --- Executive situation assessment --------------------------------
export interface SystemBurdenSlice {
  mechanism: string;
  pct: number;
}

export interface ConditionPortfolio {
  critical: number;
  elevated: number;
  moderate: number;
  emerging: number;
  escalating: number;
  stabilising: number;
  entrenching: number;
  recovering: number;
}

export interface ExecutivePrimaryPressure {
  label: string;
  contributingTo: string[];
  estimatedInfluence: number;
}

export interface ExecutiveHighestLeverage {
  statement: string;
  reductions: string[];
  estimatedReduction: number;
}

export interface ExecutiveAssessment {
  containment: { status: ContainmentStatus; reasons: string[] };
  primaryPressure: ExecutivePrimaryPressure | null;
  humansCarrying: string[];
  highestLeverage: ExecutiveHighestLeverage | null;
  ifNothingChanges: string[];
  portfolio: ConditionPortfolio;
  burdenIndex: SystemBurdenSlice[];
}

export function computeExecutiveAssessment(
  conditions: StructuralCondition[],
  interactions: ConditionInteractionMap
): ExecutiveAssessment {
  // Portfolio counts
  const portfolio: ConditionPortfolio = {
    critical: 0, elevated: 0, moderate: 0, emerging: 0,
    escalating: 0, stabilising: 0, entrenching: 0, recovering: 0,
  };
  for (const c of conditions) {
    if (c.severity === "critical") portfolio.critical++;
    else if (c.severity === "elevated") portfolio.elevated++;
    else if (c.severity === "moderate") portfolio.moderate++;
    else portfolio.emerging++;
    const t = c.trajectory?.state;
    if (t === "Escalating") portfolio.escalating++;
    else if (t === "Stabilising") portfolio.stabilising++;
    else if (t === "Entrenching") portfolio.entrenching++;
    else if (t === "Recovering") portfolio.recovering++;
  }

  // System-wide containment
  const containmentReasons: string[] = [];
  let status: ContainmentStatus = "Containable";
  if (portfolio.critical >= 2 || (portfolio.critical >= 1 && portfolio.escalating >= 3)) {
    status = "Critical";
    containmentReasons.push("Multiple critical conditions active");
  } else if (portfolio.critical >= 1 || portfolio.elevated >= 2 || portfolio.escalating >= 3) {
    status = "Fragile";
    if (portfolio.critical >= 1) containmentReasons.push("Critical condition present");
    if (portfolio.elevated >= 2) containmentReasons.push("Multiple elevated conditions active");
  } else if (portfolio.elevated >= 1 || portfolio.escalating >= 1) {
    status = "Vulnerable";
    containmentReasons.push("Elevated or escalating conditions present");
  } else if (conditions.length === 0) {
    containmentReasons.push("No architecture conditions currently exceed formation thresholds");
  } else {
    containmentReasons.push("Conditions within manageable band");
  }
  if (interactions.primary && interactions.primary.estimatedInfluence >= 40)
    containmentReasons.push("Shared upstream architecture drivers detected");
  if (portfolio.escalating >= 2)
    containmentReasons.push("Compensation mechanisms increasing across observation windows");

  // Primary pressure (reuse interaction primary upstream)
  const primaryPressure: ExecutivePrimaryPressure | null = interactions.primary
    ? {
        label: interactions.primary.label,
        contributingTo: interactions.primary.contributingTo,
        estimatedInfluence: interactions.primary.estimatedInfluence,
      }
    : null;

  // System Burden Index: aggregate mechanism points across all conditions
  const burdenAcc = new Map<string, number>();
  let totalPts = 0;
  for (const c of conditions) {
    for (const m of c.mechanisms) {
      burdenAcc.set(m.label, (burdenAcc.get(m.label) ?? 0) + m.points);
      totalPts += m.points;
    }
  }
  const burdenIndex: SystemBurdenSlice[] = Array.from(burdenAcc.entries())
    .map(([mechanism, pts]) => ({
      mechanism,
      pct: totalPts > 0 ? Math.round((pts / totalPts) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);

  const humansCarrying = burdenIndex.slice(0, 5).map((b) => b.mechanism);

  // Highest leverage (reuse multiplier effect)
  const highestLeverage: ExecutiveHighestLeverage | null = interactions.multiplier
    ? {
        statement: interactions.multiplier.intervention,
        reductions: interactions.multiplier.reductions,
        estimatedReduction: interactions.multiplier.estimatedReduction,
      }
    : null;

  // If nothing changes — aggregate organisational impact across active conditions
  const seen = new Set<string>();
  const ifNothingChanges: string[] = [];
  for (const c of conditions) {
    for (const i of c.organisationalImpact) {
      if (seen.has(i)) continue;
      seen.add(i);
      ifNothingChanges.push(i);
      if (ifNothingChanges.length >= 6) break;
    }
    if (ifNothingChanges.length >= 6) break;
  }

  return {
    containment: { status, reasons: containmentReasons },
    primaryPressure,
    humansCarrying,
    highestLeverage,
    ifNothingChanges,
    portfolio,
    burdenIndex,
  };
}

// --- Condition interaction map -------------------------------------
// Conditions are not isolated. Some conditions form *through* other
// conditions: their mechanisms and architectural causes overlap, so
// movement in an upstream condition propagates into downstream ones.
// This layer identifies the upstream condition exerting the greatest
// influence across the currently-present set, the downstream conditions
// it is contributing to, and the architecture intervention that would
// reduce the most conditions simultaneously.

export type InfluenceStrength = "High" | "Medium" | "Low";

export interface ConditionInteractionEdge {
  from: ConditionId;
  fromLabel: string;
  toLabels: string[];
  toIds: ConditionId[];
  influence: InfluenceStrength;
  influencePct: number; // 0..100 share of current system formation routed through this condition
}

export interface PrimaryUpstream {
  id: ConditionId;
  label: string;
  contributingTo: string[];
  estimatedInfluence: number; // 0..100
  reason: string;
}

export interface DownstreamConsequences {
  fromLabel: string;
  items: string[]; // organisational consequences likely to follow
}

export interface MultiplierEffect {
  intervention: string; // architectural adjustment
  reductions: string[]; // "↓ Condition Label"
  estimatedReduction: number; // 0..100
  reason: string;
}

export interface ConditionInteractionMap {
  edges: ConditionInteractionEdge[];
  primary: PrimaryUpstream | null;
  downstream: DownstreamConsequences | null;
  multiplier: MultiplierEffect | null;
}

// Directed graph: from → conditions it tends to contribute to forming.
// Built from shared mechanisms, shared architectural causes, and the
// causal chains the engine already models.
const CONDITION_UPSTREAM_MAP: Record<ConditionId, ConditionId[]> = {
  threshold_ambiguity: [
    "ownership_drift",
    "escalation_instability",
    "trust_instability",
    "predictability_failure",
  ],
  ownership_drift: ["workflow_incoherence", "trust_instability", "escalation_instability"],
  closure_failure: ["trust_instability", "predictability_failure"],
  ai_burden_transfer: ["trust_instability", "interpretive_overload"],
  context_fragmentation: ["workflow_incoherence", "ownership_drift"],
  interpretive_overload: ["escalation_instability", "predictability_failure"],
  escalation_instability: ["trust_instability"],
  workflow_incoherence: ["predictability_failure", "escalation_instability"],
  trust_instability: ["predictability_failure"],
  predictability_failure: [],
};

function influenceFor(pct: number): InfluenceStrength {
  if (pct >= 45) return "High";
  if (pct >= 20) return "Medium";
  return "Low";
}

export function computeInteractions(conditions: StructuralCondition[]): ConditionInteractionMap {
  if (conditions.length === 0) {
    return { edges: [], primary: null, downstream: null, multiplier: null };
  }
  const byId = new Map(conditions.map((c) => [c.id, c]));
  const totalStrength = conditions.reduce((a, c) => a + c.strength, 0) || 1;

  const edges: ConditionInteractionEdge[] = [];
  for (const c of conditions) {
    const downstreamIds = (CONDITION_UPSTREAM_MAP[c.id] ?? []).filter((d) => byId.has(d));
    if (downstreamIds.length === 0) continue;
    const downstreamStrength = downstreamIds.reduce(
      (a, d) => a + (byId.get(d)?.strength ?? 0),
      0
    );
    const influencePct = Math.round(((c.strength + downstreamStrength) / totalStrength) * 100);
    edges.push({
      from: c.id,
      fromLabel: c.label,
      toIds: downstreamIds,
      toLabels: downstreamIds.map((d) => byId.get(d)!.label),
      influence: influenceFor(influencePct),
      influencePct,
    });
  }
  edges.sort((a, b) => b.influencePct - a.influencePct);

  const top = edges[0] ?? null;
  let primary: PrimaryUpstream | null = null;
  let downstream: DownstreamConsequences | null = null;
  let multiplier: MultiplierEffect | null = null;

  if (top) {
    const src = byId.get(top.from)!;
    primary = {
      id: top.from,
      label: top.fromLabel,
      contributingTo: top.toLabels,
      estimatedInfluence: top.influencePct,
      reason:
        "Multiple architecture conditions are forming through compensation pathways that originate in this condition.",
    };

    // Downstream consequences: aggregate organisational impact across the
    // downstream conditions this primary upstream is currently feeding.
    const seen = new Set<string>();
    const items: string[] = [];
    for (const did of top.toIds) {
      for (const i of byId.get(did)?.organisationalImpact ?? []) {
        if (seen.has(i)) continue;
        seen.add(i);
        items.push(i);
        if (items.length >= 6) break;
      }
      if (items.length >= 6) break;
    }
    downstream = { fromLabel: top.fromLabel, items };

    // Multiplier: use the primary upstream's leverage statement; the
    // reductions span the upstream condition itself plus every downstream
    // condition it currently influences.
    const touchedIds: ConditionId[] = [top.from, ...top.toIds];
    const touchedStrength = touchedIds.reduce((a, id) => a + (byId.get(id)?.strength ?? 0), 0);
    const reductionPct = Math.round((touchedStrength / totalStrength) * 100);
    multiplier = {
      intervention: src.leverage.statement,
      reductions: touchedIds.map((id) => byId.get(id)!.label),
      estimatedReduction: reductionPct,
      reason:
        "Multiple conditions are currently forming through the same upstream architecture pathway, so a single structural change reduces strain across all of them.",
    };
  }

  return { edges, primary, downstream, multiplier };
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

const CONDITION_META: Record<
  ConditionId,
  Pick<StructuralCondition, "label" | "description" | "responseGuidance" | "organisationalImpact">
> = {
  trust_instability: {
    label: "Trust Instability",
    description: "Users are compensating for perceived unreliability — verification, reassurance, rechecking.",
    organisationalImpact: [
      "Increased verification activity",
      "Slower decision making",
      "Escalation dependency",
      "Reduced workflow confidence",
      "Increased management oversight demand",
    ],
    responseGuidance: [
      "Strengthen closure confirmation surfaces",
      "Audit confidence signals returned to operators",
      "Reduce silent state changes",
    ],
  },
  closure_failure: {
    label: "Closure Failure",
    description: "The system isn't creating durable, trustable completion. Loops stay cognitively open.",
    organisationalImpact: [
      "Cognitive load held open past completion",
      "Repeated re-checking of closed work",
      "Inflated case volumes through reopens",
      "Reduced operator throughput",
      "Erosion of confidence in system state",
    ],
    responseGuidance: [
      "Add explicit completion confirmation",
      "Suppress notifications after confirmed close",
      "Make state transitions legible",
    ],
  },
  threshold_ambiguity: {
    label: "Threshold Ambiguity",
    description: "When observation should become intervention is interpreted inconsistently across teams.",
    organisationalImpact: [
      "Inconsistent treatment of comparable cases",
      "Escalation inflation",
      "Reduced predictability of intervention",
      "Audit and assurance exposure",
      "Erosion of severity model credibility",
    ],
    responseGuidance: [
      "Codify intervention thresholds explicitly",
      "Align severity bands across reviewers",
      "Surface threshold criteria in-context",
    ],
  },
  ownership_drift: {
    label: "Ownership Drift",
    description: "Responsibility is being informally redistributed. Handoffs are unclear or duplicated.",
    organisationalImpact: [
      "Delayed decisions",
      "Duplication of effort",
      "Responsibility avoidance",
      "Escalation accumulation",
      "Reduced accountability clarity",
    ],
    responseGuidance: [
      "Make ownership transitions explicit",
      "Surface owner at every interaction surface",
      "Audit duplicated interventions",
    ],
  },
  context_fragmentation: {
    label: "Context Fragmentation",
    description: "Meaning is not surviving handoffs. Humans repeatedly reconstruct case context.",
    organisationalImpact: [
      "Re-explanation overhead at every handoff",
      "Loss of decision rationale across teams",
      "Slower resolution times",
      "Increased risk of inconsistent action",
      "Hidden continuity labour",
    ],
    responseGuidance: [
      "Carry case context across handoffs",
      "Preserve decision rationale on transitions",
      "Reduce re-explanation burden",
    ],
  },
  ai_burden_transfer: {
    label: "AI Burden Transfer",
    description: "AI is silently redistributing verification, interpretation and oversight back to humans.",
    organisationalImpact: [
      "Reduced AI efficiency gains",
      "Increased human verification effort",
      "Lower trust in AI outputs",
      "Hidden operational labour",
      "Reduced return on AI investment",
    ],
    responseGuidance: [
      "Make AI confidence operationally interpretable",
      "Define explicit oversight thresholds",
      "Audit override frequency by surface",
    ],
  },
  interpretive_overload: {
    label: "Interpretive Overload",
    description: "Humans are repeatedly inferring meaning, urgency or next step that the system should contain.",
    organisationalImpact: [
      "Slower first-action timings",
      "Inconsistent prioritisation across operators",
      "Cognitive fatigue concentrated in frontline roles",
      "Increased risk of misjudged urgency",
      "Reduced operational predictability",
    ],
    responseGuidance: [
      "Reduce ambiguous signal surfaces",
      "Translate raw signals into action clarity",
      "Tighten next-step prompts",
    ],
  },
  escalation_instability: {
    label: "Escalation Instability",
    description: "Escalation is reactive, delayed, or inflated — containment architecture is weak.",
    organisationalImpact: [
      "Senior capacity consumed by avoidable escalations",
      "First-line containment confidence erodes",
      "Inconsistent protocol adherence",
      "Audit exposure on escalation decisions",
      "Reduced organisational resilience",
    ],
    responseGuidance: [
      "Define proportionate escalation criteria",
      "Audit recent escalations against protocol",
      "Strengthen first-line containment",
    ],
  },
  workflow_incoherence: {
    label: "Workflow Incoherence",
    description: "Comparable situations are being handled inconsistently. Local workarounds proliferating.",
    organisationalImpact: [
      "Divergent outcomes for comparable cases",
      "Workaround dependence becomes structural",
      "Process design drifts from operational reality",
      "Training and onboarding overhead increases",
      "Reduced workflow auditability",
    ],
    responseGuidance: [
      "Reconcile divergent local workarounds",
      "Stabilise workflow logic across teams",
      "Identify root cause of detours",
    ],
  },
  predictability_failure: {
    label: "Predictability Failure",
    description: "Users cannot reliably form expectations about system behaviour. Trust budget erodes.",
    organisationalImpact: [
      "Hedging behaviours replace decisive action",
      "Trust budget across the system erodes",
      "Increased reliance on informal knowledge",
      "Reduced adoption of system-recommended actions",
      "Hidden cost of monitoring without intervention",
    ],
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

function evidenceMaturityFor(
  familyCount: number,
  mechanismCount: number,
  severity: SignalSeverity,
  signalCount: number
): { maturity: StructuralCondition["evidenceMaturity"]; rationale: string[] } {
  if (familyCount >= 4 && (severity === "critical" || severity === "elevated") && mechanismCount >= 3) {
    return {
      maturity: "Entrenched",
      rationale: [
        "persistent condition formation observed",
        "repeated compensation across multiple mechanisms",
        "architecture pattern strongly evidenced",
        "multi-domain support with strong recurrence",
      ],
    };
  }
  if (familyCount >= 3 && severity !== "low" && mechanismCount >= 2) {
    return {
      maturity: "Established",
      rationale: [
        "signals present across multiple domains",
        "multiple mechanisms support the condition",
        "evidence is recurring rather than isolated",
        "recent signals reinforce the same interpretation",
      ],
    };
  }
  if (familyCount >= 2 && mechanismCount >= 1) {
    return {
      maturity: "Developing",
      rationale: [
        "evidence present but concentrated in limited domains",
        "mechanism alignment present",
        "signal recurrence inconsistent",
        "pattern forming but not yet stable",
      ],
    };
  }
  return {
    maturity: "Emerging",
    rationale: [
      "evidence is sparse",
      "interpretation relies on few signals",
      "mechanism support is limited",
      "pattern may be emerging but not yet established",
    ],
  };
}

// --- Architectural leverage & intervention priority ----------------
// For each condition: the architecture adjustment most likely to reduce
// the largest amount of compensation, an ordered intervention plan, and
// the expected organisational improvement if the leverage is acted on.

interface LeverageDef {
  statement: string;
  targetMechanisms: string[]; // mechanism labels expected to reduce
  reason: string;
  priorities: InterventionPriority[];
  expectedImprovement: string[];
}

const LEVERAGE_LIBRARY: Record<ConditionId, LeverageDef> = {
  trust_instability: {
    statement: "Clarify closure confirmation criteria.",
    targetMechanisms: ["Reassurance Dependency", "Verification Burden", "Closure Uncertainty"],
    reason:
      "Multiple compensation mechanisms trace back to unresolved closure confirmation pathways.",
    priorities: [
      { title: "Strengthen closure confirmation surfaces", impact: "Very High", effort: "Low",
        reason: "Reassurance and verification activity collapse when completion is durably signalled." },
      { title: "Audit confidence signals returned to operators", impact: "High", effort: "Medium",
        reason: "Operator trust forms around legible system feedback, not silent state changes." },
      { title: "Suppress silent state changes", impact: "Moderate", effort: "Medium",
        reason: "Hidden transitions sustain re-checking behaviour even after closure." },
    ],
    expectedImprovement: [
      "reduced verification activity",
      "lower management oversight demand",
      "improved workflow confidence",
      "increased operational predictability",
    ],
  },
  closure_failure: {
    statement: "Make completion durable and legible.",
    targetMechanisms: ["Closure Uncertainty", "Completion Ambiguity"],
    reason:
      "Compensation mechanisms here converge on completion that the system does not durably hold.",
    priorities: [
      { title: "Add explicit completion confirmation", impact: "Very High", effort: "Low",
        reason: "Most post-closure attention reduces when finality is unambiguously signalled." },
      { title: "Suppress notifications after confirmed close", impact: "High", effort: "Low",
        reason: "Residual notifications reopen cognitive loops the system has already closed." },
      { title: "Codify reopen criteria", impact: "Moderate", effort: "Medium",
        reason: "Without criteria, reopens are interpreted as system unreliability." },
    ],
    expectedImprovement: [
      "reduced re-checking of closed work",
      "lower case volume from reopens",
      "improved operator throughput",
      "increased confidence in system state",
    ],
  },
  threshold_ambiguity: {
    statement: "Codify intervention thresholds explicitly.",
    targetMechanisms: ["Threshold Reinterpretation", "Severity Inconsistency", "Recognition Latency"],
    reason: "Compensation forms wherever severity is interpreted locally rather than structurally.",
    priorities: [
      { title: "Codify severity bands across teams", impact: "Very High", effort: "Medium",
        reason: "Reclassification activity collapses when bands are anchored to protocol." },
      { title: "Surface threshold criteria in-context", impact: "High", effort: "Medium",
        reason: "Operators stop inferring intervention boundaries when the system shows them." },
      { title: "Align first-action ownership to severity bands", impact: "Moderate", effort: "Low",
        reason: "Recognition latency shortens when ownership tracks the severity model." },
    ],
    expectedImprovement: [
      "consistent treatment of comparable cases",
      "reduced escalation inflation",
      "increased predictability of intervention",
      "stronger severity model credibility",
    ],
  },
  ownership_drift: {
    statement: "Standardise handoff ownership criteria.",
    targetMechanisms: ["Ownership Ambiguity", "Duplicated Responsibility", "Handoff Gap"],
    reason:
      "Multiple architecture conditions share the same ownership pathway weakness.",
    priorities: [
      { title: "Clarify escalation ownership", impact: "Very High", effort: "Low",
        reason: "Multiple compensation pathways converge on unresolved ownership allocation." },
      { title: "Make ownership transitions explicit on every surface", impact: "High", effort: "Medium",
        reason: "Reduces duplicate intervention and reassurance traffic around responsibility." },
      { title: "Review notification architecture", impact: "Moderate", effort: "High",
        reason: "Improves visibility but does not directly address ownership allocation." },
    ],
    expectedImprovement: [
      "reduced duplicate review activity",
      "faster decision making",
      "reduced escalation dependency",
      "improved accountability clarity",
    ],
  },
  context_fragmentation: {
    statement: "Carry case context across handoffs.",
    targetMechanisms: ["Context Reconstruction", "Context Loss"],
    reason: "Compensation here forms wherever meaning fails to survive a transition.",
    priorities: [
      { title: "Preserve decision rationale on transitions", impact: "Very High", effort: "Medium",
        reason: "Re-explanation effort drops sharply when rationale travels with the case." },
      { title: "Standardise handoff payloads", impact: "High", effort: "Medium",
        reason: "Reduces transition ambiguity that produces continuity strain." },
      { title: "Audit boundary points between systems", impact: "Moderate", effort: "High",
        reason: "Surfaces structural discontinuities producing context loss." },
    ],
    expectedImprovement: [
      "reduced re-explanation overhead",
      "faster resolution times",
      "reduced hidden coordination",
      "improved continuity across teams",
    ],
  },
  ai_burden_transfer: {
    statement: "Make AI confidence operationally interpretable.",
    targetMechanisms: ["Oversight Compensation", "Interpretive Reliance", "Verification Burden"],
    reason: "Hidden oversight load forms wherever AI outputs lack operational meaning at point of use.",
    priorities: [
      { title: "Define explicit oversight thresholds", impact: "Very High", effort: "Medium",
        reason: "Removes the implicit verification load operators currently absorb." },
      { title: "Translate confidence into action guidance", impact: "High", effort: "Medium",
        reason: "Interpretive queries fall when AI output carries operational meaning." },
      { title: "Audit override frequency by surface", impact: "Moderate", effort: "Low",
        reason: "Identifies surfaces silently transferring oversight back to humans." },
    ],
    expectedImprovement: [
      "improved return on AI investment",
      "reduced verification activity",
      "lower management oversight demand",
      "increased trust in AI outputs",
    ],
  },
  interpretive_overload: {
    statement: "Translate raw signals into action clarity.",
    targetMechanisms: ["Meaning Reconstruction", "Urgency Inference"],
    reason: "Compensation forms where the system requires meaning the architecture should contain.",
    priorities: [
      { title: "Tighten next-step prompts at decision points", impact: "Very High", effort: "Medium",
        reason: "Operator-side meaning inference falls when next steps are explicit." },
      { title: "Surface SLA and urgency context at the alert", impact: "High", effort: "Low",
        reason: "Urgency inference collapses when time-criticality is shown directly." },
      { title: "Reduce ambiguous signal surfaces", impact: "Moderate", effort: "High",
        reason: "Removes interpretive load at the source rather than the operator." },
    ],
    expectedImprovement: [
      "faster first-action timing",
      "consistent prioritisation across operators",
      "reduced cognitive fatigue on frontline roles",
      "improved operational predictability",
    ],
  },
  escalation_instability: {
    statement: "Define proportionate escalation criteria.",
    targetMechanisms: ["Escalation Inflation", "Threshold-Driven Escalation"],
    reason: "Escalation defaults upward wherever first-line containment criteria are absent.",
    priorities: [
      { title: "Strengthen first-line containment", impact: "Very High", effort: "Medium",
        reason: "Escalation inflation falls when first-line carry capacity is restored." },
      { title: "Anchor escalation criteria to protocol", impact: "High", effort: "Low",
        reason: "Reduces reclassification-driven escalations." },
      { title: "Add holding state for reclassified cases", impact: "Moderate", effort: "Medium",
        reason: "Prevents automatic escalation when severity is ambiguous." },
    ],
    expectedImprovement: [
      "reduced escalation dependency",
      "lower management oversight demand",
      "improved first-line containment confidence",
      "stronger organisational resilience",
    ],
  },
  workflow_incoherence: {
    statement: "Reconcile divergent workflow paths.",
    targetMechanisms: ["Workaround Proliferation", "Duplicated Workflow"],
    reason: "Local workarounds form wherever workflow logic diverges from operational reality.",
    priorities: [
      { title: "Identify root cause of detours", impact: "Very High", effort: "Medium",
        reason: "Without addressing root causes, workarounds re-emerge after each fix." },
      { title: "Converge comparable cases onto one route", impact: "High", effort: "Medium",
        reason: "Reduces divergent outcomes for comparable situations." },
      { title: "Add a retirement loop for legacy workarounds", impact: "Moderate", effort: "Low",
        reason: "Prevents workaround persistence outliving originating conditions." },
    ],
    expectedImprovement: [
      "convergent outcomes across teams",
      "reduced training and onboarding overhead",
      "improved workflow auditability",
      "reduced hidden coordination",
    ],
  },
  predictability_failure: {
    statement: "Make state changes deterministic and announced.",
    targetMechanisms: ["Behavioural Hedging", "Workaround Persistence"],
    reason: "Hedging behaviour forms wherever system behaviour is non-deterministic from the user perspective.",
    priorities: [
      { title: "Announce state changes ahead of time", impact: "Very High", effort: "Low",
        reason: "Hedging behaviour collapses when behavioural changes are predictable." },
      { title: "Reduce unexplained variance", impact: "High", effort: "Medium",
        reason: "Rebuilds the trust budget across the system." },
      { title: "Increase adoption of system-recommended actions", impact: "Moderate", effort: "Medium",
        reason: "Adoption follows predictability, not the other way around." },
    ],
    expectedImprovement: [
      "improved adoption of system-recommended actions",
      "reduced reliance on informal knowledge",
      "increased operational predictability",
      "reduced hidden coordination",
    ],
  },
};

// --- Plain-language interpretations --------------------------------
// NDPP terminology is intellectually precise but can carry interpretation
// burden for first-time users. The engine preserves NDPP language and
// pairs every condition, mechanism and intervention with a plain-language
// interpretation, so the platform itself embodies Cognitive Diversity Design.

const CONDITION_PLAIN: Record<ConditionId, string> = {
  trust_instability:
    "People are increasingly relying on verification, reassurance and checking because confidence in system signals is weakening.",
  closure_failure:
    "People are unsure whether work has actually been completed, so they keep re-checking closed activity.",
  threshold_ambiguity:
    "The system is not making it clear when people should act, escalate, intervene or seek approval.",
  ownership_drift:
    "People are becoming increasingly unclear about who owns decisions, actions or outcomes.",
  context_fragmentation:
    "Meaning is being lost between teams and systems, so people have to rebuild context every time work moves.",
  ai_burden_transfer:
    "Work expected to be carried by the AI-supported system is being redistributed back to humans through verification, interpretation and oversight activity.",
  interpretive_overload:
    "People are repeatedly working out what a signal means, how urgent it is and what to do next, instead of the system telling them.",
  escalation_instability:
    "Escalation is happening too early, too late or inconsistently, because first-line containment is not holding.",
  workflow_incoherence:
    "Comparable situations are being handled in different ways, and local workarounds are quietly becoming the real process.",
  predictability_failure:
    "People cannot reliably predict how the system will behave, so they hedge, double-check and rely on informal knowledge.",
};

const MECHANISM_PLAIN: Record<string, string> = {
  "Verification Burden":
    "People are carrying increasing effort to confirm that actions, information or decisions can be trusted.",
  "Reassurance Dependency":
    "People require repeated confirmation before feeling confident enough to proceed.",
  "Closure Uncertainty":
    "People are unsure whether activities have been completed successfully or whether further action is required.",
  "Completion Ambiguity":
    "People cannot tell from the system whether work is truly finished, so they keep it cognitively open.",
  "Oversight Compensation":
    "People are absorbing supervision and checking work that the system was expected to hold.",
  "Threshold Reinterpretation":
    "People are re-deciding locally what counts as serious enough to act on, because the system does not say clearly.",
  "Severity Inconsistency":
    "Comparable situations are being classified differently by different people, weakening the severity model.",
  "Recognition Latency":
    "People are noticing that something needs action later than they should, because the system does not flag it clearly.",
  "Duplicated Responsibility":
    "Multiple people are carrying responsibility for the same activity because ownership is unclear.",
  "Ownership Ambiguity":
    "People are unsure who owns the next decision or action, so responsibility informally spreads.",
  "Handoff Gap":
    "Work is quietly falling into the space between people or teams during transitions.",
  "Context Reconstruction":
    "People are rebuilding case background at every handoff because context does not travel with the work.",
  "Context Loss":
    "Meaning and rationale are being lost when work moves between teams or systems.",
  "Interpretive Reliance":
    "People are having to work out what AI outputs mean before they can act on them.",
  "Meaning Reconstruction":
    "People are inferring what a signal actually means, instead of the system saying it directly.",
  "Urgency Inference":
    "People are working out how urgent something is, because time-criticality is not shown at the alert.",
  "Escalation Inflation":
    "Cases are being escalated further up than they should be, because first-line containment is not holding.",
  "Threshold-Driven Escalation":
    "People are escalating simply because they are unsure whether a case meets the threshold themselves.",
  "Workaround Proliferation":
    "Local workarounds are spreading because the standard workflow does not fit operational reality.",
  "Duplicated Workflow":
    "The same work is being done twice, in parallel, because the workflow does not converge cleanly.",
  "Behavioural Hedging":
    "People are acting cautiously and adding safety margins because they cannot predict how the system will behave.",
  "Workaround Persistence":
    "Old workarounds are outlasting the conditions that produced them, and are quietly becoming the real process.",
  "Residual Compensation":
    "People are absorbing effort the system did not clearly account for.",
};

const INTERVENTION_PLAIN: Record<string, string> = {
  // trust_instability
  "Clarify closure confirmation criteria.":
    "Make it explicit when a piece of work is genuinely complete, so people can stop re-checking.",
  "Strengthen closure confirmation surfaces":
    "Show clearly, in the system, that work is closed and does not need further attention.",
  "Audit confidence signals returned to operators":
    "Check that the signals the system shows people actually help them trust the state of the work.",
  "Suppress silent state changes":
    "Stop the system from changing state in the background without telling the people who rely on it.",

  // closure_failure
  "Make completion durable and legible.":
    "Make it obvious and lasting that work has been finished, so people are not left uncertain.",
  "Add explicit completion confirmation":
    "Confirm to the person that the case is closed, rather than leaving them to infer it.",
  "Suppress notifications after confirmed close":
    "Stop sending alerts about work that has already been closed.",
  "Codify reopen criteria":
    "Define clearly when a closed case can be reopened, so reopens don't look like system unreliability.",

  // threshold_ambiguity
  "Codify intervention thresholds explicitly.":
    "Set out clearly what levels of severity should trigger action, escalation or intervention.",
  "Codify severity bands across teams":
    "Agree the same severity definitions across teams, so comparable cases are treated the same way.",
  "Surface threshold criteria in-context":
    "Show the threshold rules at the point people are making the decision, not in a separate document.",
  "Align first-action ownership to severity bands":
    "Match who owns the first action to how serious the case is, so response is proportionate.",

  // ownership_drift
  "Standardise handoff ownership criteria.":
    "Define clearly who owns the work at each stage and when ownership transfers.",
  "Clarify escalation ownership":
    "Make it explicit who should act, who should decide and when escalation should occur.",
  "Make ownership transitions explicit on every surface":
    "Show who currently owns the work in every place people interact with it.",
  "Review notification architecture":
    "Check who is being notified about what, so ownership isn't spread by default.",

  // context_fragmentation
  "Carry case context across handoffs.":
    "Make sure background, reasoning and history travel with the work when it moves between people or teams.",
  "Preserve decision rationale on transitions":
    "Keep the reasoning behind decisions attached to the case, not just the outcome.",
  "Standardise handoff payloads":
    "Define a consistent set of information that must move with the work at every handoff.",
  "Audit boundary points between systems":
    "Look at the points where information moves between systems and check what is being lost there.",

  // ai_burden_transfer
  "Make AI confidence operationally interpretable.":
    "Translate AI confidence numbers into clear guidance people can actually act on.",
  "Define explicit oversight thresholds":
    "Set out clearly when a human needs to check or override the AI, and when they do not.",
  "Translate confidence into action guidance":
    "Turn AI confidence into a recommended action, not a number the operator has to interpret.",
  "Audit override frequency by surface":
    "Look at where people are overriding the AI most often — those are the surfaces silently transferring work back to humans.",

  // interpretive_overload
  "Translate raw signals into action clarity.":
    "Turn raw alerts and data into a clear next step, so people don't have to work out what to do.",
  "Tighten next-step prompts at decision points":
    "Show a clear next action at the moment a decision has to be made.",
  "Surface SLA and urgency context at the alert":
    "Show how urgent something is at the point of the alert, not in a separate view.",
  "Reduce ambiguous signal surfaces":
    "Remove or clarify the alerts and screens where people have to guess what a signal means.",

  // escalation_instability
  "Define proportionate escalation criteria.":
    "Set out clearly what should escalate, what should not, and at what level.",
  "Strengthen first-line containment":
    "Give first-line teams the clarity and support they need to hold cases without escalating.",
  "Anchor escalation criteria to protocol":
    "Tie escalation decisions to explicit protocol, so they don't drift with individual judgement.",
  "Add holding state for reclassified cases":
    "Create an intermediate state so cases with unclear severity don't automatically escalate.",

  // workflow_incoherence
  "Reconcile divergent workflow paths.":
    "Bring divergent ways of handling comparable work back into one coherent process.",
  "Identify root cause of detours":
    "Find out why people are working around the standard process, before trying to remove the workaround.",
  "Converge comparable cases onto one route":
    "Make sure similar cases follow the same path through the system.",
  "Add a retirement loop for legacy workarounds":
    "Regularly review and retire old workarounds so they don't quietly become permanent.",

  // predictability_failure
  "Make state changes deterministic and announced.":
    "Make the system's behaviour predictable, and tell people ahead of time when it will change.",
  "Announce state changes ahead of time":
    "Let people know before the system's behaviour changes, not after they've noticed.",
  "Reduce unexplained variance":
    "Cut down on situations where the system behaves differently for reasons people cannot see.",
  "Increase adoption of system-recommended actions":
    "Build the trust that lets people follow the system's recommendation rather than hedge around it.",
};

function plainForMechanism(label: string): string | undefined {
  return MECHANISM_PLAIN[label];
}

function plainForIntervention(title: string): string | undefined {
  return INTERVENTION_PLAIN[title];
}

// --- Human display labels ------------------------------------------
// Framework-native terms remain the engine's internal keys (for causes,
// evidence, driver reasons, leverage targeting). Display labels are the
// executive-facing rewrites: short, natural sentences a first-time reader
// can understand without any NDPP background.

const CONDITION_HUMAN_LABEL: Record<ConditionId, string> = {
  trust_instability: "People are losing confidence in the system",
  closure_failure: "People aren't sure when work is actually finished",
  threshold_ambiguity: "People aren't sure when they should act",
  ownership_drift: "People are becoming unclear about who owns what",
  context_fragmentation: "Meaning is being lost between teams",
  ai_burden_transfer: "The AI is creating extra work instead of removing it",
  interpretive_overload: "People keep having to work out what things mean",
  escalation_instability: "Escalation is drifting off protocol",
  workflow_incoherence: "Comparable work is being handled inconsistently",
  predictability_failure: "People can't predict how the system will behave",
};

const MECHANISM_HUMAN_LABEL: Record<string, string> = {
  "Verification Burden": "People keep having to double-check things",
  "Reassurance Dependency": "People need repeated confirmation before acting",
  "Closure Uncertainty": "People aren't sure work is truly finished",
  "Completion Ambiguity": "Finished work still feels open",
  "Oversight Compensation": "People are supervising work the system should hold",
  "Interpretive Reliance": "People are decoding AI output before they can act",
  "Threshold Reinterpretation": "People are re-deciding what counts as serious",
  "Severity Inconsistency": "Similar cases are being treated differently",
  "Recognition Latency": "People are noticing things need action too late",
  "Duplicated Responsibility": "More than one person carrying the same responsibility",
  "Ownership Ambiguity": "People aren't sure who owns this",
  "Handoff Gap": "Work is falling between people at handoffs",
  "Context Reconstruction": "People rebuild the background at every handoff",
  "Context Loss": "Meaning is being lost between teams and systems",
  "Meaning Reconstruction": "People are inferring what signals actually mean",
  "Urgency Inference": "People are guessing how urgent things are",
  "Escalation Inflation": "Cases are escalating higher than they should",
  "Threshold-Driven Escalation": "People are escalating because severity is unclear",
  "Workaround Proliferation": "Local workarounds are spreading",
  "Duplicated Workflow": "The same work is being done twice in parallel",
  "Behavioural Hedging": "People are acting cautiously to be safe",
  "Workaround Persistence": "Old workarounds are quietly becoming permanent",
  "Residual Compensation": "Extra effort the system didn't plan for",
};

function humanMechanism(label: string): string {
  return MECHANISM_HUMAN_LABEL[label] ?? label;
}

function humanIntervention(title: string): string {
  return INTERVENTION_PLAIN[title] ?? title;
}

function leverageFor(
  cid: ConditionId,
  mechanisms: ConditionMechanism[],
  strengthPct: number
): { leverage: ArchitecturalLeverage; priorities: InterventionPriority[]; expectedImprovement: string[] } {
  const def = LEVERAGE_LIBRARY[cid];
  // Estimated influence: share of current condition formation carried by the
  // mechanisms that the leverage point is expected to reduce. Falls back to
  // top-mechanism share if no target mechanisms are currently active.
  let addressed = 0;
  for (const m of mechanisms) {
    if (def.targetMechanisms.includes(m.label)) addressed += m.points;
  }
  if (addressed === 0 && mechanisms.length) addressed = mechanisms[0].points;
  const influence = strengthPct > 0 ? Math.round((addressed / strengthPct) * 100) : 0;

  return {
    leverage: {
      statement: def.statement,
      displayStatement: humanIntervention(def.statement),
      plain: plainForIntervention(def.statement),
      expectedEffect: def.targetMechanisms,
      expectedEffectDisplay: def.targetMechanisms.map(humanMechanism),
      reason: def.reason,
      estimatedInfluence: Math.min(100, Math.max(0, influence)),
    },
    priorities: def.priorities.map((p) => ({
      ...p,
      displayTitle: humanIntervention(p.title),
      plain: plainForIntervention(p.title),
    })),
    expectedImprovement: def.expectedImprovement,
  };
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
        displayLabel: humanMechanism(label),
        plain: plainForMechanism(label),
        points: v.points,
        signalNames: Array.from(v.signals),
        evidence: evidenceFor(label, v.signals.size),
      }))
      .sort((a, b) => b.points - a.points);

    const sev = severityFor(strength);
    const { maturity, rationale } = evidenceMaturityFor(
      acc.families.size,
      mechanisms.length,
      sev,
      acc.signalIds.length
    );

    results.push({
      id: cid as ConditionId,
      label: meta.label,
      displayLabel: CONDITION_HUMAN_LABEL[cid as ConditionId] ?? meta.label,
      description: meta.description,
      plain: CONDITION_PLAIN[cid as ConditionId],
      strength,
      severity: sev,
      evidenceMaturity: maturity,
      evidenceRationale: rationale,
      contributingFamilies: Array.from(acc.families),
      contributingSignalIds: acc.signalIds.slice(-6),
      mechanisms,
      breakdown,
      architecturalCauses: architecturalCausesFor(mechanisms.map((m) => m.label)),
      organisationalImpact: meta.organisationalImpact,
      responseGuidance: meta.responseGuidance,
      ...((): Pick<StructuralCondition, "leverage" | "interventionPriorities" | "expectedImprovement"> => {
        const lf = leverageFor(cid as ConditionId, mechanisms, strength * 100);
        return {
          leverage: lf.leverage,
          interventionPriorities: lf.priorities,
          expectedImprovement: lf.expectedImprovement,
        };
      })(),
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

// --- Trajectory ----------------------------------------------------
// NDPP is interested in *condition formation through time*. Trajectory
// reads a short history of strength samples for a given condition and
// describes whether the pattern is forming, escalating, entrenching,
// stabilising, recovering or resolved.

const TRAJECTORY_WINDOW_MS = 60_000; // observation window
const TRAJECTORY_MIN_SAMPLES = 3;

export function computeTrajectory(
  history: ConditionStrengthSample[],
  currentStrength: number,
  now = Date.now()
): ConditionTrajectory {
  const recent = history.filter((s) => now - s.ts <= TRAJECTORY_WINDOW_MS);
  const samples = recent.length ? recent : history.slice(-TRAJECTORY_MIN_SAMPLES);

  if (samples.length < TRAJECTORY_MIN_SAMPLES) {
    return {
      state: "Emerging",
      description: "Signals and mechanisms are beginning to align.",
      rationale: [
        "observation window too short for stable trajectory",
        "pattern forming but not yet confirmed across windows",
      ],
    };
  }

  const first = samples[0].strength;
  const last = samples[samples.length - 1].strength;
  const mid = samples[Math.floor(samples.length / 2)].strength;
  const fullDelta = last - first;
  const earlyDelta = mid - first;
  const lateDelta = last - mid;

  // Resolved — condition has dropped below formation threshold and
  // is no longer materially present.
  if (currentStrength < 0.15 && first >= 0.3) {
    return {
      state: "Resolved",
      description: "Condition no longer exceeds formation thresholds.",
      rationale: [
        "severity has dropped below the formation threshold",
        "supporting mechanisms no longer reinforcing the pattern",
        "previous severity was materially higher in the observation window",
      ],
    };
  }

  // Recovering — clear sustained decrease.
  if (fullDelta < -0.08 && lateDelta <= -0.02) {
    return {
      state: "Recovering",
      description: "Condition severity and supporting mechanisms are decreasing.",
      rationale: [
        "severity decreasing across the observation window",
        "supporting mechanism strength reducing",
        "trajectory direction negative",
      ],
    };
  }

  // Escalating — sustained increase.
  if (fullDelta > 0.08) {
    return {
      state: "Escalating",
      description: "Condition severity and supporting evidence are increasing.",
      rationale: [
        "severity rising across the observation window",
        "supporting mechanisms gaining weight",
        "trajectory direction positive",
      ],
    };
  }

  // Stabilising — was rising, now flat at elevated level.
  if (currentStrength >= 0.55 && earlyDelta > 0.05 && Math.abs(lateDelta) < 0.03) {
    return {
      state: "Stabilising",
      description: "Severity remains elevated but growth has slowed.",
      rationale: [
        "severity remains elevated",
        "earlier rise has plateaued",
        "recent samples show limited movement",
      ],
    };
  }

  // Entrenching — high, stable, persistent.
  if (currentStrength >= 0.55 && Math.abs(fullDelta) < 0.05 && samples.length >= 5) {
    return {
      state: "Entrenching",
      description:
        "Condition has remained stable at elevated severity across multiple observation windows.",
      rationale: [
        "severity persistently elevated",
        "low variance across the observation window",
        "compensation pattern repeating across windows",
      ],
    };
  }

  // Default — pattern still forming.
  return {
    state: "Emerging",
    description: "Signals and mechanisms are beginning to align.",
    rationale: [
      "supporting evidence present but not yet trending",
      "pattern observed but trajectory not yet stable",
    ],
  };
}


// --- Condition drivers --------------------------------------------
// Conditions don't worsen independently — mechanisms drive them. Drivers
// identify which compensation mechanisms are currently increasing or
// reducing condition formation, by comparing each mechanism's current
// contribution against its level earlier in the observation window.

const DRIVER_WINDOW_MS = 60_000;

const MECHANISM_REASON_UP: Record<string, string> = {
  "Verification Burden": "Verification loops increasing across recent observation windows.",
  "Reassurance Dependency": "Reassurance-seeking signals recurring across communication channels.",
  "Closure Uncertainty": "Reopen and post-closure attention patterns intensifying.",
  "Completion Ambiguity": "Users continuing to act on completed work, weight rising.",
  "Oversight Compensation": "Operator override frequency rising against the automated layer.",
  "Interpretive Reliance": "Requests for AI meaning interpretation gaining frequency.",
  "Threshold Reinterpretation": "Severity reclassification activity rising within short windows.",
  "Severity Inconsistency": "Cross-team severity divergence becoming more frequent.",
  "Recognition Latency": "First-action delay widening relative to threshold.",
  "Duplicated Responsibility": "Parallel interventions on the same alert increasing.",
  "Ownership Ambiguity": "Explicit ownership queries increasing across surfaces.",
  "Handoff Gap": "Delays at transition points lengthening.",
  "Context Reconstruction": "Re-explanation requests rising across handoffs.",
  "Meaning Reconstruction": "Operator-side meaning inference load increasing.",
  "Urgency Inference": "Operators continuing to infer urgency from indirect cues.",
  "Escalation Inflation": "Escalations exceeding protocol tier more frequently.",
  "Threshold-Driven Escalation": "Reclassification-triggered escalations becoming more common.",
  "Workaround Proliferation": "New local workarounds being documented at higher rate.",
  "Duplicated Workflow": "Divergent routing of comparable cases increasing.",
  "Context Loss": "Continuity discontinuities at handoff increasing.",
  "Behavioural Hedging": "Monitoring-without-action behaviour persisting and widening.",
  "Workaround Persistence": "Legacy workarounds continuing to outlive originating conditions.",
  "Residual Compensation": "Unmodelled compensation pattern weight increasing.",
};

const MECHANISM_REASON_DOWN: Record<string, string> = {
  "Verification Burden": "Verification activity easing across recent windows.",
  "Reassurance Dependency": "Reassurance-seeking signals reducing in frequency.",
  "Closure Uncertainty": "Reopen and post-closure attention reducing.",
  "Completion Ambiguity": "Users increasingly treating completion as final.",
  "Oversight Compensation": "Override frequency reducing as alignment improves.",
  "Interpretive Reliance": "Confidence interpretation queries reducing.",
  "Threshold Reinterpretation": "Reclassification activity slowing.",
  "Severity Inconsistency": "Severity bands stabilising across teams.",
  "Recognition Latency": "First-action timing improving relative to threshold.",
  "Duplicated Responsibility": "Parallel interventions reducing.",
  "Ownership Ambiguity": "Ownership clarification activity has increased, reducing ambiguity.",
  "Handoff Gap": "Transition delays narrowing.",
  "Context Reconstruction": "Re-explanation requests reducing across handoffs.",
  "Meaning Reconstruction": "System now containing meaning the operator previously inferred.",
  "Urgency Inference": "Urgency now better represented in signal surface.",
  "Escalation Inflation": "Escalations now closer to protocol tier.",
  "Threshold-Driven Escalation": "Reclassification-triggered escalations reducing.",
  "Workaround Proliferation": "Rate of new workaround documentation slowing.",
  "Duplicated Workflow": "Routing of comparable cases converging.",
  "Context Loss": "Continuity holding better across handoffs.",
  "Behavioural Hedging": "Monitoring-without-action behaviour reducing.",
  "Workaround Persistence": "Legacy workarounds being retired.",
  "Residual Compensation": "Unmodelled compensation pattern weight reducing.",
};

function contributionFor(delta: number): DriverContribution {
  const abs = Math.abs(delta);
  if (abs >= 8) return "High";
  if (abs >= 3) return "Medium";
  return "Low";
}

export function computeDrivers(
  history: MechanismStrengthSample[],
  currentMechanisms: ConditionMechanism[],
  now = Date.now()
): ConditionDrivers {
  const recent = history.filter((s) => now - s.ts <= DRIVER_WINDOW_MS);
  const samples = recent.length >= 2 ? recent : history.slice(-2);
  const drivers: ConditionDriver[] = [];
  const stabilisers: ConditionDriver[] = [];
  if (samples.length < 2) return { drivers, stabilisers };

  const baseline = samples[0].points;
  const labels = new Set<string>([
    ...Object.keys(baseline),
    ...currentMechanisms.map((m) => m.label),
  ]);

  const ranked: { label: string; delta: number }[] = [];
  for (const label of labels) {
    const current = currentMechanisms.find((m) => m.label === label)?.points ?? 0;
    const prior = baseline[label] ?? 0;
    const delta = current - prior;
    if (Math.abs(delta) < 1.5) continue; // ignore noise
    ranked.push({ label, delta });
  }

  ranked.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  for (const r of ranked.slice(0, 4)) {
    const direction = r.delta > 0 ? "up" : "down";
    const reasonMap = direction === "up" ? MECHANISM_REASON_UP : MECHANISM_REASON_DOWN;
    const entry: ConditionDriver = {
      label: r.label,
      direction,
      contribution: contributionFor(r.delta),
      reason: reasonMap[r.label] ?? "Mechanism weight shifting within the observation window.",
    };
    if (direction === "up") drivers.push(entry);
    else stabilisers.push(entry);
  }

  return { drivers, stabilisers };
}
