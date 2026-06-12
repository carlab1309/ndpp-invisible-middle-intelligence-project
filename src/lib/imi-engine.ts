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
  points: number; // signed percentage-point contribution to strength
}

export interface StructuralCondition {
  id: ConditionId;
  label: string;
  description: string;
  strength: number; // 0..1 — indication strength, not statistical confidence
  severity: SignalSeverity;
  evidenceStrength: "High" | "Medium" | "Low";
  contributingFamilies: SignalFamily[];
  contributingSignalIds: string[];
  breakdown: ConditionContribution[];
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

export function interpret(signals: Signal[], now = Date.now()): StructuralCondition[] {
  const conditionAcc: Record<
    string,
    { raw: number; families: Set<SignalFamily>; signalIds: string[] }
  > = {};

  for (const sig of signals) {
    const def = SIGNAL_CATALOGUE.find((d) => d.name === sig.name);
    if (!def) continue;
    const w = timeWeight(sig.ts, now);
    for (const [cid, contribution] of Object.entries(def.contributions) as [
      ConditionId,
      number,
    ][]) {
      const acc = (conditionAcc[cid] ??= { raw: 0, families: new Set(), signalIds: [] });
      acc.raw += contribution * w;
      acc.families.add(sig.family);
      acc.signalIds.push(sig.id);
    }
  }

  const results: StructuralCondition[] = [];
  for (const [cid, acc] of Object.entries(conditionAcc)) {
    // Diminishing returns curve
    const strength = 1 - Math.exp(-acc.raw * 0.9);
    if (strength < 0.12) continue;
    const meta = CONDITION_META[cid as ConditionId];
    results.push({
      id: cid as ConditionId,
      label: meta.label,
      description: meta.description,
      strength,
      severity: severityFor(strength),
      contributingFamilies: Array.from(acc.families),
      contributingSignalIds: acc.signalIds.slice(-6),
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
